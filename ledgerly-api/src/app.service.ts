import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      name: 'Ledgerly API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/auth',
        transactions: '/transactions',
        accounts: '/accounts',
        categories: '/categories',
        budgets: '/budgets',
        debts: '/debts',
        recurring: '/recurring',
        reports: '/reports',
        ai: '/ai'
      }
    };
  }
}
