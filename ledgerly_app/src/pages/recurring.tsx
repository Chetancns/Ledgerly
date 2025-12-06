import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Layout from "../components/Layout";
import toast from "react-hot-toast";
import {
  getRecurringTransactions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from "../services/recurring";
import { getUserAccount } from "../services/accounts";
import { getUserCategory } from "../services/category";
import { Frequency, RecurringTransaction, TxType } from "../models/recurring";
import { TrashIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import ConfirmModal from "@/components/ConfirmModal";
import { useTheme } from "@/context/ThemeContext";

export default function Recurring() {
  const { theme } = useTheme();
  const { format } = useCurrencyFormatter();
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<Partial<RecurringTransaction>>({
    accountId: "",
    categoryId: "",
    amount: "",
    frequency: "monthly",
    type: "expense",
    nextOccurrence: "",
    description: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pauseResumeConfirm, setPauseResumeConfirm] = useState<{ id: string; status: string } | null>(null);

  // Load recurring transactions
  const load = async () => {
    try {
      const res = await getRecurringTransactions();
      setTransactions(res);
    } catch (err) {
      toast.error("Failed to load recurring transactions");
    }
  };

  // Fetch accounts & categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, catRes] = await Promise.all([getUserAccount(), getUserCategory()]);
        setAccounts(accRes);
        setCategories(catRes);
      } catch (err) {
        toast.error("Failed to load accounts or categories");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.accountId || !form.categoryId) {
      toast.error("Please select both account and category.");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateRecurring(editingId, form);
        toast.success("Recurring transaction updated!");
      } else {
        await createRecurring(form);
        toast.success("Recurring transaction added!");
      }

      setShowModal(false);
      setEditingId(null);
      setForm({
        accountId: "",
        categoryId: "",
        amount: "",
        frequency: "monthly",
        type: "expense",
        nextOccurrence: "",
        description: "",
        status: "active",
      });
      await load();
    } catch {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurring(id);
      toast.success("Recurring transaction deleted");
      await load();
    } catch (err) {
      console.error("Delete recurring failed", err);
      toast.error("Delete failed. Please try again.");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handlePauseResume = async (id: string, current: string) => {
    try {
      await updateRecurring(id, { status: current === "active" ? "paused" : "active" });
      toast.success(current === "active" ? "Paused!" : "Resumed!");
      await load();
    } catch (err) {
      console.error("Pause/Resume failed", err);
      toast.error("Action failed. Please try again.");
    } finally {
      setPauseResumeConfirm(null);
    }
  };

  const openModal = (tx?: RecurringTransaction) => {
  if (tx) {
    setEditingId(tx.id);

    setForm({
      accountId: tx.accountId ?? "",
      categoryId: tx.categoryId ?? "",
      amount: tx.amount ?? "",
      frequency: tx.frequency ?? "monthly",
      type: tx.type ?? "expense",
      nextOccurrence: tx.nextOccurrence
        ? tx.nextOccurrence.split("T")[0]   // important! fix date
        : "",
      description: tx.description ?? "",
      status: tx.status ?? "active",
    });
  } else {
    setEditingId(null);
    setForm({
      accountId: "",
      categoryId: "",
      amount: "",
      frequency: "monthly",
      type: "expense",
      nextOccurrence: "",
      description: "",
      status: "active",
    });
  }

  setShowModal(true);
};


  return (
    <Layout>
      <div className="min-h-screen py-5 px-2" style={{ color: "var(--text-primary)" }}>
          <h1 className="text-3xl font-bold m-4" style={{ color: "var(--text-primary)" }}>Recurring Transactions</h1>

          <div className="flex justify-end mb-4 px-4">
            <button
              onClick={() => openModal()}
              className="px-4 py-2 rounded-lg transition"
              style={{ background: "var(--accent-secondary)", color: "var(--text-primary)" }}
            >
              + Add Recurring
            </button>
          </div>

          <div 
            className="rounded-2xl shadow-2xl p-4 backdrop-blur-lg"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <ul className="flex flex-wrap gap-4">
              {transactions.map((tx) => {
              const account = accounts.find(a => a.id === tx.accountId);
              const category = categories.find(c => c.id === tx.categoryId);
              return (
  <li
    key={tx.id}
    className="group relative rounded-2xl p-5 shadow-md transition-all duration-300 flex justify-between items-start gap-4"
    style={{
      background: "var(--bg-card-hover)",
      border: "1px solid var(--border-secondary)",
    }}
  >
    {/* Left side: transaction details */}
    <div className="space-y-1.5">
      <p className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
        {tx.description || "(No description)"}{" "}
        <span style={{ color: "var(--color-info)" }} className="font-bold">{format(tx.amount)}</span>
      </p>

      <div className="text-sm flex flex-wrap gap-2" style={{ color: "var(--text-muted)" }}>
        <span>
          Frequency: <span style={{ color: "var(--text-secondary)" }}>{tx.frequency}</span>
        </span>
        <span>•</span>
        <span>
          Type:{" "}
          <span
            style={{ color: tx.type === "income" ? "var(--color-success)" : "var(--color-error)" }}
            className="font-medium"
          >
            {tx.type}
          </span>
        </span>
        <span>•</span>
        <span>
          Status:{" "}
          <span
            className="font-semibold"
            style={{ color: tx.status === "active" ? "var(--color-success)" : "var(--color-warning)" }}
          >
            {tx.status}
          </span>
        </span>
      </div>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Next Occurrence:{" "}
        <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
          {tx.nextOccurrence}
        </span>
      </p>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Account: <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{account?.name}</span>
      </p>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Category: <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{category?.name}</span>
      </p>
    </div>

    {/* Right side: action buttons */}
    <div className="flex items-center gap-1">
      <button
        onClick={() => openModal(tx)}
        className="p-2 rounded-full transition-transform hover:scale-110"
        style={{ color: "var(--accent-primary)" }}
        title="Edit"
      >
        ✏️
      </button>

      <button
        onClick={() => setPauseResumeConfirm({ id: tx.id, status: tx.status })}
        className="p-2 rounded-full transition-transform hover:scale-110"
        style={{ color: "var(--color-info)" }}
        title={tx.status === "active" ? "Pause" : "Resume"}
      >
        {tx.status === "active" ? (
          <PauseIcon className="h-5 w-5" />
        ) : (
          <PlayIcon className="h-5 w-5" />
        )}
      </button>

      <button
        onClick={() => setDeleteConfirm(tx.id)}
        className="p-2 rounded-full transition-transform hover:scale-110"
        style={{ color: "var(--color-error)" }}
        title="Delete"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>

    {/* Glow border on hover */}
    <div className="absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-blue-500/30 
     transition-all duration-300 pointer-events-none" />
  </li>
);              })}
            </ul>
          </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="backdrop-blur-lg p-6 rounded-xl w-full max-w-md"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              {editingId ? "Edit Recurring" : "Add Recurring"}
            </h2>

            <form onSubmit={handleCreateOrUpdate} className="flex flex-col gap-4">
              {/* Account */}
              <select
                name="accountId"
                value={form.accountId ?? ""}
                onChange={handleChange}
                className="p-2 rounded-lg"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>

              {/* Category */}
              <select
                name="categoryId"
                value={form.categoryId ?? ""}
                onChange={handleChange}
                className="p-2 rounded-lg"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.type === "income" ? "💰" : "💸"} {cat.name}
                  </option>
                ))}
              </select>

              {/* Type */}
              <select
                name="type"
                className="p-2 rounded-lg"
                value={form.type ?? "expense"}
                onChange={handleChange}
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              {/* Frequency */}
              <select
                name="frequency"
                className="p-2 rounded-lg"
                value={form.frequency ?? "monthly"}
                onChange={handleChange}
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {/* Amount */}
              <input
                name="amount"
                className="p-2 rounded-lg"
                placeholder="Amount"
                type="number"
                value={form.amount ?? ""}
                onChange={handleChange}
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              />

              {/* Next Occurrence */}
              <input
                name="nextOccurrence"
                type="date"
                className="p-2 rounded-lg"
                value={form.nextOccurrence ?? ""}
                onChange={handleChange}
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              />

              {/* Description */}
              <textarea
                name="description"
                className="p-2 rounded-lg"
                placeholder="Description"
                value={form.description ?? ""}
                onChange={handleChange}
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="p-2 rounded-lg flex-1 font-semibold"
                  style={{ background: "var(--accent-secondary)", color: "var(--text-primary)" }}
                >
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg flex-1"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmations */}
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Recurring"
        description="Delete this recurring transaction? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="red-500"
        loading={false}
        onConfirm={() => handleDelete(deleteConfirm!)}
        onClose={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={!!pauseResumeConfirm}
        title={pauseResumeConfirm?.status === "active" ? "Pause Recurring" : "Resume Recurring"}
        description={pauseResumeConfirm?.status === "active" ? "Pause this recurring transaction?" : "Resume this recurring transaction?"}
        confirmLabel={pauseResumeConfirm?.status === "active" ? "Pause" : "Resume"}
        confirmColor={pauseResumeConfirm?.status === "active" ? "yellow-400" : "green-500"}
        loading={false}
        onConfirm={() => handlePauseResume(pauseResumeConfirm!.id, pauseResumeConfirm!.status)}
        onClose={() => setPauseResumeConfirm(null)}
      />
    </Layout>
  );
}
