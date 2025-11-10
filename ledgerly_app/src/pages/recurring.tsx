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

export default function Recurring() {
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
    await deleteRecurring(id);
    toast.success("Recurring transaction deleted");
    await load();
  };

  const handlePauseResume = async (id: string, current: string) => {
    await updateRecurring(id, { status: current === "active" ? "paused" : "active" });
    toast.success(current === "active" ? "Paused!" : "Resumed!");
    await load();
  };

  const openModal = (tx?: RecurringTransaction) => {
    if (tx) {
      setEditingId(tx.id);
      setForm(tx);
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2">
        <div className="mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Recurring Transactions</h1>

          <div className="flex justify-end mb-4">
            <button
              onClick={() => openModal()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              + Add Recurring
            </button>
          </div>

          <div className="rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-4">
            <ul className="flex flex-wrap gap-4">
              {transactions.map((tx) => {
              const account = accounts.find(a => a.id === tx.accountId);
              const category = categories.find(c => c.id === tx.categoryId);
              return (
  <li
    key={tx.id}
    className="group relative bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 border border-white/10 
               rounded-2xl p-5 shadow-md hover:shadow-lg hover:shadow-blue-500/10 
               transition-all duration-300 flex justify-between items-start gap-4"
  >
    {/* Left side: transaction details */}
    <div className="space-y-1.5">
      <p className="text-base font-semibold text-white/90 tracking-tight">
        {tx.description || "(No description)"}{" "}
        <span className="text-blue-400 font-bold">₹{tx.amount}</span>
      </p>

      <div className="text-sm text-gray-400 flex flex-wrap gap-2">
        <span>
          Frequency: <span className="text-gray-200">{tx.frequency}</span>
        </span>
        <span>•</span>
        <span>
          Type:{" "}
          <span
            className={`font-medium ${
              tx.type === "income" ? "text-green-400" : "text-red-400"
            }`}
          >
            {tx.type}
          </span>
        </span>
        <span>•</span>
        <span>
          Status:{" "}
          <span
            className={`font-semibold ${
              tx.status === "active"
                ? "text-emerald-400"
                : "text-yellow-400"
            }`}
          >
            {tx.status}
          </span>
        </span>
      </div>

      <p className="text-sm text-gray-400">
        Next Occurrence:{" "}
        <span className="text-gray-200 font-medium">
          {tx.nextOccurrence}
        </span>
      </p>

      <p className="text-sm text-gray-400">
        Account: <span className="text-gray-200 font-medium">{account?.name}</span>
      </p>

      <p className="text-sm text-gray-400">
        Category: <span className="text-gray-200 font-medium">{category?.name}</span>
      </p>
    </div>

    {/* Right side: action buttons */}
    <div className="flex items-center gap-1">
      <button
        onClick={() => openModal(tx)}
        className="p-2 rounded-full hover:bg-white/10 transition-transform hover:scale-110 text-yellow-400"
        title="Edit"
      >
        ✏️
      </button>

      <button
        onClick={() => handlePauseResume(tx.id, tx.status)}
        className="p-2 rounded-full hover:bg-white/10 transition-transform hover:scale-110 text-blue-400"
        title={tx.status === "active" ? "Pause" : "Resume"}
      >
        {tx.status === "active" ? (
          <PauseIcon className="h-5 w-5" />
        ) : (
          <PlayIcon className="h-5 w-5" />
        )}
      </button>

      <button
        onClick={() => handleDelete(tx.id)}
        className="p-2 rounded-full hover:bg-white/10 transition-transform hover:scale-110 text-red-400"
        title="Delete"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>

    {/* Glow border on hover */}
    <div className="absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-blue-500/30 transition-all duration-300" />
  </li>
);              })}
            </ul>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 w-full max-w-md">
            <h2 className="text-white text-xl font-bold mb-4">
              {editingId ? "Edit Recurring" : "Add Recurring"}
            </h2>

            <form onSubmit={handleCreateOrUpdate} className="flex flex-col gap-4">
              {/* Account */}
              <select
                name="accountId"
                value={form.accountId ?? ""}
                onChange={handleChange}
                className="p-2 rounded-lg text-black"
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
                className="p-2 rounded-lg text-black"
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
                className="p-2 rounded-lg text-black"
                value={form.type ?? "expense"}
                onChange={handleChange}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              {/* Frequency */}
              <select
                name="frequency"
                className="p-2 rounded-lg text-black"
                value={form.frequency ?? "monthly"}
                onChange={handleChange}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {/* Amount */}
              <input
                name="amount"
                className="p-2 rounded-lg text-black"
                placeholder="Amount"
                type="number"
                value={form.amount ?? ""}
                onChange={handleChange}
              />

              {/* Next Occurrence */}
              <input
                name="nextOccurrence"
                type="date"
                className="p-2 rounded-lg text-black"
                value={form.nextOccurrence ?? ""}
                onChange={handleChange}
              />

              {/* Description */}
              <textarea
                name="description"
                className="p-2 rounded-lg text-black"
                placeholder="Description"
                value={form.description ?? ""}
                onChange={handleChange}
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-800 flex-1"
                >
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-700 flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
