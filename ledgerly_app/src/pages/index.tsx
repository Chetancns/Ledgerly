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
  const [loadingBudgetReports, setLoadingBudgetReports] = useState<boolean>(false);
  const [loadingCashflow, setLoadingCashflow] = useState<boolean>(false);
  const [loadingCategoryHeatmap, setLoadingCategoryHeatmap] = useState<boolean>(false);
  const [loadingLineChart, setLoadingLineChart] = useState<boolean>(false);
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

  const sortedBudgetUtilizations = useMemo(() => {
    const byName = (id?: string) => categories.find((c) => c.id === id)?.name || "";
    return [...budgetUtilizations].sort((a, b) => {
      const aHasValue = Number(a.spent) > 0;
      const bHasValue = Number(b.spent) > 0;
      if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
      if (aHasValue && bHasValue && a.percent !== b.percent) return b.percent - a.percent;
      return byName(a.categoryId).localeCompare(byName(b.categoryId));
    });
  }, [budgetUtilizations, categories]);

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
      setLoadingBudgetReports(true);
      try {
        const res = await getBudgetReports("monthly", selectedMonth, selectedYear);
        if (!mounted) return;
        setBudgetReports(res);
      } catch (err) {
        console.error("Error loading budget reports", err);
      } finally {
        if (mounted) setLoadingBudgetReports(false);
      }
    };
    fetchReports();
    return () => { mounted = false };
  }, [selectedMonth, selectedYear]);

  useEffect(() =>{
    let mounted = true;
    const fetchCashflow = async () =>{
      setLoadingCashflow(true);
      try{
        const res = await getCashflowTimeline("daily", selectedMonth, selectedYear);
        if (!mounted) return;
        setCashFlowData(res.timeline);
      }catch(err){
        console.error("Error Loading Cashflow data",err);
      } finally {
        if (mounted) setLoadingCashflow(false);
      }
    };
    fetchCashflow();
    return () => { mounted = false };
  },[selectedMonth,selectedYear]);
  useEffect(()=>{
    let mounted = true;
    const fetchCatHeatmap = async () =>{
      setLoadingCategoryHeatmap(true);
      try {
        const res = await getCategoryHeatmap(selectedMonth, selectedYear);
        if (!mounted) return;
        setCatHeatmap(res.categories);
      } catch (err) {
        console.error("Error loading category heatmap", err);
      } finally {
        if (mounted) setLoadingCategoryHeatmap(false);
      }
    };
    fetchCatHeatmap();
    return () => { mounted = false };
  },[selectedMonth,selectedYear]);

  // 🔹 Track line chart loading when filters change
  useEffect(() => {
    setLoadingLineChart(true);
    const timer = setTimeout(() => setLoadingLineChart(false), 100);
    return () => clearTimeout(timer);
  }, [selectedMonth, selectedYear, selectedAccount]);

  // --- Account balances ---
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance || "0"),
    0
  );

  const accountSummary = useMemo(() => {
    let cash = 0;
    let credit = 0;
    let savings = 0;
    let other = 0;
    accounts.forEach((acc) => {
      const bal = parseFloat(acc.balance || "0");
      switch (acc.type) {
        case "credit_card":
          credit += bal;
          break;
        case "savings":
          savings += bal;
          break;
        case "cash":
        case "bank":
          cash += bal;
          break;
        default:
          other += bal;
      }
    });
    return {
      cash,
      credit,
      savings,
      other,
      count: accounts.length,
    };
  }, [accounts]);

  const accountDistribution = useMemo(() => {
    const total = Math.abs(accountSummary.cash) + Math.abs(accountSummary.credit) + Math.abs(accountSummary.savings) + Math.abs(accountSummary.other);
    if (total === 0) return [] as { label: string; value: number; percent: number; color: string }[];
    const entries = [
      { label: "Cash / Bank", value: accountSummary.cash, color: "var(--accent-primary)" },
      { label: "Savings", value: accountSummary.savings, color: "var(--color-success)" },
      { label: "Credit", value: accountSummary.credit, color: "var(--color-error)" },
      { label: "Other", value: accountSummary.other, color: "var(--text-secondary)" },
    ].filter((e) => Math.abs(e.value) > 0);
    return entries.map((e) => ({ ...e, percent: Math.round((Math.abs(e.value) / total) * 100) })).sort((a, b) => b.percent - a.percent);
  }, [accountSummary]);

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

  const frostedCardStyle = useMemo(() => ({
    background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
              border: "1px solid var(--border-primary)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)"
  }), []);

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
      <a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>
      <main
        id="main-content"
        className="min-h-screen w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 flex flex-col gap-4 sm:gap-5 md:gap-6"
        style={{ color: "var(--text-primary)" }}
        aria-label="Dashboard main content"
        role="main"
      >
        <header className="w-full flex flex-col gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: "var(--text-primary)" }}>
              📊 Dashboard
            </h1>
            <section
              className="w-full sm:w-auto flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-start sm:items-end"
              aria-label="Dashboard filters"
              role="region">
              <div className="flex flex-col w-full sm:w-auto min-w-[100px]">
                <label className="text-xs sm:text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }} htmlFor="month-select">Month</label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="backdrop-blur-lg rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[48px] text-sm w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-95 cursor-pointer"
                  aria-label="Select month to filter dashboard"
                  aria-describedby="month-help"
                  style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}>
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col w-full sm:w-auto min-w-[80px]">
                <label className="text-xs sm:text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }} htmlFor="year-select">Year</label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="backdrop-blur-lg rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[48px] text-sm w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-95 cursor-pointer"
                  aria-label="Select year to filter dashboard"
                  aria-describedby="year-help"
                  style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const year = today.getFullYear() - 2 + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
              <div className="flex flex-col w-full sm:w-auto min-w-[120px]">
                <label className="text-xs sm:text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }} htmlFor="account-select">Account</label>
                <select
                  id="account-select"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="backdrop-blur-lg rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[48px] text-sm w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-95 cursor-pointer"
                  aria-label="Select account to filter dashboard"
                  aria-describedby="account-help"
                  style={{ backgroundColor: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}>
                  <option value="all">All</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </section>
          </div>
          {error && (
            <div 
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3"
              style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error)" }}>
              <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--color-error)" }}>{error}</span>
              <button
                onClick={handleRetry}
                className="px-3 sm:px-4 py-2 rounded font-semibold text-xs sm:text-sm min-h-[40px] sm:min-h-[44px] whitespace-nowrap transition-all duration-200 ease-in-out hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95"
                style={{ backgroundColor: "var(--color-error)", color: "var(--text-inverse)" }}>
                Retry
              </button>
            </div>
          )}
        </header>

        {/* Main Grid Section */}
        <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6" aria-label="Dashboard summary cards" role="region">
          {/* Total Balance Card */}
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col gap-4 shadow-xl transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-offset-1"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
              border: "1px solid var(--border-primary)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)"
            }}
            aria-labelledby="balance-heading">
            <h2 id="balance-heading" className="text-base sm:text-lg md:text-xl font-semibold" style={{ color: "var(--text-primary)" }}>💰 Total Balance</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>{format(totalBalance)}</p>
              <div className="flex flex-wrap gap-2">
                {accountDistribution.length === 0 ? (
                  <span className="text-xs text-muted" style={{ color: "var(--text-secondary)" }}>No balances yet</span>
                ) : accountDistribution.slice(0,3).map((d) => (
                  <span
                    key={d.label}
                    className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: d.color, color: "var(--text-inverse)" }}>
                    {d.label}: {d.percent}%
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-lg px-3 py-2 flex flex-col gap-1" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-secondary)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Accounts</span>
                <span className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>{accountSummary.count}</span>
              </div>
              <div className="rounded-lg px-3 py-2 flex flex-col gap-1" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-secondary)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Cash / Bank</span>
                <span className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>{format(accountSummary.cash)}</span>
              </div>
              <div className="rounded-lg px-3 py-2 flex flex-col gap-1" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-secondary)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Savings</span>
                <span className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>{format(accountSummary.savings)}</span>
              </div>
              <div className="rounded-lg px-3 py-2 flex flex-col gap-1" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-secondary)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Credit</span>
                <span className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>{format(accountSummary.credit)}</span>
              </div>
            </div>

            {accountDistribution.length > 0 && (
              <div className="w-full rounded-lg overflow-hidden" style={{ background: "var(--border-secondary)" }}>
                <div className="flex w-full h-3">
                  {accountDistribution.map((seg) => (
                    <div
                      key={seg.label}
                      className="h-full"
                      style={{ width: `${seg.percent}%`, background: seg.color }}
                      title={`${seg.label}: ${seg.percent}%`}>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1"
              style={{
                maxHeight: "420px",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--border-secondary) transparent",
              }}>
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="
                    relative group rounded-2xl p-4 flex items-center justify-between
                    backdrop-blur-xl transition-all duration-300 
                    hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]
                    hover:bg-white/5 border border-white/10
                  "
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                  }}
                >
                  {/* Glow Ring Behind Icon */}
                  <div
                    className="
                      absolute -left-3 top-1/2 -translate-y-1/2 h-14 w-14 
                      rounded-2xl blur-xl opacity-40 group-hover:opacity-70 
                      transition-all duration-300
                    "
                    style={{
                      background:
                        acc.type === "Savings"
                          ? "linear-gradient(135deg, #4ade80, #22c55e)"
                          : acc.type === "Credit"
                          ? "linear-gradient(135deg, #f87171, #ef4444)"
                          : "linear-gradient(135deg, #60a5fa, #3b82f6)",
                    }}
                  />

                  {/* Left Side */}
                  <div className="flex items-center gap-3">
                    {/* Icon Bubble */}
                    <div
                      className="
                        relative z-10 h-10 w-10 rounded-xl flex items-center justify-center 
                        text-white shadow-lg backdrop-blur-md
                      "
                      style={{
                        background:
                          acc.type === "savings"
                            ? "linear-gradient(135deg, #22c55e, #16a34a)"
                            : acc.type === "credit_card"
                            ? "linear-gradient(135deg, #ef4444, #dc2626)"
                            : "linear-gradient(135deg, #3b82f6, #2563eb)",
                      }}
                    >
                      {acc.type === "savings" && "💹"}
                      {acc.type === "credit_card" && "💳"}
                      {acc.type === "cash" && "💵"}
                      {acc.type === "wallet" && "💼"}
                      {!["savings", "credit_card", "cash", "wallet"].includes(acc.type) && "🏦"}
                    </div>

                    {/* Text */}
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {acc.name}
                      </span>

                      <span
                        className="text-[11px] uppercase tracking-wide opacity-70 font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {acc.type}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div
                    className="
                      font-semibold text-base sm:text-lg tracking-tight 
                      group-hover:scale-[1.04] transition-transform duration-300
                    "
                    style={{ color: "var(--text-primary)" }}
                  >
                    {format(parseFloat(acc.balance || "0"))}
                  </div>
                </div>
              ))}
            </div>

          </article>

          {/* Budget Utilization Card */}
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col gap-3 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 focus-within:ring-2 focus-within:ring-offset-1" 
            style={frostedCardStyle}
            aria-labelledby="budget-util-heading">
            <h2 id="budget-util-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-1 flex-shrink-0" style={{ color: "var(--text-primary)" }}>📦 Budget Utilization</h2>
            {budgetUtilizations.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No budgets found for this period</p>
            ) : (
              <ul
                className="space-y-2.5 sm:space-y-3 overflow-y-auto pr-1"
                style={{
                  maxHeight: "400px",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--border-secondary) transparent",
                  paddingRight: "6px"
                }}>
                {sortedBudgetUtilizations.map((b) => {
                  const category = categories.find((c) => c.id === b.categoryId);
                  const isOverBudget = b.percent > 100;
                  const percentDisplay = Math.min(b.percent, 100);
                  return (
                    <li key={b.budgetId}>
                      <div className="flex justify-between mb-1.5 text-xs sm:text-sm font-medium flex-wrap gap-1" style={{ color: "var(--text-secondary)" }}>
                        <span className="flex-shrink-0">{category?.name || "Unknown"}</span>
                        <span className="flex-shrink-0">{b.spent} / {b.amount} ({b.percent}%)</span>
                      </div>
                      <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: "var(--skeleton-base)" }}>
                        <div className="h-3 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${percentDisplay}%`, backgroundColor: isOverBudget ? "var(--color-error)" : "var(--color-success)" }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          {/* Budget Summary Card */}
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col gap-3 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 focus-within:ring-2 focus-within:ring-offset-1" 
            style={frostedCardStyle}
            aria-labelledby="budget-summary-heading">
            <h2 id="budget-summary-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>🧮 Budget Summary</h2>
            {budgetReports?.totals && <SummaryCard totals={budgetReports.totals} />}
          </article>
        </section>

        {/* Charts Section */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6" aria-label="Dashboard charts" role="region">
          {/* Spending Breakdown Pie Chart */}
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl" 
            style={frostedCardStyle}
            aria-labelledby="spending-heading">
            <h2 id="spending-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🍕 Spending Breakdown</h2>
            {loading ? (
              <Loading />
            ) : pieData.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No Transaction found for this period</p>
            ) : (<PieSpendingChart data={pieData} />)}
          </article>

          {/* Daily Flow Line Chart */}
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl" 
            style={frostedCardStyle}
            aria-labelledby="flow-heading">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-3">
              <h2 id="flow-heading" className="text-base sm:text-lg md:text-xl font-semibold" style={{ color: "var(--text-primary)" }}>📊 Daily Flow</h2>
              <button
                onClick={() => setView(view === "income" ? "expense" : "income")}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium min-h-[40px] sm:min-h-[44px] whitespace-nowrap transition-all duration-200 ease-in-out hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95"
                aria-label={view === "income" ? "Switch to expense view" : "Switch to income view"}
                aria-pressed={view === "income"}
                style={{ backgroundColor: "var(--bg-card-hover)", color: "var(--text-primary)", border: "1px solid var(--border-primary)" }}>
                {view === "income" ? "💸 Show Expense" : "💰 Show Income"}
              </button>
            </div>
            {lineData.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No Transaction found for this period</p>
            ) : loadingLineChart ? (
              <Loading />
            ) : (
              <>
                <LineTrendChart data={lineData} view={view} />
                <div className="mt-2 text-center text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                  {view === "income" ? "💰 Viewing Daily Income Trends" : "💸 Viewing Daily Expense Trends"}
                </div>
              </>
            )}
          </article>
        </section>

        {/* Budget vs Actual Section */}
        {budgetReports?.categories && (
          <section className="w-full flex flex-col gap-4 sm:gap-5 md:gap-6" aria-label="Budget vs Actual">
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-2">
              {['all','within_budget', 'overspent', 'no_budget'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ease-in-out min-h-[40px] sm:min-h-[44px] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95"
                  aria-pressed={filter === f}
                  aria-label={`Filter by ${f === 'all' ? 'All Categories' : f === 'within_budget' ? 'Budgeted' : f === 'overspent' ? 'Overspent' : 'Unbudgeted'} categories`}
                  style={{ backgroundColor: filter === f ? "var(--accent-primary)" : "var(--bg-card)", color: filter === f ? "var(--text-inverse)" : "var(--text-primary)", border: `1px solid ${filter === f ? "var(--accent-primary)" : "var(--border-primary)"}`, fontWeight: filter === f ? 600 : 400 }}>
                  {f === 'all' ? 'All Categories' : f === 'within_budget' ? 'Budgeted' : f === 'overspent' ? 'Overspent' : 'Unbudgeted'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              <article 
                className="rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl" 
                style={frostedCardStyle}
                aria-labelledby="budget-cat-heading">
                <h2 id="budget-cat-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>📦 Budget by Category</h2>
                {loadingBudgetReports ? (
                  <Loading />
                ) : (
                  <BarChartComponent data={filteredCategories} />
                )}
              </article>
              <article 
                className="rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl" 
                style={frostedCardStyle}
                aria-labelledby="total-budget-heading">
                <h2 id="total-budget-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🧮 Total Budget Breakdown</h2>
                {loadingBudgetReports ? (
                  <Loading />
                ) : (
                  <PieChartComponent data={budgetReports?.categories || []} />
                )}
              </article>
            </div>
          </section>
        )}

        {/* Cash Flow Reports Section */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6" aria-label="Cash Flow Reports">
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl" 
            style={frostedCardStyle}
            aria-labelledby="cashflow-heading">
            <h2 id="cashflow-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>📈 Cash Flow Timeline</h2>
            {loadingCashflow ? (
              <Loading />
            ) : cashflowData.length > 0 ? (
              <ChashFlowLine data={cashflowData} />
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No cash flow data available for this period</p>
            )}
          </article>
          <article 
            className="rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl" 
            style={frostedCardStyle}
            aria-labelledby="spending-cat-heading">
            <h2 id="spending-cat-heading" className="text-base sm:text-lg md:text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>📊 Spending by Category</h2>
            {loadingCategoryHeatmap ? (
              <Loading />
            ) : catHeatmap.length > 0 ? (
              <CatHeatmapPie data={catHeatmap} />
            ) : (<p style={{ color: "var(--text-muted)" }}>No spending data available for this period</p>)}
          </article>
        </section>
      </main>
    </Layout>
  );
}