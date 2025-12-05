import Layout from "../components/Layout";
import Loading from "@/components/Loading";
import { LineTrendChart, PieSpendingChart, BarChartComponent,PieChartComponent, ChashFlowLine, CatHeatmapPie, SummaryCard } from "@/components/Chart";
import { Transaction } from "@/models/Transaction";
import { Account } from "@/models/account";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useEffect, useState, useMemo } from "react";
import { Category } from "@/models/category";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { getTransactions } from "@/services/transactions";
import { CashflowRow, CategoryRow, ChartDataPoint, DailyTotals } from "@/models/chat";
import { getBudgetUtilizations } from "@/services/budget"; // 🔹 new service
import { getBudgetReports, getCashflowTimeline, getCategoryHeatmap } from "@/services/reports";
import toast from "react-hot-toast";
import { BudgetCategory, BudgetUtilization, BudgetReports } from "@/models/budget";
import { useAuth } from "@/hooks/useAuth";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetUtilizations, setBudgetUtilizations] = useState<BudgetUtilization[]>([]);
  const [budgetReports, setBudgetReports] = useState<BudgetReports | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [cashflowData, setCashFlowData]  = useState<CashflowRow[]>([]);
  const [catHeatmap,setCatHeatmap] = useState<CategoryRow[]>([]);
  const [view, setView] = useState<"income" | "expense">("expense");
  const [filter, setFilter] = useState<'all' | 'overspent' |'within_budget' | 'no_budget'>('all');
  const { format } = useCurrencyFormatter();

  const filteredCategories = useMemo(() => {
    return (budgetReports?.categories?.filter((c: BudgetCategory) => {
      if (filter === 'all') return true;
      return c.status === filter;
    }) || []);
  }, [budgetReports, filter]);

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
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [accRes, catRes, txRes] = await Promise.all([
          getUserAccount(),
          getUserCategory(),
          getTransactions(),
        ]);

        if (!mounted) return;
        setAccounts(accRes);
        setCategories(catRes);
        setTransactions(txRes);
      } catch (err: any) {
        console.error("Error loading initial dashboard data", err);
        if (!mounted) return;
        setError(err?.message || "Failed to load dashboard data");
          toast.error(err?.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔹 fetch budget utilizations when month/year changes
  useEffect(() => {
    let mounted = true;
    const fetchUtilizations = async () => {
      try {
        const res = await getBudgetUtilizations(selectedMonth, selectedYear, "monthly");
        if (!mounted) return;
        setBudgetUtilizations(res);
      } catch (err) {
        console.error("Error loading budget utilizations", err);
      }
    };
    fetchUtilizations();
    return () => { mounted = false };
  }, [selectedMonth, selectedYear]);

  // 🔹 fetch budget vs actual reports
  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      try {
        const res = await getBudgetReports("monthly", selectedMonth, selectedYear);
        if (!mounted) return;
        setBudgetReports(res);
      } catch (err) {
        console.error("Error loading budget reports", err);
      }
    };
    fetchReports();
    return () => { mounted = false };
  }, [selectedMonth, selectedYear]);

  useEffect(() =>{
    let mounted = true;
    const fetchCashflow = async () =>{
      try{
        const res = await getCashflowTimeline("daily", selectedMonth, selectedYear);
        if (!mounted) return;
        setCashFlowData(res.timeline);
      }catch(err){
        console.error("Error Loading Cashflow data",err);
      }
    };
    fetchCashflow();
    return () => { mounted = false };
  },[selectedMonth,selectedYear]);
  useEffect(()=>{
    let mounted = true;
    const fetchCatHeatmap = async () =>{
      const res = await getCategoryHeatmap(selectedMonth, selectedYear);
      if (!mounted) return;
      setCatHeatmap(res.categories)
    };
    fetchCatHeatmap();
    return () => { mounted = false };
  },[selectedMonth,selectedYear]);
  // --- Account balances ---
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance || "0"),
    0
  );

  // --- Filter Transactions ---
  const filteredTx = useMemo(() => transactions.filter(t => {
    const d = new Date(t.transactionDate);
    const matchMonth = d.getUTCMonth() + 1 === selectedMonth;
    const matchYear = d.getUTCFullYear() === selectedYear;
    const matchAccount = selectedAccount === "all" || t.accountId === selectedAccount;
    return matchMonth && matchYear && matchAccount;
  }), [transactions, selectedMonth, selectedYear, selectedAccount]);

  // --- Daily totals (income vs expense) ---
  const dailyTotals: DailyTotals = useMemo(() => {
    const totals: DailyTotals = {};
    filteredTx.forEach(t => {
      const date = t.transactionDate.split("T")[0];
      if (!totals[date]) totals[date] = { income: 0, expense: 0, creditCardExpense: 0 };

      const account = accounts.find(a => a.id === t.accountId);

      if ((t.type === "income" || t.type === "savings") && account?.type !== "credit_card") {
        totals[date].income += parseFloat(String(t.amount));
      } else if (t.type === "expense") {
        totals[date].expense += parseFloat(String(t.amount));
      }
    });
    return totals;
  }, [filteredTx, accounts]);

  // --- Build line chart array ---
  const lineData: ChartDataPoint[] = useMemo(() => Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => {
      const [year, month, day] = date.split("-");
      return {
        date: `${+month}-${day}`,
        income: totals.income,
        expense: totals.expense,
        creditCardExpense: totals.creditCardExpense,
      };
    }), [dailyTotals]);

  // --- Pie chart for expenses only (bank/cash vs credit card) ---
  const pieData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredTx.forEach(t => {
      if (t.type === "expense") {
        const account = accounts.find(a => a.id === t.accountId);
        const category = categories.find(c => c.id === t.categoryId);
        const catName = category?.name || "Unknown";
        const key = catName;
        categoryMap[key] = (categoryMap[key] || 0) + parseFloat(String(t.amount));
      }
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [filteredTx, accounts, categories]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, catRes, txRes] = await Promise.all([
        getUserAccount(),
        getUserCategory(),
        getTransactions(),
      ]);
      setAccounts(accRes);
      setCategories(catRes);
      setTransactions(txRes);
      toast.success("Dashboard reloaded");
    } catch (err: any) {
      console.error("Retry failed:", err);
      setError(err?.message || "Failed to reload dashboard");
      toast.error(err?.message || "Failed to reload dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div 
        className="min-h-screen overflow-x-hidden px-3 sm:px-6 py-4 sm:py-6"
        style={{ color: "var(--text-primary)" }}
      >
        <h1 
          className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          📊 Dashboard
        </h1>

        {error && (
          <div 
            className="mb-4 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
            style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error)" }}
          >
            <div className="text-sm font-medium" style={{ color: "var(--color-error)" }}>{error}</div>
            <div>
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 rounded font-semibold text-sm min-h-[36px]"
                style={{ backgroundColor: "var(--color-error)", color: "var(--text-inverse)" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* --- Balances --- */}
        <div
        className="rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6"
        style={{
          backdropFilter: "blur(12px)",
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h2 className="text-base sm:text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          💰 Total Balance
        </h2>
        {/* Use user currency formatting */}
        <p className="text-xl sm:text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
          {format(totalBalance)}
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl p-3 sm:p-4 flex justify-between items-center"
              style={{
                background: "var(--bg-card-hover)",
                border: "1px solid var(--border-secondary)",
              }}
            >
              <span className="text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                {acc.name} ({acc.type})
              </span>
              <span className="font-semibold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                {format(parseFloat(acc.balance || '0'))}
              </span>
            </div>
          ))}
        </div>
      </div>


        {/* --- Filters --- */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col min-w-[100px]">
          <label className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="backdrop-blur-lg rounded-lg px-3 py-2 min-h-[44px]"
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col min-w-[80px]">
          <label className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="backdrop-blur-lg rounded-lg px-3 py-2 min-h-[44px]"
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
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

        <div className="flex flex-col min-w-[120px]">
          <label className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="backdrop-blur-lg rounded-lg px-3 py-2 min-h-[44px]"
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div
      style={{
        backdropFilter: "blur(12px)",
        background: "var(--bg-card)",
        borderRadius: "16px",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-lg)",
        padding: "1rem",
        color: "var(--text-primary)",
        fontFamily: "Inter, sans-serif",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <div
        style={{
          marginBottom: "0.5rem",
          fontSize: "1.1rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--text-primary)",
        }}
      >
        🍕 Spending Breakdown
      </div>
      {pieData.length === 0 ?(
        <p style={{ color: "var(--text-muted)" }}>No Transaction found for this period</p>
      ):( <PieSpendingChart data={pieData} />)}
     
    </div>

    <div
  style={{
    backdropFilter: "blur(12px)",
    background: "var(--bg-card)",
    borderRadius: "16px",
    border: "1px solid var(--border-primary)",
    boxShadow: "var(--shadow-lg)",
    padding: "1rem",
    color: "var(--text-primary)",
    fontFamily: "Inter, sans-serif",
    transition: "box-shadow 0.3s ease",
  }}
>
  <div
    style={{
      marginBottom: "0.5rem",
      fontSize: "1.1rem",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.5rem",
      flexWrap: "wrap",
      color: "var(--text-primary)",
    }}
  >
    <span>📊 Daily Flow</span>
    <button
      onClick={() => setView(view === "income" ? "expense" : "income")}
      style={{
        backgroundColor: "var(--bg-card-hover)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-primary)",
        borderRadius: "6px",
        padding: "0.4rem 0.8rem",
        fontSize: "0.85rem",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        minHeight: "36px",
      }}
    >
      {view === "income" ? "💸 Show Expense" : "💰 Show Income"}
    </button>
  </div>

  {lineData.length === 0 ? (
    <p style={{ color: "var(--text-muted)" }}>No Transaction found for this period</p>
  ) : (
    <>
    <LineTrendChart data={lineData} view={view} />
    <div
      style={{
        marginTop: "0.75rem",
        textAlign: "center",
        fontSize: "0.9rem",
        fontWeight: 500,
        color: "var(--text-muted)",
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
      className="rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6"
      style={{
        backdropFilter: "blur(12px)",
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-lg)",
        color: "var(--text-primary)",
      }}
    >
      <h2 className="text-base sm:text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        📦 Budget Utilization
      </h2>

      {budgetUtilizations.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No budgets found for this period</p>
      ) : (
        <ul className="space-y-4">
          {budgetUtilizations.map((b) => {
            const category = categories.find((c) => c.id === b.categoryId);
            const isOverBudget = b.percent > 100;
            const percentDisplay = Math.min(b.percent, 100);

            return (
              <li key={b.budgetId}>
                <div className="flex justify-between mb-1 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  <span>{category?.name || "Unknown"}</span>
                  <span>
                    {b.spent} / {b.amount} ({b.percent}%)
                  </span>
                </div>
                <div 
                  className="w-full rounded-full h-3 overflow-hidden"
                  style={{ backgroundColor: "var(--skeleton-base)" }}
                >
                  <div
                    className="h-3 rounded-full transition-all duration-300 ease-in-out"
                    style={{ 
                      width: `${percentDisplay}%`,
                      backgroundColor: isOverBudget ? "var(--color-error)" : "var(--color-success)",
                    }}
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
    <div className="flex flex-wrap gap-2 mb-4 mt-4">
      {['all','within_budget', 'overspent', 'no_budget'].map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f as any)}
          className="px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition min-h-[36px]"
          style={{
            backgroundColor: filter === f ? "var(--accent-primary)" : "var(--bg-card)",
            color: filter === f ? "var(--text-inverse)" : "var(--text-primary)",
            border: `1px solid ${filter === f ? "var(--accent-primary)" : "var(--border-primary)"}`,
            fontWeight: filter === f ? 600 : 400,
          }}
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

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
      <div className="rounded-2xl p-4 sm:p-6" style={{
            backdropFilter: "blur(12px)",
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-primary)",
          }}>
        <h2 className="text-base sm:text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          📦 Budget by Category
        </h2>
        <BarChartComponent data={filteredCategories} />
      </div>

      <div className="rounded-2xl p-4 sm:p-6" style={{
            backdropFilter: "blur(12px)",
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-primary)",
          }}>
        <h2 className="text-base sm:text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          🧮 Total Budget Breakdown
        </h2>
        <PieChartComponent data={budgetReports.categories} />
      </div>
    </div>
  </>
)}

      {/* --- Cash Flow Reports --- */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
  {/* Line Chart */}
  <div
    className="rounded-2xl p-4 sm:p-6"
    style={{
      backdropFilter: "blur(12px)",
      background: "var(--bg-card)",
      border: "1px solid var(--border-primary)",
      boxShadow: "var(--shadow-lg)",
      color: "var(--text-primary)",
    }}
  >
    <h2 className="text-base sm:text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
      📈 Cash Flow Timeline
    </h2>
    {cashflowData ? (
      <ChashFlowLine data={cashflowData} />
    ) : (
      <p style={{ color: "var(--text-muted)" }}>Loading timeline...</p>
    )}
  </div>

  {/* Summary Card */}
  <div
    className="rounded-2xl p-4 sm:p-6"
    style={{
      backdropFilter: "blur(12px)",
      background: "var(--bg-card)",
      border: "1px solid var(--border-primary)",
      boxShadow: "var(--shadow-lg)",
      color: "var(--text-primary)",
    }}
  >
    <h2 className="text-base sm:text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
      📊 Spending by Category
    </h2>
    {
      catHeatmap?(
        <CatHeatmapPie data={catHeatmap} />
      ):(<p style={{ color: "var(--text-muted)" }}>Loading summary...</p>)
    }
      
    
  </div>
</div>
 

  </div>
  
    </Layout>
  );
}