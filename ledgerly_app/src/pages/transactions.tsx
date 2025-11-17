import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import TransactionForm from "../components/TransactionForm";
import { getTransactions, onDelete ,getFilterTransactions} from "../services/transactions";
import { Transaction, TransactionType } from "@/models/Transaction";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";
import { TrashIcon } from '@heroicons/react/24/solid';
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {motion,AnimatePresence} from "framer-motion";
import clsx from "clsx";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [typeSummary, setTypeSummary] = useState<Partial<Record<TransactionType, number>>>({});
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
  };
  const formatDateForUI = (dateString: string) => {  
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };
  // Load setting on mount
    useEffect(() => {
      const saved = localStorage.getItem("viewMode");
      if (saved === "list" || saved === "table") {
        setViewMode(saved);
      }else {
        setViewMode("list");
      }
    }, []);

    // Save when changed
    useEffect(() => {
      localStorage.setItem("viewMode", viewMode);
    }, [viewMode]);
  
  const tLabels: Record<TransactionType, string> = {
    income: 'Income',
    expense: 'Expense',
    savings: 'Savings',
    transfer: 'Transfer',
  };

  const typeStyleMap: Record<TransactionType, string> = {
    income: 'bg-green-100 text-green-600',
    savings: 'bg-green-100 text-green-600',
    expense: 'bg-red-100 text-red-600',
    transfer: 'bg-blue-100 text-blue-600',
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    await fetchTransaction();
    setDeletingId(null);
  };

  const load = async () => {
    const [ accRes, catRes] = await Promise.all([
      //fetchTransaction(),
      getUserAccount(),
      getUserCategory()
    ]);
    setAccounts(accRes);
    setCategories(catRes);
  };
  const toastId = "fetch-transactions-toast";
  const fetchTransaction = useCallback(() => {
    const controller = new AbortController(); // optional: for cancellation
    const fetchData = async () => {
      toast.loading("Loading transactions...", { id: toastId });

      try {
        const date = `${selectedYear}-${selectedMonth}-01`;
        const dayjsDate = dayjs(date);
        if (!dayjsDate.isValid()) {
          throw new Error(`Invalid date: ${date}`);
        }

        const from = dayjsDate.startOf('month');
        const to = dayjsDate.endOf('month');

        const filters: Record<string, any> = {
          from: from.format('YYYY-MM-DD'),
          to: to.format('YYYY-MM-DD'),
        };

        if (selectedAccount !== 'all') {
          filters.accountId = selectedAccount;
        }

        if (selectedCategory !== 'all') {
          filters.categoryId = selectedCategory;
        }

        const [txRes] = await Promise.all([
          getFilterTransactions(filters, { signal: controller.signal }),
        ]);
        setTransactions(txRes.data);
        const summary = txRes.data.reduce((acc: { [x: string]: any; }, tx: { amount: any; type: string | number; }) => {
          const amt = Number(tx.amount) || 0;
          acc[tx.type] = (acc[tx.type] || 0) + amt;
          return acc;
        }, {} as Record<TransactionType, number>);
        setTypeSummary(summary);
        toast.dismiss(toastId);

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error loading transactions', err);
          toast.dismiss(toastId);
          toast.error('Failed to load transactions ❌');
        }
      }
      return () => controller.abort();
    };

    fetchData();
  }, [selectedMonth, selectedYear, selectedAccount, selectedCategory]);

  // Debounce logic
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTransaction();
    }, 400); // adjust delay as needed
  }, [fetchTransaction]);

  useEffect(() => {
    load();
  }, []);

  // useEffect(() => {
  //   fetchTransaction();
  // }, [selectedMonth, selectedYear, selectedAccount, selectedCategory]);

  return (
  <Layout>
    <div className="mx-auto p-4">

      {/* Header */}
      <h1 className="text-4xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg">
        Transactions
      </h1>

      {/* Transaction Form */}
      <div className="mb-6">
        {editingTransaction ? (
          <TransactionForm
            transaction={editingTransaction}
            onUpdated={fetchTransaction}
            onCancel={() => setEditingTransaction(null)}
            onCreated={fetchTransaction}
          />
        ) : (
          <TransactionForm onCreated={fetchTransaction} />
        )}
      </div>

      {/* --- Filters + Summary --- */}
      <div className="
        bg-white/10 backdrop-blur-2xl shadow-xl
        rounded-3xl border border-white/20
        p-6 mb-6
      ">
        <div className="flex flex-wrap items-end gap-6">

          {/* Filter Select Field */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="
                bg-white/20 backdrop-blur-xl border border-white/30
                px-3 py-2 rounded-xl text-black
                hover:bg-white/30 transition
              "
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="
                bg-white/20 backdrop-blur-xl border border-white/30
                px-3 py-2 rounded-xl text-black
                hover:bg-white/30 transition
              "
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = today.getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          {/* Account */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-1">Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="
                bg-white/20 backdrop-blur-xl border border-white/30
                px-3 py-2 rounded-xl text-black
                hover:bg-white/30 transition
              "
            >
              <option value="all">All</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="
                bg-white/20 backdrop-blur-xl border border-white/30
                px-3 py-2 rounded-xl text-black
                hover:bg-white/30 transition
              "
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Summary Boxes */}
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {Object.entries(typeSummary).map(([type, total]) => (
              <div
                key={type}
                className="
                  px-4 py-2 rounded-xl shadow-lg
                  text-sm font-semibold border border-white/10
                  backdrop-blur-xl bg-white/20
                  flex items-center gap-2
                "
              >
                <span className={clsx(
                  type === 'income' ? 'text-green-800' :
                  type === 'expense' ? 'text-red-800' :
                  'text-blue-800'
                )}>{tLabels[type as TransactionType]}</span>
                <span className="text-black font-bold">
                  ₹{Number(total).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center">
            <div className="flex bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-inner relative">
              
              {/* Sliding highlight */}
              <motion.div
                layout
                className="absolute top-[4px] bottom-[4px] w-[45%] bg-white/40 rounded-xl shadow-md"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{ left: viewMode === "list" ? "4px" : "calc(50% + 4px)" }}
              />

              {/* List Button */}
              <label
                className="relative z-10 flex items-center gap-1 px-4 py-2 w-[120px] justify-center cursor-pointer font-semibold text-white"
              >
                <input
                  type="radio"
                  name="view-toggle"
                  value="list"
                  checked={viewMode === "list"}
                  onChange={() => setViewMode("list")}
                  className="hidden"
                />
                📑 List
              </label>

              {/* Table Button */}
              <label
                className="relative z-10 flex items-center gap-1 px-4 py-2 w-[120px] justify-center cursor-pointer font-semibold text-white"
              >
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
          </div>


        </div>
      </div>

<AnimatePresence mode="wait">
  {viewMode === "list" && (
    <motion.div
     key="list"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-2">
  {transactions.map((t) => {
    const account = accounts.find(a => a.id === t.accountId);
    const category = categories.find(c => c.id === t.categoryId);
    const toAccount = t.toAccountId ? accounts.find(a => a.id === t.toAccountId) : null;

    // Type colors & icons
    const typeColor = t.type === 'income' ? 'green' :
                      t.type === 'expense' ? 'red' : 
                      t.type === 'savings' ? 'blue' : 
                      t.type === 'transfer' ? 'gray' : 'white';
    const typeIcon = t.type === 'income' ? '💰' :
                     t.type === 'expense' ? '💸' : 
                     t.type === 'transfer' ? '🔀' : 
                     t.type === 'savings' ? '🏦' : '💰';

    return (
      <li
        key={t.id}
        className={clsx(`
          relative flex flex-col justify-between bg-white/75 shadow-sm
          border-l-4 border-${typeColor}-900 rounded-md p-3
          transition-transform hover:shadow-md hover:-translate-y-0.5
          ${deletingId === t.id ? 'opacity-0' : 'opacity-100'}
        `)}
      >
        {/* Top Row: Amount + Date */}
        <div className="flex justify-between items-center mb-1">
          <span className={clsx(
`font-bold text-${typeColor}-700 text-lg flex items-center gap-1`)}>
            {typeIcon} ₹{t.amount}
          </span>
          <span className="text-xs text-gray-900">{formatDateForUI(t.transactionDate)}</span>
        </div>

        {/* Middle Row: Accounts + Category */}
        <div className="flex flex-col text-sm text-gray-900 space-y-0.5">
          <p className="truncate">
            <span className="font-medium">{account ? account.name : 'Unknown Account'}</span>
            {toAccount && (
              <span className="text-blue-600 font-medium"> → {toAccount.name}</span>
            )}
          </p>
          <p className="truncate text-gray-600">
            Category: <span className="font-medium">{category ? category.name : 'Unknown'}</span>
          </p>
          {t.description && (
            <p className="truncate text-gray-800 line-clamp-2">{t.description}</p>
          )}
        </div>

        {/* Bottom Row: Type + Actions */}
        <div className="flex justify-between items-center mt-2">
          {/* Type Tag */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
            ${t.type === 'income' ? 'bg-green-100 text-green-800' :
              t.type === 'expense' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'}
          `}>
            {t.type ? tLabels[t.type] : 'Unknown'}
          </span>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(t)}
              className="text-blue-600 hover:text-blue-800 transition"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="text-red-600 hover:text-red-800 transition"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>
    );
  })}
</ul>
    </motion.div>
)}

{viewMode === "table" && (
  <motion.div
      key="table"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    > 
    <div className="overflow-x-auto bg-white/40 backdrop-blur-md shadow-md rounded-md p-4">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-300">
      <tr>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Date</th>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Amount</th>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Account</th>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">To Account</th>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Category</th>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Description</th>
        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Type</th>
        <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {transactions.map((t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const category = categories.find(c => c.id === t.categoryId);
        const toAccount = t.toAccountId ? accounts.find(a => a.id === t.toAccountId) : null;

        const typeColor = t.type === 'income' ? 'green' :
                          t.type === 'expense' ? 'red' : 'blue';
        const typeIcon = t.type === 'income' ? '💰' :
                         t.type === 'expense' ? '💸' : '🔁';

        return (
          <tr key={t.id} className={`transition-all ${deletingId === t.id ? 'opacity-0' : 'opacity-100'} hover:bg-gray-50`}>
            <td className="px-3 py-2 text-sm text-gray-800">{formatDateForUI(t.transactionDate)}</td>
            <td className={`px-3 py-2 text-sm font-semibold text-${typeColor}-800 flex items-center gap-1`}>
              {typeIcon} ₹{t.amount}
            </td>
            <td className="px-3 py-2 text-sm text-gray-800">{account ? account.name : 'Unknown'}</td>
            <td className="px-3 py-2 text-sm text-gray-800">{toAccount ? toAccount.name : '-'}</td>
            <td className="px-3 py-2 text-sm text-gray-800">{category ? category.name : 'Unknown'}</td>
            <td className="px-3 py-2 text-sm text-gray-800 line-clamp-2">{t.description || '-'}</td>
            <td className={`px-3 py-2 text-xs font-semibold rounded-full text-${typeColor}-900  w-max`}>
              {t.type ? tLabels[t.type] : 'Unknown'}
            </td>
            <td className="px-3 py-2 text-right flex gap-2 justify-end">
              <button
                onClick={() => handleEdit(t)}
                className="text-blue-600 hover:text-blue-800 transition-transform hover:scale-110"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-red-600 hover:text-red-800 transition-transform hover:scale-110"
                title="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
    </motion.div>

)}
</AnimatePresence>

    </div>
  </Layout>
);

}
