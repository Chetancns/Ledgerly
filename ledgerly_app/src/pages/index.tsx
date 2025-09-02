import Layout from "../components/Layout";
import { LineTrendChart, PieSpendingChart } from "@/components/Chart";
import { Transaction } from "@/models/Transaction";
import { Account } from "@/models/account";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useEffect, useState } from "react";
import { Category } from "@/models/category";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { getTransactions } from "@/services/transactions";
import { ChartDataPoint, DailyTotals } from "@/models/chat";

export default function Dashboard() {
  useAuthRedirect();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      const [accRes, catRes, txRes] = await Promise.all([
        getUserAccount(),
        getUserCategory(),
        getTransactions()
      ]);
      setAccounts(accRes);
      setCategories(catRes);
      setTransactions(txRes.data);
    };
    fetchData();
  }, []);

  // --- Account balances ---
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance || "0"),
    0
  );

  // --- Filter Transactions ---
  const filteredTx = transactions.filter(t => {
    const d = new Date(t.transactionDate);
    const matchMonth = d.getUTCMonth() + 1 === selectedMonth;
    const matchYear = d.getUTCFullYear() === selectedYear;
    const matchAccount = selectedAccount === "all" || t.accountId === selectedAccount;
    return matchMonth && matchYear && matchAccount;
  });

  // --- Daily totals (income vs expense) ---
  const dailyTotals: DailyTotals = {};
  filteredTx.forEach(t => {
    const date = new Date(t.transactionDate).toISOString().split("T")[0];
    if (!dailyTotals[date]) dailyTotals[date] = { income: 0, expense: 0, creditCardExpense: 0 };

    const account = accounts.find(a => a.id === t.accountId);
    if (t.type === "income") dailyTotals[date].income += parseFloat(t.amount);
    else if (t.type === "expense") {
      if (account?.type === "credit_card") dailyTotals[date].creditCardExpense += parseFloat(t.amount);
      else dailyTotals[date].expense += parseFloat(t.amount);
    }
  });

  // --- Build line chart array ---
  const lineData: ChartDataPoint[] = Object.entries(dailyTotals)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, totals]) => ({
      date,
      income: totals.income,
      expense: totals.expense,
      creditCardExpense: totals.creditCardExpense,
    }));

  // --- Pie chart for expenses only (bank/cash vs credit card) ---
  const categoryMap: Record<string, number> = {};
  filteredTx.forEach(t => {
    if (t.type === "expense") {
      const account = accounts.find(a => a.id === t.accountId);
      const category = categories.find(c => c.id === t.categoryId);
      const catName = category?.name || "Unknown";
      const key = account?.type === "credit_card" ? `${catName} (Card)` : catName;
      categoryMap[key] = (categoryMap[key] || 0) + parseFloat(t.amount);
    }
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* --- Balances --- */}
        <div className="bg-white/10 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-medium">Total Balance</h2>
          <p className="text-2xl font-bold mt-2">${totalBalance.toFixed(2)}</p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-white/10 rounded-xl p-4 flex justify-between">
                <span>{acc.name} ({acc.type})</span>
                <span className="font-semibold">${parseFloat(acc.balance || "0").toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- Filters --- */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="text-black rounded-lg px-3 py-2">
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="text-black rounded-lg px-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const year = today.getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="text-black rounded-lg px-3 py-2">
            <option value="all">All</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* --- Charts --- */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-medium mb-2">Category Spending</h2>
            <PieSpendingChart data={pieData} />
          </div>
          <div className="bg-white/10 rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-medium mb-2">Monthly Trends</h2>
            <LineTrendChart data={lineData} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
