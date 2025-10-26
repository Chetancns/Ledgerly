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

  // 🔹 new state for import loading / progress
  const [importLoading, setImportLoading] = useState(false);

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
    toast.error("Please select both account and category.");
    return;
  }

  try {
    const transactionPromise = (() => {
      if (transaction) {
        // 🔹 Editing existing transaction
        if ((kind === "transfer" || kind === "savings") && !toAccountId) {
          toast.error("Please select the destination account.");
          return;
        }

        const payload = {
          ...form,
          transactionDate: toISOStringWithoutOffset(form.transactionDate),
          ...(kind === "transfer" || kind === "savings" ? { toAccountId, type: kind } : {}),
        };

        return updateTransaction(transaction.id, payload);
      }

      // 🔹 Creating new transaction
      if ((kind === "transfer" || kind === "savings") && !toAccountId) {
        toast.error("Please select the destination account.");
        return;
      }

      if (kind === "transfer" || kind === "savings") {
        return transfer({
          from: form.accountId,
          to: toAccountId,
          cat: form.categoryId,
          amount: form.amount,
          description: form.description || "",
          date: toISOStringWithoutOffset(form.transactionDate),
          type: kind,
        });
      }

      return createTransaction({
        ...form,
        transactionDate: toISOStringWithoutOffset(form.transactionDate),
      });
    })();

    if (!transactionPromise) return; // Guard for missing inputs

    await toast.promise(transactionPromise, {
      loading: "Processing transaction... hang tight!",
      success: transaction
        ? `✅ ${kind === "transfer" ? "Transfer" : kind === "savings" ? "Savings" : "Transaction"} updated!`
        : `✅ ${kind === "transfer" ? "Transfer" : kind === "savings" ? "Savings" : "Transaction"} recorded!`,
      error: transaction
        ? "Transaction update failed. Please try again."
        : "Transaction creation failed. Please check your inputs.",
    });

    if (transaction) {
      onUpdated?.();
      onCancel?.();
    } else {
      onCreated?.();
    }

    // Reset form after success
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
    console.error("Transaction error:", error);
  }
};

  const CallAIbackendAPI = async () => {
  // small UX guard: if input empty, fail fast
  if (!importInput.trim()) {
    toast.error("Please paste transaction text to import.");
    return;
  }

  try {
    const importPromise = (async () => {
      setImportLoading(true);
      await parseTransaction(importInput);
      onCreated?.();
      setShowImportPopup(false);
    })();

    await toast.promise(importPromise, {
      loading: "Analyzing and importing your transactions... please wait ⏳",
      success: "✅ Import completed successfully!",
      error: "❌ Import failed. Please try again or check the input.",
    });
  } catch (err) {
    console.error("Import error:", err);
  } finally {
    setImportLoading(false);
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
            <option value="" disabled>Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="text-black">
                {cat.type === "income" ? "💰" : "💸"} {cat.name}
              </option>
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
          <div className="bg-white text-black rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-semibold mb-4">Import Transactions</h3>
            <p className="text-sm text-gray-600 mb-2">
  Please enter your transaction data for AI interpretation.<br />
  Make sure to include references to both the <strong>account</strong> and <strong>category</strong>, or the AI may choose ones it thinks are closest.<br />
  Once inserted,<strong>Double-Check</strong>  the transaction in the list to ensure everything looks correct.
</p>

            {/* progress bar (visible while importing) */}
            {importLoading && (
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div className="h-2 bg-yellow-400 animate-pulse w-full" />
                </div>
                <div className="text-sm text-gray-600 mt-2">Importing... please wait</div>
              </div>
            )}

            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Paste your transaction details and let the AI do the heavy lifting."
              className="w-full h-32 p-3 border rounded-lg mb-4 resize-y"
              disabled={importLoading}
            />

            <div className="flex justify-end gap-4 mb-4">
              <button
                onClick={() => setImportInput("")}
                className={`px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 ${importLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={importLoading}
              >
                Clear
              </button>
              <button
                onClick={() => setShowImportPopup(false)}
                className={`px-4 py-2 bg-gray-500 rounded hover:bg-gray-400 ${importLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={importLoading}
              >
                Close
              </button>
              <button
                onClick={CallAIbackendAPI}
                className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 ${importLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                disabled={importLoading}
              >
                {importLoading && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                {importLoading ? "Importing..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
