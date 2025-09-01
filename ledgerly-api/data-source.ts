/* eslint-disable prettier/prettier */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './src/users/user.entity';
import { Account } from './src/accounts/account.entity';
import { Category } from './src/categories/category.entity';
import { Transaction } from './src/transactions/transaction.entity';
import { Budget } from './src/budgets/budget.entity';
import { RecurringTransaction } from './src/recurring/recurring.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  schema: 'dbo',
  entities: [
    User,
    Account,
    Category,
    Transaction,
    Budget,
    RecurringTransaction,
  ],
  migrations: ['dist/migrations/*.js'],
  ssl: process.env.DB_SSL === 'true',
});
