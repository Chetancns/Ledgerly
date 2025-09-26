import Layout from "../components/Layout";
import { LineTrendChart, PieSpendingChart, BarChartComponent,PieChartComponent, ChashFlowLine, CatHeatmapPie, SummaryCard } from "@/components/Chart";
import { Transaction } from "@/models/Transaction";
import { Account } from "@/models/account";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useEffect, useState } from "react";
import { Category } from "@/models/category";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { getTransactions } from "@/services/transactions";
import { CashflowRow, CategoryRow, ChartDataPoint, DailyTotals } from "@/models/chat";
import { getBudgetUtilizations } from "@/services/budget"; // 🔹 new service
import { getBudgetReports, getCashflowTimeline, getCategoryHeatmap } from "@/services/reports";
import toast from "react-hot-toast";
import { BudgetCategory } from "@/models/budget";
export default function Dashboard() {
  useAuthRedirect();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetUtilizations, setBudgetUtilizations] = useState<any[]>([]);
  const [budgetReports, setBudgetReports] = useState<any>(null);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [cashflowData, setCashFlowData]  = useState<CashflowRow[]>([]);
  const [catHeatmap,setCatHeatmap] = useState<CategoryRow[]>([]);
  const [view, setView] = useState<"income" | "expense">("expense");
  const [filter, setFilter] = useState<'all' | 'overspent' |'within_budget' | 'no_budget'>('all');

  const filteredCategories = budgetReports?.categories?.filter((c: BudgetCategory) => {
  if (filter === 'all') return true;
  return c.status === filter;
});

useEffect(() => {
  if (filter === 'overspent') {
    toast('Showing overspent categories — brace yourself 😬',{
  position: "bottom-center"
});
  } else if (filter === 'no_budget') {
    toast('Showing unbudgeted spending — time to plan better 💡',{
  position: "bottom-center"
});
  }
}, [filter]);

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

  // 🔹 fetch budget utilizations when month/year changes
  useEffect(() => {
    const fetchUtilizations = async () => {
      try {
        const res = await getBudgetUtilizations(selectedMonth,selectedYear, "monthly");
        setBudgetUtilizations(res.data);
      } catch (err) {
        console.error("Error loading budget utilizations", err);
      }
    };
    fetchUtilizations();
  }, [selectedMonth, selectedYear]);

  // 🔹 fetch budget vs actual reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        console.log("calling API");
        const res = await getBudgetReports("monthly",selectedMonth, selectedYear, );
        setBudgetReports(res.data);
        console.log(res.data);
      } catch (err) {
        console.error("Error loading budget reports", err);
      }

    };
    fetchReports();
  }, [selectedMonth, selectedYear]);

  useEffect(() =>{
    const fetchCashflow = async () =>{
      try{
        console.log("Cashflow has been called");
      const res = await getCashflowTimeline("daily",selectedMonth,selectedYear);
      setCashFlowData(res.data.timeline);
      }catch(err){
        console.error("Error Loading Cashflow data",err);
      }
      
    };
    fetchCashflow();
  },[selectedMonth,selectedYear]);
  useEffect(()=>{
    const fetchCatHeatmap = async () =>{
      const res = await getCategoryHeatmap(selectedMonth,selectedYear);
      setCatHeatmap(res.data.categories)
    };fetchCatHeatmap();
  },[selectedMonth,selectedYear]);
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
    const date = t.transactionDate.split("T")[0];
    if (!dailyTotals[date]) dailyTotals[date] = { income: 0, expense: 0, creditCardExpense: 0 };

    const account = accounts.find(a => a.id === t.accountId);

    if ((t.type === "income" || t.type === "savings") && account?.type !== "credit_card") {
      dailyTotals[date].income += parseFloat(t.amount);
    } else if (t.type === "expense") {
       dailyTotals[date].expense += parseFloat(t.amount);
    }
  });

  // --- Build line chart array ---
  const lineData: ChartDataPoint[] = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => {
      const [year, month, day] = date.split("-");
      return {
        date: `${+month}-${day}`,
        income: totals.income,
        expense: totals.expense,
        creditCardExpense: totals.creditCardExpense,
      };
    });

  // --- Pie chart for expenses only (bank/cash vs credit card) ---
  const categoryMap: Record<string, number> = {};
  filteredTx.forEach(t => {
    if (t.type === "expense") {
      const account = accounts.find(a => a.id === t.accountId);
      const category = categories.find(c => c.id === t.categoryId);
      const catName = category?.name || "Unknown";
      const key =catName //account?.type === "credit_card" ? `${catName} (Card)` : catName;
      categoryMap[key] = (categoryMap[key] || 0) + parseFloat(t.amount);
    }
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white px-4 sm:px-6 py-6">
        <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

        {/* --- Balances --- */}
        <div
        className="rounded-2xl p-6 mb-6"
        style={{
          backdropFilter: "blur(12px)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <h2 className="text-lg font-semibold">💰 Total Balance</h2>
        <p className="text-xl sm:text-2xl font-bold mt-2">₹{totalBalance.toFixed(2)}</p>

        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl p-4 flex justify-between"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <span>
                {acc.name} ({acc.type})
              </span>
              <span className="font-semibold">
                ₹{parseFloat(acc.balance || "0").toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>


        {/* --- Filters --- */}
        <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Month</label>
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

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Year</label>
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

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Account</label>
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
      </div>


        {/* --- Charts --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
      style={{
        backdropFilter: "blur(12px)",
        background: "rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
        padding: "1rem",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <div
        style={{
          marginBottom: "0.5rem",
          fontSize: "1.2rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        🍕 Spending Breakdown
      </div>
      {pieData.length === 0 ?(
        <p className="text-gray-300">No Transaction found for this period</p>
      ):( <PieSpendingChart data={pieData} />)}
     
    </div>

    <div
  style={{
    backdropFilter: "blur(12px)",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
    padding: "1rem",
    color: "#fff",
    fontFamily: "Inter, sans-serif",
    transition: "box-shadow 0.3s ease",
  }}
>
  <div
    style={{
      marginBottom: "0.5rem",
      fontSize: "1.2rem",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.5rem",
    }}
  >
    <span>📊 Daily Flow</span>
    <button
      onClick={() => setView(view === "income" ? "expense" : "income")}
      style={{
        backgroundColor: "#ffffff22",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "0.3rem 0.6rem",
        fontSize: "0.9rem",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
      }}
    >
      {view === "income" ? "💸 Show Expense" : "💰 Show Income"}
    </button>
  </div>

  {lineData.length === 0 ? (
    <p className="text-gray-300">No Transaction found for this period</p>
  ) : (
    <>
    <LineTrendChart data={lineData} view={view} />
    <div
      style={{
        marginTop: "0.75rem",
        textAlign: "center",
        fontSize: "0.95rem",
        fontWeight: 500,
        color: "#ffffffcc",
      }}
    >
      {view === "income" ? "💰 Viewing Daily Income Trends" : "💸 Viewing Daily Expense Trends"}
    </div>
</>
  )}
</div>

  </div>

        {/* --- Budget Utilization --- */}
        <div
      className="rounded-2xl p-6 mt-6 text-white"
      style={{
        backdropFilter: "blur(12px)",
        background: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
      }}
    >
      <h2 className="text-lg font-semibold mb-4">📦 Budget Utilization</h2>

      {budgetUtilizations.length === 0 ? (
        <p className="text-gray-300">No budgets found for this period</p>
      ) : (
        <ul className="space-y-4">
          {budgetUtilizations.map((b) => {
            const category = categories.find((c) => c.id === b.categoryId);
            const isOverBudget = b.percent > 100;
            const barColor = isOverBudget ? "bg-red-500" : "bg-green-400";
            const percentDisplay = Math.min(b.percent, 100);

            return (
              <li key={b.budgetId}>
                <div className="flex justify-between mb-1 text-sm font-medium">
                  <span>{category?.name || "Unknown"}</span>
                  <span>
                    {b.spent} / {b.amount} ({b.percent}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ease-in-out ${barColor}`}
                    style={{ width: `${percentDisplay}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
      {/* --- Budget vs Actual --- */}
   {budgetReports?.totals && <SummaryCard totals={budgetReports.totals} />}
{budgetReports?.categories && (
  <>
    <div className="flex gap-2 mb-4">
      {['all','within_budget', 'overspent', 'no_budget'].map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f as any)}
          className={`px-4 py-1 rounded-full text-sm transition ${
            filter === f ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white'
          }`}
        >
          {f === 'all'
  ? 'All Categories'
  : f === 'within_budget'
  ? 'Budgeted'
  : f === 'overspent'
  ? 'Overspent'
  : 'Unbudgeted'}

        </button>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="rounded-2xl p-6 text-white" style={{
            backdropFilter: "blur(12px)",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
          }}>
        <h2 className="text-lg font-semibold mb-4">📦 Budget by Category</h2>
        <BarChartComponent data={filteredCategories} />
      </div>

      <div className="rounded-2xl p-6 text-white" style={{
            backdropFilter: "blur(12px)",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
          }}>
        <h2 className="text-lg font-semibold mb-4">🧮 Total Budget Breakdown</h2>
        <PieChartComponent data={budgetReports.categories} />
      </div>
    </div>
  </>
)}

      {/* --- Cash Flow Reports --- */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
  {/* Line Chart */}
  <div
    className="rounded-2xl p-6 text-white"
    style={{
      backdropFilter: "blur(12px)",
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
    }}
  >
    <h2 className="text-lg font-semibold mb-4">📈 Cash Flow Timeline</h2>
    {cashflowData ? (
      <ChashFlowLine data={cashflowData} />
    ) : (
      <p className="text-gray-300">Loading timeline...</p>
    )}
  </div>

  {/* Summary Card */}
  <div
    className="rounded-2xl p-6 text-white"
    style={{
      backdropFilter: "blur(12px)",
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
    }}
  >
    <h2 className="text-lg font-semibold mb-4">📊 Spending by Category</h2>
    {
      catHeatmap?(
        <CatHeatmapPie data={catHeatmap} />
      ):(<p className="text-gray-300">Loading summary...</p>)
    }
      
    
  </div>
</div>
 

  </div>
  
    </Layout>
  );
}