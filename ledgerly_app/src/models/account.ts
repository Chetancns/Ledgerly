export type AccountType = 'bank' | 'cash' | 'credit_card' | 'wallet';

export interface Account {
    id: string;
    userId?: string;
    name?: string;
    type?: AccountType;
    balance?: string;
    createdAt?: Date;
}