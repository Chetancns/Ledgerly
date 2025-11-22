import api from "./api";
import { Category, CategoryType } from "../models/category";

export async function getUserCategory() {
    const res = await api.get("categories/categoryuser");
    //console.log(res);
  return res.data;
}

export const getCategories = async () => {
  const res = await api.get<Category[]>("categories");
  return res.data;
};

export const createCategory = async (category: { name: string; type: CategoryType }) => {
  const res = await api.post<Category>("categories", category);
  return res.data;
};

export const onDeleteCategory = async (id: string) => {
  const res = await api.delete(`categories/${id}`);
  return res.data;
};

export const updateCategory = async (id: string, data: { name: string; type: CategoryType }) => {
  const res = await api.put<Category>(`categories/${id}`, data);
  return res.data;
};