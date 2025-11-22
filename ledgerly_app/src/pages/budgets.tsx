import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { getUserCategory } from "@/services/category";
import { Category } from "@/models/category";
import {
  getBudgets,
  createOrUpdateBudget,
  deleteBudget,
  copyPreviousBudgets,
} from "@/services/budget";
import { getBudgetUtilizations } from "@/services/budget";
import {
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import NeumorphicSelect from "@/components/NeumorphicSelect";
import ModernButton from "@/components/NeumorphicButton";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import NeumorphicInput from "@/components/NeumorphicInput";
import toast from "react-hot-toast";

// ------------------------------
// Types
// ------------------------------
type BudgetPeriod = "monthly" | "weekly" | "bi-weekly" | "yearly";

interface Budget {
  id?: string;
  categoryId: string;
  amount: string; // kept as string to match API
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  carriedOver?: boolean;
  spent?: number;
  updatedAt?: string;
}

// ------------------------------
// Helpers
// ------------------------------
const formatCurrency = (value: number | string) => {
  const n = Number(value) || 0;
  return `$${n.toLocaleString()}`;
};

const getEndDateFor = (period: BudgetPeriod, startIso: string) => {
  const start = dayjs(startIso);
  switch (period) {
    case "weekly":
      return start.endOf("week").format("YYYY-MM-DD");
    case "bi-weekly":
      return start.add(13, "day").format("YYYY-MM-DD");
    case "yearly":
      return start.endOf("year").format("YYYY-MM-DD");
    case "monthly":
    default:
      return start.endOf("month").format("YYYY-MM-DD");
  }
};

// ------------------------------
// UI pieces
// ------------------------------
function SkeletonCard() {
  return (
    <div className="animate-pulse p-5 rounded-2xl bg-white/6 backdrop-blur border border-white/6 h-40" />
  );
}

function BudgetCard({
  b,
  categoryName,
  onEdit,
  onDelete,
  disabled,
}: {
  b: Budget;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const spent = b.spent ?? 0;
  const amountNum = Number(b.amount) || 0;
  const percent = amountNum > 0 ? Math.min(100, Math.round((spent / amountNum) * 100)) : 0;
  const remaining = Math.max(0, amountNum - spent);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={clsx(
        "relative bg-white/10 backdrop-blur-lg p-5 rounded-3xl border border-white/10 shadow-lg flex flex-col gap-3",
        disabled && "opacity-70 pointer-events-none"
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white text-lg font-semibold">{categoryName ?? "Uncategorized"}</p>
          <p className="text-white/75 text-sm mt-1">
            {b.period} • {b.startDate} → {b.endDate}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            title="Edit"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
            aria-label={`Edit budget for ${categoryName ?? "category"}`}
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-red-400"
            aria-label={`Delete budget for ${categoryName ?? "category"}`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-3">
          <p className="text-white/90 font-semibold text-xl">{formatCurrency(amountNum)}</p>
          <p className="text-xs text-white/60">Allocated</p>
          {b.carriedOver && (
            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-full">
              Carry over
            </span>
          )}
        </div>

        <div className="mt-2 text-sm text-white/70">
          <span className="mr-3">Spent: {formatCurrency(spent)}</span>
          <span>Remaining: {formatCurrency(remaining)}</span>
        </div>
      </div>

      <div className="mt-auto">
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className={clsx("h-full transition-all", percent >= 100 ? "bg-red-500" : "bg-amber-400")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-white/60 text-xs mt-2">{percent}% used</p>
      </div>
    </motion.li>
  );
}

// ------------------------------
// Page
// ------------------------------
export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState<Budget>({
    categoryId: "",
    amount: "",
    period: "monthly",
    startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
  });
  const [carryOver, setCarryOver] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const mountedRef = useRef(false);

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name ?? "Unnamed"));
    return m;
  }, [categories]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, budgetRes] = await Promise.all([
        getUserCategory(),
        getBudgets(form.startDate, form.endDate, form.period),
      ]);
      // Prefer server-side aggregations when available. Request utilizations for the period
      // derive month/year from the start date (API expects month/year)
      const start = dayjs(form.startDate);
      const month = start.month() + 1; // dayjs months are 0-indexed
      const year = start.year();
      let spentMap = new Map<string, number>();
      try {
        const utils = await getBudgetUtilizations(month, year, form.period);
        (utils || []).forEach((u: any) => {
          if (!u || !u.categoryId) return;
          spentMap.set(u.categoryId, Number(u.spent) || 0);
        });
      } catch (err) {
        // fallback: if server aggregation fails, leave spentMap empty so budgets show 0
        console.warn("getBudgetUtilizations failed, falling back to 0 spent", err);
        spentMap = new Map();
      }
      setCategories(catRes);
      setBudgets((budgetRes || []).map((b: any) => ({
        id: b.id,
        categoryId: b.categoryId,
        amount: String(b.amount ?? b.value ?? "0"),
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
        carriedOver: !!b.carriedOver,
        // prefer backend-provided spent if present; otherwise use computed sum
        spent: typeof b.spent === "number" ? b.spent : (spentMap.get(b.categoryId) ?? 0),
        updatedAt: b.updatedAt,
      })));
    } catch (err) {
      console.error("Failed loading budgets", err);
      toast.error("Failed to load budgets. See console for details.");
    } finally {
      setLoading(false);
    }
  }, [form.endDate, form.period, form.startDate]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadData();
    } else {
      loadData();
    }
  }, [loadData]);

  // Open create modal with a sensible default category pre-selected if available
  const openCreateModal = useCallback(() => {
    setEditing(null);
    setForm((prev) => ({
      ...prev,
      categoryId: categories.length > 0 ? categories[0].id : "",
      amount: "",
      period: "monthly",
      startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
      endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
    }));
    setCarryOver(false);
    setModalOpen(true);
  }, [categories]);

  const openEditModal = useCallback((b: Budget) => {
    setEditing(b);
    setForm({ ...b });
    setCarryOver(!!b.carriedOver);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "period") {
      setForm((prev) => {
        const newPeriod = value as BudgetPeriod;
        return { ...prev, period: newPeriod, endDate: getEndDateFor(newPeriod, prev.startDate) };
      });
      return;
    }
    if (name === "startDate") {
      setForm((prev) => ({ ...prev, startDate: value, endDate: getEndDateFor(prev.period, value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!form.categoryId) {
        toast.error("Please select a category.");
        return;
      }
      // Prevent creating duplicate budgets: same category and same start/end dates
      const conflict = budgets.find((b) =>
        b.categoryId === form.categoryId &&
        b.startDate === form.startDate &&
        b.endDate === form.endDate &&
        // if editing, allow updating the same budget, but block if it's a different budget
        (editing ? b.id !== editing.id : true)
      );

      if (conflict) {
        toast.error("A budget for this category and date range already exists.");
        return;
      }
      if (!form.amount || Number(form.amount) <= 0) {
        toast.error("Please enter a valid positive amount.");
        return;
      }

      try {
        setActionLoading(true);
        await createOrUpdateBudget({ ...form, carriedOver: carryOver });
        await loadData();
        setModalOpen(false);
        setEditing(null);
      } catch (err) {
        console.error("Failed to save budget", err);
        toast.error("Failed to save budget. See console.");
      } finally {
        setActionLoading(false);
      }
    },
    [carryOver, form, loadData, budgets, editing]
  );

  const handleDelete = useCallback(
    async (id?: string) => {
      if (!id) return;
      if (!confirm("Delete this budget? This action cannot be undone.")) return;
      try {
        setActionLoading(true);
        await deleteBudget(id);
        await loadData();
      } catch (err) {
        console.error("Delete failed", err);
        toast.error("Delete Failed please try again.");
      } finally {
        setActionLoading(false);
      }
    },
    [loadData]
  );

  const handleCopyPrevious = useCallback(async () => {
    if (!confirm("Copy previous budgets into this period? Existing budgets may be duplicated.")) return;
    try {
      setActionLoading(true);
      await copyPreviousBudgets({ period: form.period, startDate: form.startDate, endDate: form.endDate });
      await loadData();
    } catch (err) {
      console.error("Copy previous budgets failed", err);
      toast.error("Copy Failed please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [form.endDate, form.period, form.startDate, loadData]);

  const isEmpty = !loading && budgets.length === 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1 drop-shadow">Budgets</h1>
            <p className="text-white/70">Create and manage your budgets </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1 shadow-inner relative">
              <motion.div
                layout
                className="absolute top-[6px] bottom-[6px] w-[48%] bg-white/14 rounded-xl shadow-md"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{ left: viewMode === "grid" ? 6 : "calc(50% + 6px)" }}
              />

              <label className="relative z-10 flex items-center gap-2 px-4 py-2 w-[120px] justify-center cursor-pointer select-none text-white font-semibold">
                <input
                  type="radio"
                  name="view-toggle"
                  value="grid"
                  checked={viewMode === "grid"}
                  onChange={() => setViewMode("grid")}
                  className="hidden"
                />
                🧾 Grid
              </label>

              <label className="relative z-10 flex items-center gap-2 px-4 py-2 w-[120px] justify-center cursor-pointer select-none text-white font-semibold">
                <input
                  type="radio"
                  name="view-toggle"
                  value="table"
                  checked={viewMode === "table"}
                  onChange={() => setViewMode("table")}
                  className="hidden"
                />
                📊 Table
              </label>
            </div>

            <ModernButton
              onClick={openCreateModal}
              color="indigo-600"
              variant="solid"
              size="md"
              leftIcon={<PlusIcon className="h-5 w-5" />}
            >
              New Budget
            </ModernButton>

            <ModernButton
              onClick={handleCopyPrevious}
              color="green-400"
              variant="outline"
              size="md"
              leftIcon={<ArrowPathIcon className="h-5 w-5" />}
              disabled={actionLoading}
            >
              Copy Prev
            </ModernButton>
          </div>
        </div>

        <div className="bg-white/8 backdrop-blur-lg p-6 rounded-2xl border border-white/10 mb-6 shadow-lg">
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              loadData();
            }}
          >
            <div>
              <label className="text-xs text-white/70 block mb-1">Start</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-white/6 text-black"
              />
             
            </div>

            <div>
              <label className="text-xs text-white/70 block mb-1">End</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-white/6 text-black"
              />
            </div>
            
            <div>
              <label className="text-xs text-white/70 block mb-1">Period</label>
              <NeumorphicSelect
                value={form.period}
                onChange={(v) =>
                  setForm((p) => ({ ...p, period: v as BudgetPeriod, endDate: getEndDateFor(v as BudgetPeriod, p.startDate) }))
                }
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "weekly", label: "Weekly" },
                  { value: "bi-weekly", label: "Bi-Weekly" },
                  { value: "yearly", label: "Yearly" },
                ]}
                placeholder="Period"
                theme="light"
              />
            </div>

            <div className="flex gap-2">
              <ModernButton type="submit" onClick={() => loadData()} color="indigo-500" variant="outline" size="md" disabled={loading}>
                Refresh
              </ModernButton>
              <ModernButton
                onClick={() => {
                  setForm((p) => ({
                    ...p,
                    startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
                    endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
                  }));
                }}
                color="yellow-400"
                variant="ghost"
                size="md"
              >
                This month
              </ModernButton>
            </div>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.ul
              key="grid"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {budgets.map((b) => (
                <BudgetCard
                  key={b.id}
                  b={b}
                  categoryName={categoryMap.get(b.categoryId)}
                  onEdit={() => openEditModal(b)}
                  onDelete={() => handleDelete(b.id)}
                  disabled={actionLoading}
                />
              ))}
            </motion.ul>
          ) : (
            <motion.div
              key="table"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="overflow-x-auto bg-white/6 backdrop-blur-lg rounded-2xl p-4"
            >
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="text-left text-white/80 text-sm">
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Spent</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Dates</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr key={b.id} className="border-t border-white/6">
                      <td className="px-3 py-2 text-white">{categoryMap.get(b.categoryId) || "Unknown"}</td>
                      <td className="px-3 py-2 text-white">{formatCurrency(b.amount)}</td>
                      <td className="px-3 py-2 text-white">{formatCurrency(b.spent ?? 0)}</td>
                      <td className="px-3 py-2 text-white/80">{b.period}</td>
                      <td className="px-3 py-2 text-white/60">{b.startDate} → {b.endDate}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openEditModal(b)} className="p-2 rounded-lg bg-white/6 hover:bg-white/8 transition text-white" aria-label="Edit budget">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(b.id)} className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 transition text-red-300" aria-label="Delete budget">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {isEmpty && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-white/70">
                        No budgets for this period. Click "New Budget" to create one or use "Copy Prev".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              key="modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ scale: 0.96, y: 8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.98, y: 6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="w-full max-w-lg bg-white/6 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-semibold text-white mb-4">{editing ? "Edit Budget" : "Create Budget"}</h3>
                  <button onClick={closeModal} className="text-white/60 hover:text-white">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-1 gap-3">
                  <label className="text-xs text-white/70">Category</label>

                  {categories.length > 0 ? (
                    <>
                      {/* Prefer NeumorphicSelect when available */}
                      <NeumorphicSelect
                        value={form.categoryId}
                        onChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
                        options={categories.map((c) => ({ value: c.id, label: c.name || "Unnamed" }))}
                        placeholder="Select Category"
                      />

                      {/* Native select fallback (keeps keyboard accessibility) */}
                      <div className="hidden">
                        <select
                          name="categoryId"
                          value={form.categoryId}
                          onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-md bg-white/6 text-white/80">
                      No categories found. Create a category first to assign budgets.
                      <div className="mt-3">
                        <a
                          href="/categories"
                          className="inline-block px-3 py-2 bg-indigo-600 text-white rounded-md text-sm"
                        >
                          Create Category
                        </a>
                      </div>
                    </div>
                  )}

                  <label className="text-xs text-white/70">Amount</label>
                  
                  <NeumorphicInput
                    value={form.amount}
                    onChange={(v: string) => setForm((p) => ({ ...p, amount: v }))}
                    placeholder="Amount"
                    type="number"
                    aria-label="Budget amount"
                  />

                  <label className="text-xs text-white/70">Period</label>
                  <NeumorphicSelect
                    value={form.period}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, period: v as BudgetPeriod, endDate: getEndDateFor(v as BudgetPeriod, p.startDate) }))
                    }
                    options={[
                      { value: "monthly", label: "Monthly" },
                      { value: "weekly", label: "Weekly" },
                      { value: "bi-weekly", label: "Bi-Weekly" },
                      { value: "yearly", label: "Yearly" },
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-white/70">Start</label>
                      <NeumorphicInput
                        value={form.startDate}
                        onChange={(v: string) => setForm((p) => ({ ...p, startDate: v, endDate: getEndDateFor(p.period, v) }))}
                        type="date"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/70">End</label>
                      <NeumorphicInput
                        value={form.endDate}
                        onChange={(v: string) => setForm((p) => ({ ...p, endDate: v }))}
                        type="date"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input id="carry" type="checkbox" checked={carryOver} onChange={() => setCarryOver((c) => !c)} className="h-5 w-5 accent-yellow-300" />
                    <label htmlFor="carry" className="text-white/80 text-sm">Carry Over Unused</label>
                  </div>

                  <div className="flex gap-3 justify-end mt-4">
                    <ModernButton onClick={closeModal} variant="ghost" color="gray-400" disabled={actionLoading}>
                      Cancel
                    </ModernButton>

                    <ModernButton
                      type="button"
                      onClick={() => handleSubmit()}
                      leftIcon={<CheckIcon className="h-4 w-4" />}
                      color="yellow-400"
                      disabled={actionLoading || categories.length === 0}
                    >
                      {editing ? "Update Budget" : "Create Budget"}
                    </ModernButton>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}