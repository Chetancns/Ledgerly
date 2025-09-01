
export type CategoryType = 'expense' | 'income';
export interface Category {
    id: string;
    userId?: string;
    name?: string;
    type?: CategoryType;
    icon?: string;
    createdAt?: Date;
}