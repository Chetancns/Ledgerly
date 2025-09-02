
export type CategoryType = 'expense' | 'income' | 'savings' ;
export interface Category {
    id: string;
    userId?: string;
    name?: string;
    type?: CategoryType;
    icon?: string;
    createdAt?: Date;
}