import { useEffect, useState } from "react";
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


export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
    savings: 'Savings'
  };

  const typeStyleMap: Record<TransactionType, string> = {
    income: 'bg-green-100 text-green-600',
    savings: 'bg-green-100 text-green-600',
    expense: 'bg-red-100 text-red-600',
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    await load();
    setDeletingId(null);
  };

  const load = async () => {
    const [txRes, accRes, catRes] = await Promise.all([
      fetchTransaction(),
      getUserAccount(),
      getUserCategory()
    ]);
    setAccounts(accRes);
    setCategories(catRes);
  };
const fetchTransaction = async () => {
      try {
        const date = `${selectedYear}-${selectedMonth}-01`;
        const dayjsDate = dayjs(date);
  //console.log(dayjsDate);
  if (!dayjsDate.isValid()) {
    throw new Error(`Invalid date: ${date}`);
  }
  // determine range
  let from = dayjsDate.startOf('month');
  let to = dayjsDate.endOf('month');
        console.log("fetch got triggered")
        if (selectedAccount === 'all'){
          const [txRes] = await Promise.all([
    getFilterTransactions({ from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') })
  ]);
  setTransactions(txRes.data);

        }else{
           const [txRes] = await Promise.all([
    getFilterTransactions({
      accountId: selectedAccount,
      from: from.format('YYYY-MM-DD'),
      to: to.format('YYYY-MM-DD')
    })
  ]);
  setTransactions(txRes.data);

        }
      } catch (err) {
        console.error("Error loading budget utilizations", err);
      }
    };
  useEffect(() => { load(); }, []);
 useEffect(() => {
    fetchTransaction();
  }, [selectedMonth, selectedYear,selectedAccount]);


  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2">
        <div className="mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Transactions</h1>

          <TransactionForm onCreated={load} />

          <div className="rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-4">
            <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-black rounded-lg px-3 py-2"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-black rounded-lg px-3 py-2"
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

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="text-black rounded-lg px-3 py-2"
          >
            <option value="all">All</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
            <ul className="flex flex-wrap gap-4 px-4">
              {transactions.map((t) => {
                const account = accounts.find(a => a.id === t.accountId);
                const category = categories.find(c => c.id === t.categoryId);

                return (
                  <li
                    key={t.id}
                    className={`bg-white w-[300px] p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between transition-opacity duration-300 ${
                      deletingId === t.id ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-800"> {t.amount}</p>
                      <span className="text-xs text-gray-500">
                        {formatDateForUI(t.transactionDate)}
                      </span>
                      <span className="text-xs text-gray-700 ml-2">
                        {account ? `${account.name} (${account.type})` : "Unknown Account"}
                      </span>
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
      </div>
    </Layout>
  );
}
