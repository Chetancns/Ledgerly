import { useState, ChangeEvent, FormEvent, useEffect, useCallback } from "react";
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
import TagInput from "./TagInput";
import SegmentedControl from "./SegmentedControl";
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
    tagIds: transaction?.tags?.map(t => t.id) || [],
    status: transaction?.status || "posted",
    expectedPostDate: transaction?.expectedPostDate?.split("T")[0] || undefined,
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importInput, setImportInput] = useState("");
  const { theme } = useTheme();
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
      tagIds: transaction.tags?.map(t => t.id) || [],
      status: transaction.status || "posted",
      expectedPostDate: transaction.expectedPostDate?.split("T")[0] || undefined,
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
    tagIds: [],
    status: "posted",
    expectedPostDate: undefined,
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
          expectedPostDate: form.expectedPostDate ? form.expectedPostDate : undefined,
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
          tagIds: form.tagIds,
        });
      }

      return createTransaction({
        ...form,
        transactionDate: toISOStringWithoutOffset(form.transactionDate),
        expectedPostDate: form.expectedPostDate ? form.expectedPostDate : undefined,
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
      tagIds: [],
      status: "posted",
      expectedPostDate: undefined,
    });
    setKind("normal");
    setToAccountId("");
  } catch (error) {
    console.error("Transaction error:", error);
  }
};

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Esc to cancel
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
      <div className="relative z-20 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 w-full transition-all duration-300 hover:shadow-blue-500/10 overflow-y-auto max-h-[85vh]"
           style={{ 
             background: "var(--bg-card)", 
             border: "1px solid var(--border-primary)" 
           }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            {transaction ? (
              <>
                <span className="text-2xl">✏️</span>
                <span>Edit Transaction</span>
              </>
            ) : (
              <>
                <span className="text-2xl">➕</span>
                <span>New Transaction</span>
              </>
            )}
          </h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Close form (Esc)"
              title="Press Esc to close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Transaction Type
            </label>
            <SegmentedControl
              options={[
                { value: "normal", label: "Normal", icon: "💸" },
                { value: "transfer", label: "Transfer", icon: "🔀" },
                { value: "savings", label: "Savings", icon: "🏦" },
              ]}
              value={kind}
              onChange={(val) => setKind(val as any)}
              size="md"
            />
          </div>

          {/* Main Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Account */}
            <div className="space-y-2">
              <label htmlFor="accountId" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Account *
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
                  theme={theme}
                />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="categoryId" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Category *
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
                theme={theme}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label htmlFor="amount" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Amount *
              </label>
              <NeumorphicInput
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, amount: val }))
                }
                theme={theme}
              />
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <label htmlFor="transactionDate" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Date *
              </label>
              <NeumorphicInput
                type="date"
                placeholder="Select date"
                value={form.transactionDate}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, transactionDate: val }))
                }
                theme={theme}
              />
            </div>

            {/* Description - Full Width */}
            <div className="md:col-span-2 space-y-2">
              <label htmlFor="description" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Description
              </label>
              <NeumorphicInput
                type="text"
                placeholder="What was this transaction for?"
                value={form.description ?? ""}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, description: val }))
                }
                theme={theme}
              />
            </div>
          </div>

          {/* To Account and Expected Post Date - Side by side when both visible */}
          {((kind === "transfer" || kind === "savings") || form.status === "pending") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* To Account (only for transfer/savings) */}
              {(kind === "transfer" || kind === "savings") && (
                <div className="space-y-2">
                  <label htmlFor="toAccountId" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {kind === "transfer" ? "To Account *" : "Savings Account *"}
                  </label>
                  <NeumorphicSelect
                    placeholder="Select Destination Account"
                    value={toAccountId}
                    onChange={(val) => setToAccountId(val)}
                    theme={theme}
                    options={accounts
                      .filter((acc) => acc.id !== form.accountId)
                      .map((acc) => ({
                        label: `${acc.name} (${acc.type})`,
                        value: acc.id,
                      }))}
                  />
                </div>
              )}

              {/* Expected Post Date - only show for pending transactions */}
              {form.status === "pending" && (
                <div className={`space-y-2 p-4 rounded-xl ${(kind === "transfer" || kind === "savings") ? '' : 'md:col-span-2'}`} style={{ 
                  background: "var(--color-warning-bg)",
                  border: "1px solid var(--color-warning)"
                }}>
                  <label htmlFor="expectedPostDate" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Expected Post Date <span className="text-xs font-normal" style={{ color: "var(--text-secondary)" }}>(optional)</span>
                  </label>
                  <NeumorphicInput
                    type="date"
                    placeholder="When will this clear?"
                    value={form.expectedPostDate || ""}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, expectedPostDate: val }))
                    }
                    theme={theme}
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                    💡 For hotel bookings, car rentals, or other transactions that take days to post
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Transaction Status */}
          <div className="space-y-3">
            <label htmlFor="status" className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Status
            </label>
            <SegmentedControl
              options={[
                { value: "posted", label: "Posted", icon: "✅" },
                { value: "pending", label: "Pending", icon: "⏳" },
                { value: "cancelled", label: "Cancelled", icon: "❌" },
              ]}
              value={form.status || "posted"}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, status: val as any }))
              }
              size="md"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Tags <span className="text-xs font-normal" style={{ color: "var(--text-secondary)" }}>(optional)</span>
            </label>
            <TagInput
              value={form.tagIds || []}
              onChange={(tagIds) => setForm((prev) => ({ ...prev, tagIds }))}
              placeholder="Add tags to organize this transaction..."
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              💡 Use tags to organize and filter your transactions easily
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
            {/* Submit Button */}
            <ModernButton
              type="submit"
              color="yellow-400"
              variant="solid"
              size="lg"
              theme={theme}
              className="flex-1 min-w-[200px] text-indigo-900 font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              {transaction ? "💾 Update Transaction" : "➕ Add Transaction"}
            </ModernButton>

            {/* AI Import */}
            <ModernButton
              type="button"
              onClick={() => setShowImportPopup(true)}
              color="blue-500"
              variant="solid"
              size="lg"
              theme={theme}
              className="text-white font-semibold"
              leftIcon={<span>🤖</span>}
            >
              AI Import
            </ModernButton>

            {/* Cancel */}
            {onCancel && (
              <ModernButton
                type="button"
                onClick={() => { resetForm(); onCancel(); }}
                color="gray-600"
                variant="solid"
                size="lg"
                theme={theme}
                className="text-white font-semibold"
              >
                Cancel
              </ModernButton>
            )}
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-center pt-2" style={{ color: "var(--text-muted)" }}>
            💡 <strong>Tip:</strong> Press <kbd className="px-2 py-1 rounded" style={{ background: "var(--bg-tertiary)" }}>Enter</kbd> to submit or <kbd className="px-2 py-1 rounded" style={{ background: "var(--bg-tertiary)" }}>Esc</kbd> to cancel
          </div>
        </form>

        {/* Import Popup */}
        {showImportPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900/95 border border-white/10 text-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                AI Transaction Import
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Paste transaction details below and let AI parse them automatically.
              </p>

              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className="w-full h-32 p-3 rounded-xl bg-white/10 text-white/90 border border-white/10 mb-4 resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Example: 'Transfer 500 to Savings for groceries on 2025-11-08'"
                disabled={importLoading}
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowImportPopup(false)}
                  className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition"
                  disabled={importLoading}
                >
                  Cancel
                </button>

                <button
                  onClick={CallAIbackendAPI}
                  disabled={importLoading}
                  className={`px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2 transition 
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
