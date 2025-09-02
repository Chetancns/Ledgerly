import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Transaction } from "@/models/Transaction"; 
import { createTransaction, transfer } from "@/services/transactions"; 
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";

type TransactionFormData = Omit<Transaction, "id">;

export default function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<TransactionFormData>({
    accountId: "",
    categoryId: "",
    amount: "",
    description: "",
    transactionDate: new Date(),
  });

  const [isCreditCardPayment, setIsCreditCardPayment] = useState(false);
  const [payFromAccountId, setPayFromAccountId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [accRes, catRes] = await Promise.all([getUserAccount(), getUserCategory()]);
      setAccounts(accRes);
      setCategories(catRes);
    };
    fetchData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "transactionDate" ? new Date(value) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.accountId || !form.categoryId) {
      alert("Please select both account and category.");
      return;
    }

    try {
      if (isCreditCardPayment) {
        if (!payFromAccountId) {
          alert("Please select a source account to pay the credit card.");
          return;
        }

        // Call your transfer API
        await transfer({
          from: payFromAccountId,
          to: form.accountId, // credit card account
          cat: form.categoryId,
          amount: form.amount,
        });
      } else {
        // Normal expense or income
        await createTransaction(form);
      }

      setSuccessMessage("✅ Transaction added successfully!");
      onCreated();

      // Reset form
      setForm({
        accountId: "",
        categoryId: "",
        amount: "",
        description: "",
        transactionDate: new Date(),
      });
      setIsCreditCardPayment(false);
      setPayFromAccountId("");

      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      setErrorMessage("Transaction creation failed: " + error);
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full border border-white/20 p-8 md:p-12">
      <h2 className="text-2xl font-semibold text-white mb-6">Add Transaction</h2>

      {successMessage && (
        <div className="mb-4 text-green-300 font-medium bg-green-900/30 p-3 rounded-lg border border-green-500/40">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 text-green-300 font-medium bg-green-900/30 p-3 rounded-lg border border-green-500/40">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <select
          name="accountId"
          value={form.accountId}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        >
          <option>Select Account</option>
          {accounts.map((acc: Account) => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>

        <select
          name="categoryId"
          value={form.categoryId}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        >
          <option>Select Category</option>
          {categories.map((cat: Category) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <input
          name="amount"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        />

        <input
          name="description"
          placeholder="Description"
          value={form.description ?? ""}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        />

        <input
          type="date"
          name="transactionDate"
          value={form.transactionDate.toISOString().split("T")[0]}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition md:col-span-2"
        />

        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isCreditCardPayment}
            onChange={() => setIsCreditCardPayment(!isCreditCardPayment)}
            className="accent-yellow-300"
          />
          Credit Card Payment
        </label>

        {isCreditCardPayment && (
          <select
            name="payFromAccountId"
            value={payFromAccountId}
            onChange={(e) => setPayFromAccountId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          >
            <option>Select Source Account</option>
            {accounts
              .filter((a: Account) => a.type !== "credit_card")
              .map((acc: Account) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
          </select>
        )}

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
