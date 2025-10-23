import api from "./api";
import { Account } from "../models/account";
export async function getUserAccount() {
    const res = await api.get<Account[]>("/accounts/accountusers");
    //console.log(res);
    return res.data;
}

export const getAccounts = async () => {
  return await api.get<Account[]>("/accounts");
};

export const createAccount = async (account: {
  name: string;
  type: string;
  balance: string;
}) => {
    //console.log("create",account);
  return await api.post<Account>("/accounts", account);
};

export const onDeleteAccount = async (id: string) => {
  return await api.delete(`/accounts/${id}`);
};

export const updateAccount = async (id: string, data: Partial<Account>) => {
  return await api.put<Account>(`/accounts/${id}`, data);
};