import api from "./api";
import { Account } from "../models/account";
export async function getUserAccount() {
    const res = await api.get<Account[]>("/accounts/accountusers");
    //console.log(res);
    return res.data;
}

export const getAccounts = async () => {
  const res = await api.get<Account[]>("/accounts");
  return res.data;
};

export const createAccount = async (account: {
  name: string;
  type: string;
  balance: string;
}) => {
  const res = await api.post<Account>("/accounts", account);
  return res.data;
};

export const onDeleteAccount = async (id: string) => {
  const res = await api.delete(`/accounts/${id}`);
  return res.data;
};

export const updateAccount = async (id: string, data: Partial<Account>) => {
  const res = await api.put<Account>(`/accounts/${id}`, data);
  return res.data;
};