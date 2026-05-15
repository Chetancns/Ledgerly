import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Between, Repository } from 'typeorm';
import OpenAI from 'openai';
import dayjs from 'dayjs';
import { TransactionsService } from '../transactions/transaction.service';
import { Transaction, TxType } from '../transactions/transaction.entity';
import { Account } from 'src/accounts/account.entity';
import { Category } from 'src/categories/category.entity';
import { Budget } from 'src/budgets/budget.entity';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
type UploadedAudioFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};

export type AiSourceType = 'text' | 'image' | 'audio';

export interface ParsedTransactionDraft {
  accountId?: string;
  categoryId?: string;
  transactionDate: string;
  amount: string;
  type: TxType;
  description?: string;
  confidence: number;
  needsReview: boolean;
  reviewReason?: string;
}

export interface ParseTransactionsResult {
  success: boolean;
  recoverable: boolean;
  message?: string;
  transactions: ParsedTransactionDraft[];
  savedTransactions?: Transaction[];
  rawResponse?: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private config: ConfigService,
    private transactionService: TransactionsService,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Account) private accRepo: Repository<Account>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') });
  }

  private async getUserContext(userId: string) {
    const [categories, accounts] = await Promise.all([
      this.catRepo.find({ where: { userId, IsDeleted: false } }),
      this.accRepo.find({ where: { userId, IsDeleted: false } }),
    ]);

    return { categories, accounts };
  }

  private clampConfidence(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0.5;
    if (parsed < 0) return 0;
    if (parsed > 1) return 1;
    return Number(parsed.toFixed(2));
  }

  private buildSystemPrompt(
    sourceType: AiSourceType,
    accounts: Account[],
    categories: Category[],
    strictJson = false,
  ) {
    const today = dayjs();
    const contextNote =
      sourceType === 'image'
        ? 'This input is a receipt image. Read text and inferred fields directly from the image.'
        : sourceType === 'audio'
          ? 'This text was transcribed from user voice input and may contain speech artifacts.'
          : 'This text was directly entered by the user.';

    return `
You are a financial transaction parser AI.
${contextNote}

Return ONLY valid JSON (no markdown, no prose).${strictJson ? ' STRICT JSON ONLY.' : ''}

Output must be an array of transaction objects:
[
  {
    "accountId": "one account id from: ${accounts.map((a) => `${a.id} (${a.name})`).join(', ')}",
    "categoryId": "one category id from: ${categories.map((c) => `${c.id} (${c.name})`).join(', ')}",
    "transactionDate": "YYYY-MM-DD",
    "amount": number,
    "type": "expense" | "income" | "savings" | "transfer",
    "description": "short description",
    "confidence": number from 0 to 1,
    "reviewReason": "optional short reason if uncertain"
  }
]

Rules:
- If date is missing use ${today.format('YYYY-MM-DD')}.
- If amount sign is negative, output absolute value.
- If unsure about any field, still provide best guess and lower confidence.
- Set confidence < 0.7 when uncertain.
`;
  }

  private extractLikelyJson(raw: string) {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const starts = [firstBrace, firstBracket].filter((i) => i >= 0);
    if (starts.length === 0) return cleaned;
    const start = Math.min(...starts);

    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    if (end > start) {
      return cleaned.slice(start, end + 1);
    }

    return cleaned.slice(start);
  }

  private normalizeDraft(
    draft: Record<string, unknown>,
    accountIds: Set<string>,
    categoryIds: Set<string>,
  ): ParsedTransactionDraft {
    const today = dayjs().format('YYYY-MM-DD');
    const parsedType = (typeof draft.type === 'string' ? draft.type : 'expense') as TxType;
    const safeType: TxType = ['expense', 'income', 'savings', 'transfer'].includes(parsedType)
      ? parsedType
      : 'expense';

    const rawAmount = Number(draft.amount);
    const amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : NaN;
    const confidence = this.clampConfidence(draft.confidence);

    const accountId = typeof draft.accountId === 'string' ? draft.accountId : undefined;
    const categoryId = typeof draft.categoryId === 'string' ? draft.categoryId : undefined;
    const transactionDate =
      typeof draft.transactionDate === 'string' && dayjs(draft.transactionDate).isValid()
        ? dayjs(draft.transactionDate).format('YYYY-MM-DD')
        : today;

    const reasons: string[] = [];
    if (!Number.isFinite(amount) || amount <= 0) reasons.push('Invalid amount');
    if (!accountId || !accountIds.has(accountId)) reasons.push('Account uncertain');
    if (!categoryId || !categoryIds.has(categoryId)) reasons.push('Category uncertain');
    if (confidence < 0.7) reasons.push('Low AI confidence');
    if (!['expense', 'income', 'savings', 'transfer'].includes(parsedType)) reasons.push('Type inferred');

    const reviewReason =
      (typeof draft.reviewReason === 'string' && draft.reviewReason.trim()) || reasons.join('; ');

    return {
      accountId,
      categoryId,
      transactionDate,
      amount: Number.isFinite(amount) ? amount.toFixed(2) : '0.00',
      type: safeType,
      description: typeof draft.description === 'string' ? draft.description.trim() : undefined,
      confidence,
      needsReview: reasons.length > 0,
      reviewReason,
    };
  }

  private async requestParsedContent(
    systemPrompt: string,
    userContent: string,
    sourceType: AiSourceType,
    imageBuffer?: Buffer,
  ) {
    if (sourceType === 'image' && imageBuffer) {
      const mimeType = 'image/jpeg';
      const base64 = imageBuffer.toString('base64');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userContent },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      });

      return response.choices[0]?.message?.content ?? '';
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }

  private async parseToDrafts(
    userId: string,
    input: string,
    sourceType: AiSourceType,
    imageBuffer?: Buffer,
  ) {
    const { categories, accounts } = await this.getUserContext(userId);
    const accountIds = new Set(accounts.map((a) => a.id));
    const categoryIds = new Set(categories.map((c) => c.id));

    let lastRaw = '';

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const strict = attempt === 1;
        const systemPrompt = this.buildSystemPrompt(sourceType, accounts, categories, strict);
        lastRaw = await this.requestParsedContent(systemPrompt, input, sourceType, imageBuffer);
        const normalizedRaw = this.extractLikelyJson(lastRaw);
        const parsed = JSON.parse(normalizedRaw) as unknown;
        const txs = (Array.isArray(parsed) ? parsed : [parsed])
          .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
          .map((row) => this.normalizeDraft(row, accountIds, categoryIds));

        if (txs.length > 0) {
          return { transactions: txs, rawResponse: lastRaw };
        }
      } catch {
        // retry once with strict prompt
      }
    }

    return { transactions: [], rawResponse: lastRaw };
  }

  async saveParsedTransactions(userId: string, drafts: ParsedTransactionDraft[]) {
    const saved: Transaction[] = [];
    const skipped: ParsedTransactionDraft[] = [];

    for (const draft of drafts) {
      const amount = Number(draft.amount);
      const validAmount = Number.isFinite(amount) && amount > 0;
      const hasRequiredRefs = !!draft.accountId && !!draft.categoryId;

      if (draft.needsReview || !validAmount || !hasRequiredRefs) {
        skipped.push(draft);
        continue;
      }

      const tx = await this.transactionService.create({
        userId,
        accountId: draft.accountId,
        categoryId: draft.categoryId,
        amount: amount.toFixed(2),
        type: draft.type,
        transactionDate: draft.transactionDate,
        description: draft.description,
      });
      saved.push(tx);
    }

    return {
      saved,
      skipped,
      message:
        skipped.length > 0
          ? `${saved.length} transaction(s) saved, ${skipped.length} skipped because review is required.`
          : `${saved.length} transaction(s) saved.`,
    };
  }

  async parseTransactions(
    userId: string,
    input: string,
    sourceType: AiSourceType = 'text',
    options?: { save?: boolean },
    imageBuffer?: Buffer,
  ): Promise<ParseTransactionsResult> {
    const { transactions, rawResponse } = await this.parseToDrafts(userId, input, sourceType, imageBuffer);

    if (transactions.length === 0) {
      return {
        success: false,
        recoverable: true,
        message:
          'Could not confidently parse your input. Please review manually and try rephrasing for better results.',
        transactions: [],
        rawResponse,
      };
    }

    if (!options?.save) {
      return {
        success: true,
        recoverable: true,
        transactions,
        rawResponse,
      };
    }

    const { saved, message } = await this.saveParsedTransactions(userId, transactions);
    return {
      success: true,
      recoverable: true,
      transactions,
      savedTransactions: saved,
      message,
      rawResponse,
    };
  }

  async parseReceiptImage(userId: string, imageBuffer: Buffer, options?: { save?: boolean }) {
    return this.parseTransactions(
      userId,
      'Parse this receipt image and extract one or more transactions.',
      'image',
      { save: options?.save },
      imageBuffer,
    );
  }

  async parseAudio(userId: string, file: UploadedAudioFile, options?: { save?: boolean }) {
    const tmpDir = os.tmpdir();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
    const tmpPath = path.join(tmpDir, safeName);
    await fs.promises.writeFile(tmpPath, file.buffer);

    try {
      const readStream = fs.createReadStream(tmpPath);
      const transcription = await this.openai.audio.transcriptions.create({
        file: readStream,
        model: 'whisper-1',
      });

      const text = transcription.text?.trim();
      if (!text) throw new NotFoundException('No speech recognized in audio');

      return this.parseTransactions(userId, text, 'audio', { save: options?.save });
    } finally {
      fs.unlink(tmpPath, () => {});
    }
  }

  async askFinancialQuestion(userId: string, question: string) {
    const to = dayjs().format('YYYY-MM-DD');
    const from = dayjs().subtract(90, 'day').format('YYYY-MM-DD');

    const [recentTransactions, budgets] = await Promise.all([
      this.txRepo.find({
        where: { userId, transactionDate: Between(from, to) },
        relations: ['category'],
        order: { transactionDate: 'DESC' },
        take: 120,
      }),
      this.budgetRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 30,
      }),
    ]);

    const txContext = recentTransactions
      .slice(0, 80)
      .map(
        (tx) =>
          `${tx.transactionDate} | ${tx.type} | ${tx.amount} | ${tx.category?.name ?? 'Unknown'} | ${tx.description ?? ''}`,
      )
      .join('\n');

    const budgetContext = budgets
      .map((b) => `${b.period} | categoryId=${b.categoryId} | amount=${b.amount} | ${b.startDate}..${b.endDate}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are Ledgerly financial assistant. Answer only using provided user data. If data is insufficient, say so briefly and suggest what to track.',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nTransactions:\n${txContext || 'No transactions'}\n\nBudgets:\n${budgetContext || 'No budgets'}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return {
      question,
      answer: response.choices[0]?.message?.content?.trim() || 'I could not generate an answer right now.',
    };
  }
}
