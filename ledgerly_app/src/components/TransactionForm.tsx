import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Transaction } from "@/models/Transaction"; 
import { createTransaction, onDelete, transfer, updateTransaction } from "@/services/transactions"; 
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";
import { parseTransaction } from "@/services/ai";
import toast from "react-hot-toast";
import NeumorphicSelect from "./NeumorphicSelect";
import NeumorphicInput from "./NeumorphicInput";
import ModernButton from "./NeumorphicButton";
import { useTheme } from "@/context/ThemeContext";

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
  
  const { theme } = useTheme();

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
  const resetForm = () => {
  setForm({
    accountId: "",
    categoryId: "",
    amount: "",
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });
  setKind("normal");
  setToAccountId("");
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
      <div className={`relative backdrop-blur-2xl rounded-2xl shadow-xl p-4 w-full transition-all duration-300 overflow-visible border
        ${theme === "dark" 
          ? "bg-gradient-to-br from-indigo-900/80 to-pink-800/60 border-white/10 hover:shadow-pink-500/10" 
          : "bg-gradient-to-br from-blue-50/60 to-slate-100/60 border-slate-300/50 hover:shadow-blue-400/10"
        }`}>
        <h2 className={`text-2xl font-semibold mb-2 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
          {transaction ? "✏️ Edit Transaction" : "➕ Add Transaction"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Account */}
          <div>
            <label htmlFor="accountId" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
              Account
            </label>
              <NeumorphicSelect 
                options={accounts.map(acc => ({
                    value: acc.id,
                    label: acc.name ?? "Unnamed Account"
                  }))}  
                value={form.accountId}
                onChange={(val) =>
                    setForm((prev) => ({ ...prev, accountId: val }))
                  }
                placeholder="Select Account"
              />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
              Category
            </label>
            <NeumorphicSelect
              options={categories.map(cat => ({
                value: cat.id,
                label: `${cat.type === "income" ? "💰" : "💸"} ${cat.name}`
              }))}
              value={form.categoryId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, categoryId: val }))
              }
              placeholder="Select Category"
            />

          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
              Amount
            </label>
            <NeumorphicInput
              type="number"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, amount: val }))
              }
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
              Description
            </label>
            <NeumorphicInput
              type="text"
              placeholder="What was this for?"
              value={form.description ?? ""}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, description: val }))
              }
            />
          </div>

          {/* Transaction Date */}
          <div>
            <label htmlFor="transactionDate" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
              Transaction Date
            </label>
            <NeumorphicInput
              type="date"
              placeholder="Select date"
              value={form.transactionDate}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, transactionDate: val }))
              }
            />
          </div>

          {/* To Account (only for transfer/savings) */}
          {(kind === "transfer" || kind === "savings") && (
            <div className="relative">
              <label htmlFor="toAccountId" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
                {kind === "transfer" ? "Destination Account" : "Savings Account"}
              </label>
              <NeumorphicSelect
                placeholder="Select Destination Account"
                value={toAccountId}
                onChange={(val) => setToAccountId(val)}
                options={accounts
                  .filter((acc) => acc.id !== form.accountId)
                  .map((acc) => ({
                    label: `${acc.name} (${acc.type})`,
                    value: acc.id,
                  }))}
              />
            </div>
          )}

          {/* Transaction Type */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>Transaction Type</label>
            <div className="flex gap-3">
              {["normal", "transfer", "savings"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setKind(t as any)}
                  className={`px-4 py-2 rounded-xl font-semibold w-1/3 transition-all duration-200 
                    ${
                      kind === t
                        ? theme === "dark"
                          ? "bg-blue-400 text-indigo-900 shadow-lg shadow-blue-500/20"
                          : "bg-blue-500 text-white shadow-lg shadow-blue-400/20"
                        : theme === "dark"
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-slate-300/40 text-slate-800 hover:bg-slate-300/60"
                    }`}
                >
                  {t === "normal" ? "💸 Normal" : t === "transfer" ? "🔀 Transfer" : "🏦 Savings"}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex flex-wrap gap-4 mt-2">
            {/* Add / Update Transaction */}
            <ModernButton
              type="submit"
              color="blue-600"
              variant="solid"
              size="lg"
              className="flex-1 text-indigo-900 font-semibold"
            >
              {transaction ? "Update Transaction" : "Add Transaction"}
            </ModernButton>

            {/* Cancel */}
            <ModernButton
              type="button"
              onClick={() => { resetForm(); onCancel?.(); }}
              color="orange-600"
              variant="solid"
              size="lg"
              className="text-white font-semibold"
            >
              Cancel
            </ModernButton>

            {/* AI Import */}
            <ModernButton
              type="button"
              onClick={() => setShowImportPopup(true)}
              color="cyan-600"
              variant="solid"
              size="lg"
              className="text-white font-semibold"
              leftIcon={<span>📥</span>}
            >
              AI Import
            </ModernButton>
          </div>
        </form>

        {/* Import Popup */}
        {showImportPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`border rounded-2xl p-6 w-full max-w-lg shadow-2xl ${theme === "dark" ? "bg-zinc-900/90 border-white/10 text-white" : "bg-white/90 border-slate-300/50 text-slate-900"}`}>
              <h3 className={`text-lg font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>AI Transaction Import</h3>
              <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
                Paste transaction details below and let AI parse them automatically.
              </p>

              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className={`w-full h-32 p-3 rounded-xl border mb-4 resize-y ${theme === "dark" ? "bg-white/10 text-white/90 border-white/10" : "bg-slate-100 text-slate-900 border-slate-300"}`}
                placeholder="Example: 'Transfer 500 to Savings for groceries on 2025-11-08'"
                disabled={importLoading}
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowImportPopup(false)}
                  className={`px-4 py-2 rounded-lg hover:opacity-80 transition ${theme === "dark" ? "bg-gray-600 text-white hover:bg-gray-500" : "bg-slate-400 text-white hover:bg-slate-500"}`}
                >
                  Cancel
                </button>

                <button
                  onClick={CallAIbackendAPI}
                  disabled={importLoading}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${theme === "dark" ? "bg-green-500 text-white hover:bg-green-400" : "bg-green-600 text-white hover:bg-green-700"}
                            ${importLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {importLoading && (
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
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
