import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Layout from "../components/Layout";
import { getUserCategory } from "@/services/category";
import { Category } from "@/models/category";
import { getBudgets, createOrUpdateBudget, deleteBudget ,copyPreviousBudgets } from "../services/budget";
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import dayjs from "dayjs";

type BudgetPeriod = "monthly" | "weekly" | "bi-weekly" | "yearly";

interface Budget {
  id?: string;
  categoryId: string;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  carriedOver?: boolean;
}

export default function Budgets() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [form, setForm] = useState<Budget>({
    categoryId: "",
    amount: "",
    period: "monthly",
    startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
  });
  const [carryOver, setCarryOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Utils for calculating end date based on period ---
  const getEndDate = (period: BudgetPeriod, startDate: string) => {
    const start = dayjs(startDate);
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

  const loadData = async () => {
    const catRes = await getUserCategory();
    setCategories(catRes);
    const budgetRes = await getBudgets(form.startDate, form.endDate, form.period);
    setBudgets(budgetRes.data);
  };

  useEffect(() => {
    loadData();
  }, [form.startDate, form.endDate, form.period]);

  // --- Form change handling ---
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "period") {
      const newEndDate = getEndDate(value as BudgetPeriod, form.startDate);
      setForm((prev) => ({ ...prev, period: value as BudgetPeriod, endDate: newEndDate }));
    } else if (name === "startDate") {
      const newEndDate = getEndDate(form.period, value);
      setForm((prev) => ({ ...prev, startDate: value, endDate: newEndDate }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.categoryId || !form.amount) return alert("Select category and enter amount");

    await createOrUpdateBudget({ ...form, carriedOver: carryOver });
    setForm((prev) => ({ ...prev, amount: "" }));
    setCarryOver(false);
    loadData();
  };

  const handleCopyPrevious = async () => {
    //console.log(form.period);
     const data = {
    period: form.period,
    startDate: form.startDate,
    endDate: form.endDate
  };

    await copyPreviousBudgets(data);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    await deleteBudget(id);
    loadData();
  };

  const handleEditSave = async (b: Budget) => {
    await createOrUpdateBudget(b);
    setEditingId(null);
    loadData();
  };

  return (
  <Layout>
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-6 px-4">
      
      <h1 className="text-3xl font-bold text-white mb-6">Budgets</h1>

      {/* --- Create / Update Form --- */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Add New Budget Category
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <input
            type="number"
            name="amount"
            placeholder="Budget Amount"
            value={form.amount}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50"
          />

          <select
            name="period"
            value={form.period}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg bg-white/20 text-white"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="bi-weekly">Bi-Weekly</option>
            <option value="yearly">Yearly</option>
          </select>

          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg bg-white/20 text-white"
          />

          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
            className="px-4 py-3 rounded-lg bg-white/20 text-white"
          />

          {/* Carry Over Checkbox */}
          <div className="flex items-center gap-2 md:col-span-3">
            <input
              type="checkbox"
              checked={carryOver}
              onChange={() => setCarryOver(!carryOver)}
              className="accent-yellow-300 h-5 w-5"
              id="carryOver"
            />
            <label htmlFor="carryOver" className="text-white text-sm">
              Carry Over Unused
            </label>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3 bg-yellow-300 text-indigo-900 font-semibold rounded-lg hover:bg-yellow-400 transition md:col-span-3"
          >
            Save Budget
          </button>
        </form>
      </div>

      {/* Copy Previous Period Button */}
      <button
        onClick={handleCopyPrevious}
        className="mb-6 px-4 py-2 bg-green-400 text-indigo-900 font-semibold rounded-lg hover:bg-green-500 transition"
      >
        Copy Previous Period Budgets
      </button>

      {/* --- Budget List --- */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {budgets.map((b) => {
          const category = categories.find(c => c.id === b.categoryId);
          const isEditing = editingId === b.id;

          return (
                  <li
                    key={b.id}
                    className="
                      group
                      bg-white/60 backdrop-blur-xl
                      p-5 rounded-2xl
                      border border-gray-200/60
                      shadow-md hover:shadow-xl
                      transition-all duration-300
                      hover:-translate-y-1
                      flex flex-col
                      gap-3
                    "
                  >
                    {isEditing ? (
                      <>
                        {/* Category Select */}
                        <div className="space-y-1">
                          <label className="text-sm text-gray-700 font-medium">Category</label>
                          <select
                            value={b.categoryId}
                            onChange={(e) =>
                              setBudgets(prev =>
                                prev.map(x => x.id === b.id ? { ...x, categoryId: e.target.value } : x)
                              )
                            }
                            className="
                              w-full px-3 py-2 rounded-xl
                              bg-white/80 backdrop-blur
                              border border-gray-300
                              focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                              transition
                              text-gray-900
                            "
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1">
                          <label className="text-sm text-gray-700 font-medium">Amount</label>
                          <input
                            type="number"
                            value={b.amount}
                            onChange={(e) =>
                              setBudgets(prev =>
                                prev.map(x => x.id === b.id ? { ...x, amount: e.target.value } : x)
                              )
                            }
                            className="
                              w-full px-3 py-2 rounded-xl
                              bg-white/80 backdrop-blur
                              border border-gray-300
                              focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                              transition
                              text-gray-900
                            "
                          />
                        </div>

                        {/* Save / Cancel */}
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => handleEditSave(b)}
                            className="
                              p-2 rounded-xl bg-green-100 text-green-700
                              hover:bg-green-200 transition
                            "
                            title="Save"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>

                          <button
                            onClick={() => setEditingId(null)}
                            className="
                              p-2 rounded-xl bg-gray-100 text-gray-600
                              hover:bg-gray-200 transition
                            "
                            title="Cancel"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Category name */}
                        <p className="font-semibold text-gray-900 text-lg tracking-wide">
                          {category ? category.name : "Unknown"}
                        </p>

                        {/* Amount */}
                        <p className="text-gray-700 text-base font-medium">
                          Budget: <span className="text-blue-600 font-semibold">${b.amount}</span>
                        </p>

                        {/* Period */}
                        <p className="text-gray-500 text-sm">
                          Period: <span className="font-medium text-gray-700">{b.period}</span>
                        </p>

                        {/* Dates */}
                        <p className="text-gray-400 text-xs">
                          {b.startDate} → {b.endDate}
                        </p>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 mt-4 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => setEditingId(b.id!)}
                            className="
                              p-2 rounded-xl bg-blue-50 text-blue-600
                              hover:bg-blue-100 transition
                            "
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>

                          <button
                            onClick={() => handleDelete(b.id!)}
                            className="
                              p-2 rounded-xl bg-red-50 text-red-600
                              hover:bg-red-100 transition
                            "
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>


          );
        })}
      </ul>
    </div>
  </Layout>
);
}
