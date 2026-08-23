import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transaction.service';
import { Transaction } from './transaction.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Tag } from '../tags/tag.entity';

var mockManager: { withRepository: <T>(repo: T) => T };

jest.mock('../utils/transaction.util', () => ({
  withTransaction: async (_dataSource: unknown, callback: (manager: typeof mockManager) => Promise<unknown>) =>
    callback(mockManager),
}));

type MockRepo<T> = {
  findOne: jest.Mock<Promise<T | null>, [any]>;
  find: jest.Mock<Promise<T[]>, [any]>;
  create: jest.Mock<T, [Partial<T>]>;
  save: jest.Mock<Promise<T | T[]>, [T | T[]]>;
  delete: jest.Mock<Promise<unknown>, [string]>;
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let accounts: Account[];
  let categories: Category[];
  let tags: Tag[];
  let transactions: Transaction[];
  let txRepo: MockRepo<Transaction>;
  let accRepo: MockRepo<Account>;
  let catRepo: MockRepo<Category>;
  let tagRepo: MockRepo<Tag>;
  let dataSource: { transaction: jest.Mock };

  const notificationsService = {
    create: jest.fn(),
  };

  const buildAccountRepo = (): MockRepo<Account> => ({
    findOne: jest.fn(async ({ where }) =>
      accounts.find((account) => account.id === where.id && account.userId === where.userId && !account.IsDeleted) || null,
    ),
    find: jest.fn(async () => accounts),
    create: jest.fn((data) => data as Account),
    save: jest.fn(async (input) => {
      const list = Array.isArray(input) ? input : [input];
      list.forEach((account) => {
        const index = accounts.findIndex((item) => item.id === account.id);
        if (index >= 0) {
          accounts[index] = account;
        }
      });
      return input;
    }),
    delete: jest.fn(),
  });

  const buildCategoryRepo = (): MockRepo<Category> => ({
    findOne: jest.fn(async ({ where }) =>
      categories.find(
        (category) =>
          category.id === where.id &&
          category.userId === where.userId &&
          category.IsDeleted === where.IsDeleted,
      ) || null,
    ),
    find: jest.fn(async () => categories),
    create: jest.fn((data) => data as Category),
    save: jest.fn(async (input) => input),
    delete: jest.fn(),
  });

  const buildTagRepo = (): MockRepo<Tag> => ({
    findOne: jest.fn(async () => null),
    find: jest.fn(async () => tags),
    create: jest.fn((data) => data as Tag),
    save: jest.fn(async (input) => input),
    delete: jest.fn(),
  });

  const buildTxRepo = (): MockRepo<Transaction> => ({
    findOne: jest.fn(async ({ where }) =>
      transactions.find((transaction) => transaction.id === where.id && transaction.userId === where.userId) || null,
    ),
    find: jest.fn(async () => transactions),
    create: jest.fn((data) => ({ ...(data as Transaction), id: (data as Transaction).id || `tx-${transactions.length + 1}` })),
    save: jest.fn(async (input) => {
      const transaction = input as Transaction;
      const index = transactions.findIndex((item) => item.id === transaction.id);
      if (index >= 0) {
        transactions[index] = transaction;
      } else {
        transactions.push(transaction);
      }
      return transaction;
    }),
    delete: jest.fn(async (id: string) => {
      transactions = transactions.filter((transaction) => transaction.id !== id);
      return { affected: 1 };
    }),
  });

  const createService = () => {
    txRepo = buildTxRepo();
    accRepo = buildAccountRepo();
    catRepo = buildCategoryRepo();
    tagRepo = buildTagRepo();
    mockManager = {
      withRepository: <T>(repo: T) => repo,
    };
    dataSource = {
      transaction: jest.fn(async (callback: (manager: typeof mockManager) => Promise<unknown>) => callback(mockManager)),
    };

    service = new TransactionsService(
      txRepo as never,
      accRepo as never,
      catRepo as never,
      tagRepo as never,
      dataSource as never,
      notificationsService as never,
    );
  };

  beforeEach(() => {
    accounts = [
      { id: 'acc-1', userId: 'user-1', name: 'Checking', type: 'bank', balance: '100.00', currency: 'USD', IsDeleted: false, createdAt: new Date() } as Account,
      { id: 'acc-2', userId: 'user-1', name: 'Savings', type: 'savings', balance: '50.00', currency: 'USD', IsDeleted: false, createdAt: new Date() } as Account,
      { id: 'acc-3', userId: 'user-1', name: 'Brokerage', type: 'bank', balance: '10.00', currency: 'USD', IsDeleted: false, createdAt: new Date() } as Account,
    ];
    categories = [
      { id: 'cat-exp', userId: 'user-1', name: 'Groceries', type: 'expense', IsDeleted: false, createdAt: new Date() } as Category,
      { id: 'cat-inc', userId: 'user-1', name: 'Salary', type: 'income', IsDeleted: false, createdAt: new Date() } as Category,
    ];
    tags = [
      { id: 'tag-1', userId: 'user-1', name: 'Monthly', normalizedName: 'monthly', color: '#000000', isDeleted: false, createdAt: new Date(), updatedAt: new Date() } as Tag,
      { id: 'tag-2', userId: 'user-1', name: 'Bonus', normalizedName: 'bonus', color: '#111111', isDeleted: false, createdAt: new Date(), updatedAt: new Date() } as Tag,
    ];
    transactions = [];
    jest.clearAllMocks();
    createService();
  });

  it('creates an expense with category', async () => {
    const result = await service.create({
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-exp',
      amount: '20.00',
      type: 'expense',
      transactionDate: '2026-01-01',
    });

    expect(result.type).toBe('expense');
    expect(result.categoryId).toBe('cat-exp');
    expect(accounts[0].balance).toBe('80.00');
  });

  it('creates an expense without category', async () => {
    const result = await service.create({
      userId: 'user-1',
      accountId: 'acc-1',
      amount: '15.00',
      type: 'expense',
      transactionDate: '2026-01-01',
    });

    expect(result.categoryId).toBeNull();
    expect(accounts[0].balance).toBe('85.00');
  });

  it('creates income with or without category', async () => {
    const result = await service.create({
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-inc',
      amount: '40.00',
      type: 'income',
      transactionDate: '2026-01-01',
    });

    expect(result.type).toBe('income');
    expect(accounts[0].balance).toBe('140.00');
  });

  it('creates a transfer and clears category', async () => {
    const result = await service.create({
      userId: 'user-1',
      accountId: 'acc-1',
      toAccountId: 'acc-2',
      categoryId: 'cat-exp',
      amount: '25.00',
      type: 'transfer',
      transactionDate: '2026-01-01',
    });

    expect(result.type).toBe('transfer');
    expect(result.categoryId).toBeNull();
    expect(accounts[0].balance).toBe('75.00');
    expect(accounts[1].balance).toBe('75.00');
  });

  it('rejects a transfer without destination account', async () => {
    await expect(
      service.create({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: '10.00',
        type: 'transfer',
        transactionDate: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates category and allows removing category', async () => {
    transactions = [
      {
        id: 'tx-1',
        userId: 'user-1',
        accountId: 'acc-1',
        categoryId: 'cat-exp',
        amount: '20.00',
        type: 'expense',
        transactionDate: '2026-01-01',
        status: 'posted',
        toAccountId: null,
        tags: [],
      } as Transaction,
    ];
    accounts[0].balance = '80.00';
    createService();

    const result = await service.update('user-1', 'tx-1', {
      categoryId: '',
      amount: '20.00',
      type: 'expense',
    });

    expect(result.categoryId).toBeNull();
    expect(accounts[0].balance).toBe('80.00');
  });

  it('changes transaction type when updating', async () => {
    transactions = [
      {
        id: 'tx-1',
        userId: 'user-1',
        accountId: 'acc-1',
        categoryId: 'cat-exp',
        amount: '20.00',
        type: 'expense',
        transactionDate: '2026-01-01',
        status: 'posted',
        toAccountId: null,
        tags: [],
      } as Transaction,
    ];
    accounts[0].balance = '80.00';
    createService();

    const result = await service.update('user-1', 'tx-1', {
      type: 'income',
      categoryId: 'cat-inc',
      amount: '20.00',
    });

    expect(result.type).toBe('income');
    expect(accounts[0].balance).toBe('120.00');
  });

  it('updates transfer destination safely', async () => {
    transactions = [
      {
        id: 'tx-1',
        userId: 'user-1',
        accountId: 'acc-1',
        categoryId: null,
        amount: '25.00',
        type: 'transfer',
        transactionDate: '2026-01-01',
        status: 'posted',
        toAccountId: 'acc-2',
        tags: [],
      } as Transaction,
    ];
    accounts[0].balance = '75.00';
    accounts[1].balance = '75.00';
    createService();

    const result = await service.update('user-1', 'tx-1', {
      toAccountId: 'acc-3',
      amount: '25.00',
      type: 'transfer',
    });

    expect(result.toAccountId).toBe('acc-3');
    expect(accounts[0].balance).toBe('75.00');
    expect(accounts[1].balance).toBe('50.00');
    expect(accounts[2].balance).toBe('35.00');
  });

  it('creates and updates tags', async () => {
    tagRepo.find.mockResolvedValueOnce([tags[0]]).mockResolvedValueOnce([tags[1]]);

    const created = await service.create({
      userId: 'user-1',
      accountId: 'acc-1',
      amount: '10.00',
      type: 'expense',
      transactionDate: '2026-01-01',
      tagIds: ['tag-1'],
    });

    expect(created.tags).toHaveLength(1);

    const updated = await service.update('user-1', created.id, {
      tagIds: ['tag-2'],
      amount: '10.00',
      type: 'expense',
    });

    expect(updated.tags.map((tag) => tag.id)).toEqual(['tag-2']);
  });

  it('handles pending, posted, and cancelled status transitions', async () => {
    const pending = await service.create({
      userId: 'user-1',
      accountId: 'acc-1',
      amount: '10.00',
      type: 'expense',
      transactionDate: '2026-01-01',
      status: 'pending',
    });

    expect(accounts[0].balance).toBe('100.00');

    await service.updateStatus('user-1', pending.id, 'posted');
    expect(accounts[0].balance).toBe('90.00');

    await service.updateStatus('user-1', pending.id, 'cancelled');
    expect(accounts[0].balance).toBe('100.00');
  });

  it('normalizes legacy savings with destination account into transfer behavior on update', async () => {
    transactions = [
      {
        id: 'tx-1',
        userId: 'user-1',
        accountId: 'acc-1',
        categoryId: null,
        amount: '10.00',
        type: 'savings',
        transactionDate: '2026-01-01',
        status: 'posted',
        toAccountId: 'acc-2',
        tags: [],
      } as Transaction,
    ];
    accounts[0].balance = '90.00';
    accounts[1].balance = '60.00';
    createService();

    const result = await service.update('user-1', 'tx-1', {
      type: 'savings',
      toAccountId: 'acc-2',
      amount: '10.00',
    });

    expect(result.type).toBe('transfer');
    expect(accounts[0].balance).toBe('90.00');
    expect(accounts[1].balance).toBe('60.00');
  });

  it('throws when category does not exist', async () => {
    await expect(
      service.create({
        userId: 'user-1',
        accountId: 'acc-1',
        categoryId: 'missing',
        amount: '10.00',
        type: 'expense',
        transactionDate: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
