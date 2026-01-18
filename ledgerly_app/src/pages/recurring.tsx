import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Layout from "../components/Layout";
import toast from "react-hot-toast";
import {
  getRecurringTransactions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  triggerRecurring,
} from "../services/recurring";
import { getUserAccount } from "../services/accounts";
import { getUserCategory } from "../services/category";
import { RecurringTransaction } from "../models/recurring";
import { TrashIcon, PauseIcon, PlayIcon, BoltIcon } from "@heroicons/react/24/solid";
import ConfirmModal from "@/components/ConfirmModal";
import TagInput from "@/components/TagInput";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function Recurring() {
  const { format } = useCurrencyFormatter();
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Helper function to get color for transaction type
  const getTypeColor = (type: string) => {
    if (type === "income") return "var(--color-success)";
    if (type === "transfer" || type === "savings") return "var(--color-info)";
    return "var(--color-error)";
  };

  // Helper to check if transaction is due soon (within 7 days)
  const isDueSoon = (nextOccurrence: string) => {
    const next = new Date(nextOccurrence);
    const today = new Date();
    const diffTime = next.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  // Helper to check if transaction is overdue
  const isOverdue = (nextOccurrence: string) => {
    const next = new Date(nextOccurrence);
    const today = new Date();
    return next < today;
  };

  // Helper to check if transaction was completed this month
  const isCompletedThisMonth = (nextOccurrence: string, frequency: string) => {
    const next = new Date(nextOccurrence);
    const today = new Date();
    
    if (frequency === 'monthly') {
      // If next occurrence is in the future and it's a different month, transaction was done this month
      return next > today && next.getMonth() !== today.getMonth();
    } else if (frequency === 'weekly') {
      // For weekly, check if next occurrence is in the future
      const daysDiff = getDaysUntil(nextOccurrence);
      return daysDiff > 0 && daysDiff < 7;
    }
    return false;
  };

  // Helper to get days until next occurrence
  const getDaysUntil = (nextOccurrence: string) => {
    const next = new Date(nextOccurrence);
    const today = new Date();
    const diffTime = next.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const [form, setForm] = useState<Partial<RecurringTransaction>>({
    accountId: "",
    categoryId: "",
    amount: "",
    frequency: "monthly",
    type: "expense",
    nextOccurrence: "",
    description: "",
    status: "active",
    toAccountId: "",
    tagIds: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pauseResumeConfirm, setPauseResumeConfirm] = useState<{ id: string; status: string } | null>(null);
  const [triggerConfirm, setTriggerConfirm] = useState<string | null>(null);

  // Load recurring transactions
  const load = async () => {
    try {
      const res = await getRecurringTransactions();
      setTransactions(res);
    } catch (error) {
      console.error("Failed to load recurring transactions:", error);
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
      } catch (error) {
        console.error("Failed to load accounts or categories:", error);
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

    // Validate transfer/savings requires destination account
    if ((form.type === "transfer" || form.type === "savings") && !form.toAccountId) {
      toast.error("Please select a destination account for transfer/savings.");
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
        toAccountId: "",
        tagIds: [],
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

  const handleTriggerNow = async (id: string) => {
    try {
      await triggerRecurring(id);
      toast.success("Recurring transaction triggered successfully!");
      await load();
    } catch (err) {
      console.error("Trigger failed", err);
      toast.error("Trigger failed. Please try again.");
    } finally {
      setTriggerConfirm(null);
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
      toAccountId: tx.toAccountId ?? "",
      tagIds: tx.tags?.map(t => t.id) || [],
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
      toAccountId: "",
      tagIds: [],
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
              const toAccount = accounts.find(a => a.id === tx.toAccountId);
              const category = categories.find(c => c.id === tx.categoryId);
              const daysUntil = getDaysUntil(tx.nextOccurrence);
              const dueSoon = isDueSoon(tx.nextOccurrence);
              const overdue = isOverdue(tx.nextOccurrence);
              const completedThisMonth = tx.status === "active" && isCompletedThisMonth(tx.nextOccurrence, tx.frequency);
              
              return (
  <li
    key={tx.id}
    className="group relative rounded-2xl p-5 shadow-md transition-all duration-300 flex justify-between items-start gap-4"
    style={{
      background: "var(--bg-card-hover)",
      border: `2px solid ${
        tx.status === "paused" 
          ? "var(--color-warning)" 
          : overdue 
          ? "var(--color-error)" 
          : dueSoon 
          ? "var(--accent-primary)" 
          : completedThisMonth
          ? "var(--color-success)"
          : "var(--border-secondary)"
      }`,
    }}
  >
    {/* Status Badge - Top Left Corner (moved to avoid overlap) */}
    <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[50%]">
      {tx.status === "paused" && (
        <span 
          className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ 
            background: "var(--color-warning)20", 
            color: "var(--color-warning)",
            border: "1px solid var(--color-warning)"
          }}
        >
          ⏸ Paused
        </span>
      )}
      {tx.status === "active" && overdue && (
        <span 
          className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ 
            background: "var(--color-error)20", 
            color: "var(--color-error)",
            border: "1px solid var(--color-error)"
          }}
        >
          ⚠ Overdue
        </span>
      )}
      {tx.status === "active" && completedThisMonth && !overdue && (
        <span 
          className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ 
            background: "var(--color-success)20", 
            color: "var(--color-success)",
            border: "1px solid var(--color-success)"
          }}
        >
          ✓ Completed
        </span>
      )}
      {tx.status === "active" && dueSoon && !overdue && !completedThisMonth && (
        <span 
          className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ 
            background: "var(--accent-primary)20", 
            color: "var(--accent-primary)",
            border: "1px solid var(--accent-primary)"
          }}
        >
          🔔 Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
        </span>
      )}
    </div>

    {/* Left side: transaction details */}
    <div className="space-y-2 flex-1 pr-20 mt-10">{/* Added mt-10 for spacing from top badges */}
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {tx.description || "(No description)"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span style={{ color: getTypeColor(tx.type) }} className="text-2xl font-bold">
          {format(tx.amount)}
        </span>
        <span 
          className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
          style={{ 
            background: getTypeColor(tx.type) + "20",
            color: getTypeColor(tx.type)
          }}
        >
          {tx.type}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <span className="font-medium">📅</span>
          <span style={{ color: "var(--text-secondary)" }}>{tx.frequency}</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="font-medium">📆</span>
          Next: <span style={{ color: overdue ? "var(--color-error)" : "var(--text-secondary)" }} className="font-medium">
            {tx.nextOccurrence}
          </span>
        </span>
      </div>

      <div className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
        <p>
          <span className="font-medium">From:</span>{" "}
          <span style={{ color: "var(--text-secondary)" }}>{account?.name || 'N/A'}</span>
        </p>

        {(tx.type === "transfer" || tx.type === "savings") && (
          <p>
            <span className="font-medium">To:</span>{" "}
            <span style={{ color: "var(--text-secondary)" }}>{toAccount?.name || 'N/A'}</span>
          </p>
        )}

        <p>
          <span className="font-medium">Category:</span>{" "}
          <span style={{ color: "var(--text-secondary)" }}>{category?.name || 'N/A'}</span>
        </p>
      </div>

      {/* Display tags */}
      {tx.tags && tx.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tx.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: tag.color + "20",
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>

    {/* Right side: action buttons */}
    <div className="flex flex-col gap-2 absolute bottom-3 right-3">
      <button
        onClick={() => openModal(tx)}
        className="p-2 rounded-lg transition-all hover:scale-110 hover:shadow-lg"
        style={{ background: "var(--accent-primary)20", color: "var(--accent-primary)" }}
        title="Edit"
      >
        ✏️
      </button>

      <button
        onClick={() => setTriggerConfirm(tx.id)}
        className="p-2 rounded-lg transition-all hover:scale-110 hover:shadow-lg"
        style={{ background: "var(--color-warning)20", color: "var(--color-warning)" }}
        title="Trigger Now"
      >
        <BoltIcon className="h-5 w-5" />
      </button>

      <button
        onClick={() => setPauseResumeConfirm({ id: tx.id, status: tx.status })}
        className="p-2 rounded-lg transition-all hover:scale-110 hover:shadow-lg"
        style={{ background: "var(--color-info)20", color: "var(--color-info)" }}
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
        className="p-2 rounded-lg transition-all hover:scale-110 hover:shadow-lg"
        style={{ background: "var(--color-error)20", color: "var(--color-error)" }}
        title="Delete"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>

    {/* Glow border on hover */}
    <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-blue-500/30 
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
                <option value="transfer">Transfer</option>
                <option value="savings">Savings</option>
              </select>

              {/* Account */}
              <select
                name="accountId"
                value={form.accountId ?? ""}
                onChange={handleChange}
                className="p-2 rounded-lg"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="">Select {form.type === "transfer" || form.type === "savings" ? "From " : ""}Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>

              {/* To Account (only for transfer/savings) */}
              {(form.type === "transfer" || form.type === "savings") && (
                <select
                  name="toAccountId"
                  value={form.toAccountId ?? ""}
                  onChange={handleChange}
                  className="p-2 rounded-lg"
                  style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                >
                  <option value="">Select To Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              )}

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

              {/* Tags */}
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Tags (optional)
                </label>
                <TagInput
                  value={form.tagIds || []}
                  onChange={(tagIds) => setForm(prev => ({ ...prev, tagIds }))}
                />
              </div>

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

      <ConfirmModal
        open={!!triggerConfirm}
        title="Trigger Recurring Transaction Now"
        description="This will create a transaction immediately and update the next occurrence date. Continue?"
        confirmLabel="Trigger Now"
        confirmColor="yellow-500"
        loading={false}
        onConfirm={() => handleTriggerNow(triggerConfirm!)}
        onClose={() => setTriggerConfirm(null)}
      />
    </Layout>
  );
}
