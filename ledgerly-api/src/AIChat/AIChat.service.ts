import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConditionalModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import dayjs from 'dayjs';
import { TransactionsService } from '../transactions/transaction.service';
import { Transaction } from '../transactions/transaction.entity';
import { Account } from 'src/accounts/account.entity';
import { Category } from 'src/categories/category.entity';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { File as MulterFile } from 'multer';
@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private config: ConfigService,
    private transactionService: TransactionsService,
    @InjectRepository(Account) private accRepo: Repository<Account>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') });
  }

  /** ============ 1️⃣ SHARED PROMPT BUILDER ============ */
  private async buildSystemPrompt(userId: string, sourceType: 'text' | 'image' | 'audio') {
    const today = dayjs();
    const categories = await this.catRepo.find({ where: { userId,IsDeleted:false } });
    const accounts = await this.accRepo.find({ where: { userId,IsDeleted:false } });

    const contextNote =
      sourceType === 'image'
        ? 'This text was extracted from a receipt image using OCR, so it might contain distorted characters or layout noise.'
        : sourceType === 'audio'
        ? 'This text was transcribed from user voice input using Whisper, so it may have speech artifacts or missing punctuation.'
        : 'This text was directly entered by the user.';
    return `
You are a financial transaction parser AI.
${contextNote}
The user may input:
- A natural language sentence (e.g. "You made a debit card transaction of $17.75 with PP*DOORDASH MCDONALD")
- Or raw bank statement or OCR text with multiple lines.
Your task:
Return structured JSON transactions.
Each transaction must include:
{
  "accountId": string (choose from: ${accounts.map(a => `${a.id} (${a.name} - type ${a.type})`).join(', ')}),
  "categoryId": string (choose from: ${categories.map(c => `${c.id} (${c.name})`).join(', ')}),
  "transactionDate": "YYYY-MM-DD" (If text says "today" use ${today.format('YYYY-MM-DD')}, if "yesterday" use ${today
      .subtract(1, 'day')
      .format('YYYY-MM-DD')}, otherwise default ${today.format('YYYY-MM-DD')}),
  "amount": number,
  "type": "expense" | "income" | "savings",
  "description": short description
}
If multiple transactions, return them as:
[
  { ... },
  { ... }
]
Do NOT return markdown, explanations, or nested arrays.
`;
  }

  /** ============ 2️⃣ PARSE TRANSACTION FROM TEXT ============ */
  async parseTransactions(userId: string, input: string, sourceType: 'text' | 'image' | 'audio' = 'text') {
    const today = dayjs();
    const systemPrompt = await this.buildSystemPrompt(userId, sourceType);
    console.log('🧠 System Prompt:', systemPrompt);
    const response = await this.openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      //temperature: 0.2,
    });

    let raw = response.choices[0].message?.content ?? '{}';
    console.log('🧠 Raw OpenAI Response:', raw);

    // Clean JSON
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = Math.min(
      ...[raw.indexOf('{'), raw.indexOf('[')].filter(i => i >= 0),
    );
    if (start > 0) raw = raw.substring(start);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Failed to parse AI JSON: ${raw}`);
    }

    const transactions = Array.isArray(parsed) ? parsed : [parsed];
    const saved: Transaction[] = [];

    for (const t of transactions) {
      const tx = await this.transactionService.create({
        userId,
        accountId: t.accountId,
        categoryId: t.categoryId,
        amount: Math.abs(Number(t.amount)).toString(),
        type: t.type,
        transactionDate: t.transactionDate || today.format('YYYY-MM-DD'),
        description: t.description,
      });
      saved.push(tx);
    }

    return saved;
  }

  /** ============ 3️⃣ RECEIPT IMAGE HANDLER (via OCR API) ============ */
  async parseReceiptImage(userId: string, imageBuffer: Buffer) {
    const ocrApiUrl = this.config.get('OCR_API_URL'); // your HuggingFace / FastAPI OCR endpoint
    if (!ocrApiUrl) throw new Error('OCR_API_URL not configured');

    const formData = new FormData();
    // use Node FormData and append Buffer directly with filename/contentType
    formData.append('file', imageBuffer, { filename: 'receipt.jpg', contentType: 'image/jpeg' });

    const { data } = await axios.post(ocrApiUrl, formData, {
      headers: formData.getHeaders(),
    });

    if (!data?.text) throw new NotFoundException('No text returned from OCR API');
    console.log('🧾 OCR text:', data.text);

    return this.parseTransactions(userId, data.text.trim(), 'image');
  }
async parseAudio(userId: string, file: MulterFile) {
  console.log('🎤 Uploading audio to Whisper:', file.originalname, file.mimetype);

  // write buffer to a temp file so we can provide a stream with a `path` property
  const tmpDir = os.tmpdir();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`;
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

    console.log('🎧 Whisper text:', text);
    return this.parseTransactions(userId, text, 'audio');
  } finally {
    // best-effort cleanup; ignore errors
    fs.unlink(tmpPath, () => {});
  }
}
}

  /** ============ 4️⃣ AUDIO FILE HANDLER (via OpenAI Whisper) ============ */


