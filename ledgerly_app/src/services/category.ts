import api from "./api";
import { Category, CategoryType } from "../models/category";

export async function getUserCategory() {
    const res = await api.get("categories/categoryuser");
    console.log(res);
    return res.data;
}

export const getCategories = async () => {
  return await api.get<Category[]>("categories");
};

export const createCategory = async (category: { name: string; type: CategoryType }) => {
  return await api.post<Category>("categories", category);
};

export const onDeleteCategory = async (id: string) => {
  return await api.delete(`categories/${id}`);
};

export const updateCategory = async (id: string, data: { name: string; type: CategoryType }) => {
  console.log(data);
  return await api.put<Category>(`categories/${id}`, data);
};