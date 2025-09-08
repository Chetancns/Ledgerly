import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import dayjs from 'dayjs';
import { TransactionsService } from '../transactions/transaction.service';
import { Transaction } from '../transactions/transaction.entity';
import { Account } from 'src/accounts/account.entity';
import { Category } from 'src/categories/category.entity';
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

 async parseTransactions(
    userId: string,
    input: string,
  ) {
    const today = dayjs();
    const categories: Category[] = await this.catRepo.find({where: { userId },});
    const accounts:Account[] = await this.accRepo.find({where: { userId },});
    // Decide if it's single sentence vs multiple transactions
    const isMultiLine = input.includes("\n");

    const systemPrompt = `
You are a financial transaction parser.
The user may input:
  - A natural language sentence (e.g. "You made a debit card transaction of $17.75 with PP*DOORDASH MCDONALD")
  - Or raw bank statement text with multiple lines.

Your task:
- Return structured JSON.
- Each transaction must include:
  {
    "accountId": string (choose from: ${accounts.map(a => `${a.id} (${a.name} - type ${a.type})`).join(', ')}) from where the transaction may have taken place,
    "categoryId": string (choose from: ${categories.map(c => `${c.id} (${c.name})`).join(', ')}) why or for what this transaction was done for,
    "transactionDate": "YYYY-MM-DD" (If the text says "today" use ${today.format("YYYY-MM-DD")},
  if "yesterday" use ${today.subtract(1, "day").format("YYYY-MM-DD")},
  otherwise leave ${today.format("YYYY-MM-DD")} if no date is clear),
    "amount": number,
    "type": "expense" | "income" | "savings",
    "description": short description of the transaction
  }
- - If there are multiple transactions, return them as a SINGLE flat JSON array of objects:
  [
    { ... },
    { ... }
  ]
- Do NOT wrap the array inside another array.
- Do NOT return arrays of arrays.
- If the input is a single sentence, output a single transaction object (not inside an array).
`;
console.log(systemPrompt);
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      temperature: 0.2,
    });

    let raw = response.choices[0].message?.content ?? "{}";
 console.log(raw);
// 1. Remove markdown fences (```json ... ```)
raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

// 2. If AI added explanation text before JSON, extract just the JSON
const firstBrace = raw.indexOf("{");
const firstBracket = raw.indexOf("[");
const start = firstBrace === -1 ? firstBracket : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));
if (start > 0) {
  raw = raw.substring(start);
}

// 3. Now parse
let parsed: any;
try {

  parsed = JSON.parse(raw);
  console.log(parsed);
} catch (err) {
  throw new Error(`Failed to parse AI response: ${raw}`);
}
    // Normalize to array
    const transactions = Array.isArray(parsed) ? parsed : [parsed];

    // Auto-save into DB
    const saved :Transaction[] = [];

    for (const t of transactions) {
      const tx = await this.transactionService.create( {
        userId,
        accountId: t.accountId,
        categoryId: t.categoryId,
        amount: Math.abs(Number(t.amount)).toString(),
        type: t.type,
        transactionDate:
          t.transactionDate ||
          today.format("YYYY-MM-DD"), // fallback to today
        description: t.description,
      });
      saved.push(tx);
    }

    return saved;
  }
}