import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Transaction } from "@/models/Transaction"; 
import { createTransaction, onDelete, transfer, updateTransaction } from "@/services/transactions"; 
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";
import { parseTransaction } from "@/services/ai";
import toast from "react-hot-toast";

type TransactionFormData = Omit<Transaction, "id">;

export default function TransactionForm({
  onCreated,
  transaction,
  onUpdated,
  onCancel
}: {
  onCreated: () => void;
  transaction?: Transaction;
  onUpdated?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<TransactionFormData>({
    accountId: transaction?.accountId || "",
    categoryId: transaction?.categoryId || "",
    amount: transaction?.amount?.toString() || "",
    description: transaction?.description || "",
    transactionDate: transaction?.transactionDate?.split("T")[0] || new Date().toISOString().split("T")[0],
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importInput, setImportInput] = useState("");

  // 🔹 new state for type + destination
  const [kind, setKind] = useState<"normal" | "transfer" | "savings">("normal");
  const [toAccountId, setToAccountId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const [accRes, catRes] = await Promise.all([getUserAccount(), getUserCategory()]);
      setAccounts(accRes);
      setCategories(catRes);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (transaction) {
    setForm({
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      amount: transaction.amount.toString(),
      description: transaction.description,
      transactionDate: transaction.transactionDate.split("T")[0],
    });

    // 🔹 Detect transfer/savings transactions
    if (transaction.type === "transfer" || transaction.type === "savings") {
      setKind(transaction.type);
      if (transaction.toAccountId) {
        setToAccountId(transaction.toAccountId);
      }
    } else {
      setKind("normal");
    }
  }
  }, [transaction]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
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
       if (transaction) {
    // 🔹 Editing an existing transaction
    if (kind === "transfer" || kind === "savings") {
      if (!toAccountId) {
        alert("Please select the destination account.");
        return;
      }
      await updateTransaction(transaction.id, {
        ...form,
        toAccountId,
        type: kind,
        transactionDate: toISOStringWithoutOffset(form.transactionDate),
      });
    } else {
      await updateTransaction(transaction.id, {
        ...form,
        transactionDate: toISOStringWithoutOffset(form.transactionDate),
      });
    }

    toast.success("✅ Transaction updated!");
    onUpdated?.();
    onCancel?.();
  } 
       else if (kind === "transfer" || kind === "savings") {
        // 🔹 Transfer or Savings flow
        if (!toAccountId) {
          alert("Please select the destination account.");
          return;
        }

        await transfer({
          from: form.accountId,
          to: toAccountId,
          cat: form.categoryId,
          amount: form.amount,
          description: form.description || "",
          date: toISOStringWithoutOffset(form.transactionDate),
          type: kind,
        });

        toast.success(`✅ ${kind === "transfer" ? "Transfer" : "Savings"} recorded!`);
        onCreated();
      } else {
        // 🔹 Normal expense/income
        await createTransaction({
          ...form,
          transactionDate: toISOStringWithoutOffset(form.transactionDate),
        });

        toast.success("✅ Transaction added!");
        onCreated();
      }

      // Reset form
      setForm({
        accountId: "",
        categoryId: "",
        amount: "",
        description: "",
        transactionDate: new Date().toISOString().split("T")[0],
      });
      setKind("normal");
      setToAccountId("");
    } catch (error) {
      toast.error(
        transaction
          ? "Transaction update failed: " + error
          : "Transaction creation failed: " + error
      );
    }
  };

  const CallAIbackendAPI = async () => {
    try {
      await parseTransaction(importInput);
      onCreated();
    } catch (err) {
      alert("Import failed");
    }
  };

  return (
    <div className="bg-white/1 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full border border-white/30 p-8 ">
      <h2 className="text-2xl font-semibold text-white mb-6">
        {transaction ? "Edit Transaction" : "Add Transaction"}
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Account */}
        <div>
          <label htmlFor="accountId" className="block text-white font-medium">Account</label>
          <select
            id="accountId"
            name="accountId"
            value={form.accountId}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          >
            <option>Select Account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="block text-white font-medium">Category</label>
          <select
            id="categoryId"
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          >
            <option>Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-white font-medium">Amount</label>
          <input
            id="amount"
            name="amount"
            placeholder="Amount"
            value={form.amount}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-white font-medium">Description</label>
          <input
            id="description"
            name="description"
            placeholder="Description"
            value={form.description ?? ""}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          />
        </div>

        {/* Date */}
        <div className="md:col-span-2">
          <label htmlFor="transactionDate" className="block text-white font-medium">Transaction Date</label>
          <input
            type="date"
            id="transactionDate"
            name="transactionDate"
            value={form.transactionDate}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          />
        </div>

        {/* Transaction Type + Destination Account */}
<div className="md:col-span-2">
  <label className="block text-white font-medium mb-2">Transaction Type</label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    
    {/* Type buttons */}
    <div className="flex gap-3">
      {["normal", "transfer", "savings"].map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setKind(t as "normal" | "transfer" | "savings")}
          className={`px-4 py-2 rounded-lg font-semibold transition w-full
            ${kind === t 
              ? "bg-blue-300 text-indigo-900 shadow-md" 
              : "bg-white/20 text-white hover:bg-white/30"}`}
        >
          {t === "normal" && "Normal"}
          {t === "transfer" && "Transfer"}
          {t === "savings" && "Savings"}
        </button>
      ))}
    </div>

    {/* Destination Account (only when needed) */}
    {(kind === "transfer" || kind === "savings") && (
      <div>
        <label htmlFor="toAccountId" className="block text-white font-medium mb-2">
          {kind === "transfer" ? "Destination Account" : "Savings Account"}
        </label>
        <select
          id="toAccountId"
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/20 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
        >
          <option>Select Account</option>
          {accounts
            .filter((acc) => acc.id !== form.accountId)
            .map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
        </select>
      </div>
    )}
  </div>
</div>

        {/* Buttons */}
        <div className="flex gap-4 md:col-span-2">
          <button
            type="submit"
            className="w-4/5 py-3 bg-yellow-300 text-indigo-900 font-semibold rounded-lg hover:bg-yellow-400 transition"
          >
            {transaction ? "Update Transaction" : "Add Transaction"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-1/5 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => setShowImportPopup(true)}
            className="w-1/5 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition"
          >
            📥 AI Import
          </button>
        </div>
      </form>

      {/* Import Modal */}
      {showImportPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-semibold mb-4">Import Transactions</h3>
            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Paste your transaction details and let the AI do the heavy lifting."
              className="w-full h-32 p-3 border rounded-lg mb-4 resize-y"
            />
            <div className="flex justify-end gap-4 mb-4">
              <button onClick={() => setImportInput("")} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Clear</button>
              <button onClick={() => setShowImportPopup(false)} className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-400">Close</button>
              <button onClick={CallAIbackendAPI} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
