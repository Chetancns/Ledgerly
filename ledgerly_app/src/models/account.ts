export type AccountType = 'bank' | 'cash' | 'credit_card' | 'wallet' | 'savings';

export interface Account {
    id: string;
    userId?: string;
    name?: string;
    type?: AccountType;
    balance?: string;
    createdAt?: Date;
}