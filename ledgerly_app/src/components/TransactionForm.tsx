import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Transaction } from "@/models/Transaction"; 
import { createTransaction, onDelete, transfer } from "@/services/transactions"; 
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";
import { parseTransaction } from "@/services/ai";

type TransactionFormData = Omit<Transaction, "id">;

export default function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<TransactionFormData>({
    accountId: "",
    categoryId: "",
    amount: "",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });
  const [isCreditCardPayment, setIsCreditCardPayment] = useState(false);
  const [payFromAccountId, setPayFromAccountId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importInput, setImportInput] = useState("");
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
      [name]:  value,
    }));
  };
const toISOStringWithoutOffset = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString();
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
        console.log(form.transactionDate);
        // Call your transfer API
        await transfer({
          from: payFromAccountId,
          to: form.accountId, // credit card account
          cat: form.categoryId,
          amount: form.amount,
          date: form.transactionDate
        });
      } else {
        // Normal expense or income
        await createTransaction({...form,transactionDate:toISOStringWithoutOffset(form.transactionDate),});
      }

      setSuccessMessage("✅ Transaction added successfully!");
      onCreated();

      // Reset form
      setForm({
        accountId: "",
        categoryId: "",
        amount: "",
        description: "",
        transactionDate: new Date().toISOString().split("T")[0],
      });
      setIsCreditCardPayment(false);
      setPayFromAccountId("");

      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      setErrorMessage("Transaction creation failed: " + error);
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

const CallAIbackendAPI = async () => {
            try {
              const fetchData = async () => {
      const [aitx] = await Promise.all([parseTransaction(importInput)]);
      onCreated();
    };
    fetchData();
            } catch (err) {
              alert("Import failed");
            }
  }

  return (
    <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full border border-white/30 p-8 md:p-12">
      <h2 className="text-2xl font-semibold text-white mb-6">Add Transaction</h2>

      {successMessage && (
        <div className="fixed top-4 right-4 mb-4 text-green-300 font-medium bg-green-900/30 p-3 rounded-lg border border-green-500/40">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-4 right-4 mb-4 text-green-300 font-medium bg-green-900/30 p-3 rounded-lg border border-green-500/40">
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
          className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        />

        <input
          name="description"
          placeholder="Description"
          value={form.description ?? ""}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        />

        <input
          type="date"
          name="transactionDate"
          value={form.transactionDate}
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
<div className="flex gap-4 md:col-span-2">
        <button
          type="submit"
          className="w-4/5 py-3 bg-yellow-300 text-indigo-900 font-semibold rounded-lg hover:bg-yellow-400 transition md:col-span-2"
        >
          Add Transaction
        </button>
        <button
  type="button"
  onClick={() => setShowImportPopup(true)}
  className="w-1/5 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition md:col-span-2"
>
  📥 AI Import Transactions
</button></div>
      </form>
      {showImportPopup && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    {/* Modal container */}
    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
      <h3 className="text-xl font-semibold mb-4">Import Transactions</h3>
        <p className="text-sm text-gray-600 mb-2">
  Please enter your transaction data for AI interpretation.<br />
  Make sure to include references to both the <strong>account</strong> and <strong>category</strong>, or the AI may choose ones it thinks are closest.<br />
  Once inserted,<strong>Double-Check</strong>  the transaction in the list to ensure everything looks correct.
</p>

      <textarea
        value={importInput}
        onChange={(e) => setImportInput(e.target.value)}
        placeholder="Paste your transaction details and let the AI do the heavy lifting."
        className="w-full h-32 p-3 border rounded-lg mb-4 resize-y"
      />

      <div className="flex justify-end gap-4 mb-4">
        <button onClick={()=>setImportInput('')}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >Clear</button>
        <button
          onClick={() => setShowImportPopup(false)}
          className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-400"
        >
          Close
        </button>
        <button
          onClick={CallAIbackendAPI}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
