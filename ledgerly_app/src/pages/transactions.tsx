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
      {/*<div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2">*/}
        <div className="mx-auto p-4">
          <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>

          {editingTransaction ? (
            <TransactionForm
              transaction={editingTransaction}
              onUpdated={fetchTransaction}
              onCancel={() => setEditingTransaction(null)}
              onCreated={fetchTransaction} // fallback
            />
          ) : (
            <TransactionForm onCreated={fetchTransaction} />
          )}

          <div className="rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-4 mt-2">
      <div className="flex flex-wrap items-end gap-4 mb-6">
        {/* Month */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-white mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-white bg-black/50 backdrop-blur-lg rounded-lg px-3 py-2"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-white mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-white bg-black/50 backdrop-blur-lg rounded-lg px-3 py-2"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const year = today.getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        {/* Account */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-white mb-1">Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="text-white bg-black/50 backdrop-blur-lg rounded-lg px-3 py-2"
          >
            <option value="all">All</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-white mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-white bg-black/50 backdrop-blur-lg rounded-lg px-3 py-2"
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Summary inline */}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {Object.entries(typeSummary).map(([type, total]) => (
            <div
              key={type}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm text-sm font-medium border border-white/10 backdrop-blur-lg transition-transform hover:scale-105 ${
                typeStyleMap[type as TransactionType] || "bg-gray-700 text-white"
              }`}
            >
              <span>{tLabels[type as TransactionType]}</span>
              <span className="text-black/90">₹{Number(total).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap justify-evenly gap-4 px-4">
              {transactions.map((t) => {
    const account = accounts.find(a => a.id === t.accountId);
    const category = categories.find(c => c.id === t.categoryId);
    const toAccount = t.toAccountId ? accounts.find(a => a.id === t.toAccountId) : null;

    return (
      <li
        key={t.id}
        className={`bg-white/80 backdrop-blur-lg w-[300px] font-semibold p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between transition-opacity duration-300 ${
          deletingId === t.id ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div>
          <p className="font-semibold text-gray-800">💲 {t.amount}</p>
          <span className="text-xs text-gray-500">
            {formatDateForUI(t.transactionDate)}
          </span>

          {/* 🔹 Source account */}
          <span className="text-xs text-gray-700 ml-2">
            {account ? `${account.name} (${account.type})` : "Unknown Account"}
          </span>

          {/* 🔹 Show arrow for transfers */}
          {toAccount && (
            <span className="text-xs text-blue-600 ml-2">
              → {toAccount.name} ({toAccount.type})
            </span>
          )}

          {/* 🔹 Category */}
          <span className="text-xs text-gray-800 ml-2">
            : {category ? category.name : "Unknown Category"}
          </span>

          <p className="text-m text-green-800">{t.description}</p>
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className={`px-2 py-1 rounded-full text-sm font-medium ${t.type ? typeStyleMap[t.type] : 'bg-gray-100 text-gray-500'}`}>
            {t.type ? tLabels[t.type] : 'Unknown'}
          </span>

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
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </li>
    );
  })}
            </ul>
          </div>
        </div>
      {/*</div>*/}
    </Layout>
  );
}
