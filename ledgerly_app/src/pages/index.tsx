import Layout from "../components/Layout";
import { LineTrendChart, PieSpendingChart } from "@/components/Chart";
import { Transaction } from "../models/Transaction";
import { Account } from "@/models/account";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useEffect, useState } from "react";
import { Category } from "@/models/category";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { getTransactions } from "@/services/transactions";
import { ChartDataPoint } from "@/models/chat";

export default function Dashboard() {
    useAuthRedirect();
 
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
      useEffect(() => {
          const fetchData = async () => {
              const [accRes,catRes,tranRes] = await Promise.all([getUserAccount(),getUserCategory(),getTransactions()]);
              setAccounts(accRes);
            setCategories(catRes);
            setTransactions(tranRes.data);
          };
          fetchData();
      }, []);
  
  



  // --- Filters ---
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  // --- Account Balances ---
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance || "0"),
    0
  );

  // --- Filter Transactions ---
  const filteredTx = transactions.filter((t) => {
    const d = new Date(t.transactionDate);
    const matchMonth = d.getMonth() + 1 === selectedMonth;
    const matchYear = d.getFullYear() === selectedYear;
    const matchAccount = selectedAccount === "all" || t.accountId === selectedAccount;
    return matchMonth && matchYear && matchAccount;
  });

const dateMap: Record<string, number> = {};



filteredTx.forEach((t) => {
  if (t.type === "expense") {
    const date = new Date(t.transactionDate).toISOString().split("T")[0];
    dateMap[date] = (dateMap[date] || 0) + parseFloat(t.amount);
  }
});

// Step 2: Sort and build cumulative totals
let cumulative = 0;
const lineData: ChartDataPoint[] = Object.entries(dateMap)
  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  .map(([date, amount]) => {
    cumulative += amount;
    return { date, amount: cumulative };
  });





  // --- Pie Chart Data (per category for expenses only) ---
  const categoryMap: Record<string, number> = {};
filteredTx.forEach((t) => {
  if (t.type === "expense") {
    const category = categories.find((c) => c.id === t.categoryId);

    if (category && category.name) {
      const catName = category.name;
      categoryMap[catName] = (categoryMap[catName] || 0) + parseFloat(t.amount);
    } else {
      // Fallback for missing category
      categoryMap["Unknown"] = (categoryMap["Unknown"] || 0) + parseFloat(t.amount);
    }
  }
});

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // --- Month/Year Options ---
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* --- Balances Section --- */}
        <div className="bg-white/10 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-medium">Total Balance</h2>
          <p className="text-2xl font-bold mt-2">${totalBalance.toFixed(2)}</p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white/10 rounded-xl p-4 flex justify-between"
              >
                <span>{acc.name} ({acc.type})</span>
                <span className="font-semibold">
                  ${parseFloat(acc.balance || "0").toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* --- Filters --- */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            className="text-black rounded-lg px-3 py-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="text-black rounded-lg px-3 py-2"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
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
          <select
            className="text-black rounded-lg px-3 py-2"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* --- Charts Grid --- */}
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