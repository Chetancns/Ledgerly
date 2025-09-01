import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Transaction, TransactionType } from "@/models/Transaction"; // adjust import path
import { createTransaction } from "@/services/transactions"; // adjust import path
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";
type TransactionFormData = Omit<Transaction, "id">; 
// form doesn’t need `id` since backend generates it

export default function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<TransactionFormData>({
    accountId: "",
    categoryId: "",
    amount: "",
    description: "",
    transactionDate: new Date(),
  });
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    useEffect(() => {
        const fetchData = async () => {
            const [accRes,catRes] = await Promise.all([getUserAccount(),getUserCategory()]);
            setAccounts(accRes);
            setCategories(catRes);
        };
        fetchData();
    },[]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "transactionDate" ? new Date(value) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await createTransaction(form);
    onCreated();
  };

 return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full  border border-white/20 p-8 md:p-12">
      <h2 className="text-2xl font-semibold text-white mb-6">Add Transaction</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <select
    name="accountId"
    value={form.accountId}
    onChange={handleChange}
    className="w-full px-4 py-3 rounded-lg bg-white/20 text-black placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
  >
    {accounts.map((acc) => (
      <option key={acc.id} value={acc.id}>{acc.name}</option>
    ))}
  </select>

  <select
    name="categoryId"
    value={form.categoryId}
    onChange={handleChange}
    className="w-full px-4 py-3 rounded-lg bg-white/20 text-black placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
  >
    {categories.map((cat) => (
      <option key={cat.id} value={cat.id}>{cat.name}</option>
    ))}
  </select>

  <input
    name="amount"
    placeholder="Amount"
    value={form.amount}
    onChange={handleChange}
    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
  />

  <input
    name="description"
    placeholder="Description"
    value={form.description ?? ""}
    onChange={handleChange}
    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
  />

  <input
    type="date"
    name="transactionDate"
    value={form.transactionDate.toISOString().split("T")[0]}
    onChange={handleChange}
    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition md:col-span-2"
  />

  <button
    type="submit"
    className="w-full py-3 bg-yellow-300 text-indigo-900 font-semibold rounded-lg hover:bg-yellow-400 transition md:col-span-2"
  >
    Add Transaction
  </button>
</form>

    </div>
 
);
}
