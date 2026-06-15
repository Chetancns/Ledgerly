import Layout from "../components/Layout";
import Loading from "@/components/Loading";
import {
  BarChartComponent,
  BudgetUtilizationRadialList,
  CatHeatmapPie,
  ChashFlowLine,
  IncomeExpenseComparisonChart,
  LineTrendChart,
  PieChartComponent,
  PieSpendingChart,
  SavingsRateTrendChart,
  TopExpenseCategoriesChart,
} from "@/components/Chart";
import AccountRail from "@/components/dashboard/AccountRail";
import BudgetHealthRing from "@/components/dashboard/BudgetHealthRing";
import FilterToolbar from "@/components/dashboard/FilterToolbar";
import KpiStrip from "@/components/dashboard/KpiStrip";
import SpendingHeatmap from "@/components/dashboard/SpendingHeatmap";
import { Transaction } from "@/models/Transaction";
import { Account } from "@/models/account";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Category } from "@/models/category";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { getTransactions } from "@/services/transactions";
import { CashflowRow, CategoryRow, CategorySpending, ChartDataPoint, DailyTotals } from "@/models/chat";
import { getBudgetUtilizations } from "@/services/budget";
import { getBudgetReports, getCashflowTimeline, getCategoryHeatmap } from "@/services/reports";
import toast from "react-hot-toast";
import { BudgetCategory, BudgetReports, BudgetUtilization } from "@/models/budget";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { AnimatePresence, motion } from "framer-motion";
import type { IconType } from "react-icons";
import {
  RiBarChartGroupedLine,
  RiCalendarLine,
  RiExchangeDollarLine,
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiWallet3Line,
} from "react-icons/ri";
import SegmentedControl from "@/components/SegmentedControl";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type BudgetFilter = "all" | "overspent" | "within_budget" | "no_budget";

function calculateSavingsRate(income: number, expense: number) {
  return income > 0 ? ((income - expense) / income) * 100 : 0;
}

function AnalyticsCard({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle: string;
  icon: IconType;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      whileHover={{ y: -2, boxShadow: "var(--shadow-lg)" }}
      className={`dashboard-surface p-4 sm:p-6 ${className}`.trim()}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="dashboard-section-heading">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Icon className="text-lg" />
              <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

export default function Dashboard() {
  const [today] = useState(() => new Date());
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const { format } = useCurrencyFormatter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetUtilizations, setBudgetUtilizations] = useState<BudgetUtilization[]>([]);
  const [budgetReports, setBudgetReports] = useState<BudgetReports | null>(null);
  const [cashflowData, setCashFlowData] = useState<CashflowRow[]>([]);
  const [catHeatmap, setCatHeatmap] = useState<CategoryRow[]>([]);
  const [hideBalances, setHideBalances] = useState(true);
  const [visibleAccountIds, setVisibleAccountIds] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetView, setBudgetView] = useState<"income" | "expense">("expense");
  const [filter, setFilter] = useState<BudgetFilter>("all");
  const [trendView, setTrendView] = useState<"income" | "expense">("expense");

  const loadCoreDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [accountResponse, categoryResponse, transactionResponse] = await Promise.all([
        getUserAccount(),
        getUserCategory(),
        getTransactions(),
      ]);

      setAccounts(accountResponse);
      setCategories(categoryResponse);
      setTransactions(transactionResponse);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBudgetUtilizations = useCallback(async () => {
    try {
      const response = await getBudgetUtilizations(selectedMonth, selectedYear, "monthly");
      setBudgetUtilizations(response);
    } catch (loadError) {
      console.error("Failed to load budget utilization", loadError);
    }
  }, [selectedMonth, selectedYear]);

  const loadBudgetReports = useCallback(async () => {
    try {
      const response = await getBudgetReports("monthly", selectedMonth, selectedYear);
      setBudgetReports(response);
    } catch (loadError) {
      console.error("Failed to load budget reports", loadError);
    }
  }, [selectedMonth, selectedYear]);

  const loadCashflow = useCallback(async () => {
    try {
      const response = await getCashflowTimeline("daily", selectedMonth, selectedYear);
      setCashFlowData(response.timeline);
    } catch (loadError) {
      console.error("Failed to load cashflow timeline", loadError);
    }
  }, [selectedMonth, selectedYear]);

  const loadCategoryHeatmap = useCallback(async () => {
    try {
      const response = await getCategoryHeatmap(selectedMonth, selectedYear);
      setCatHeatmap(response.categories);
    } catch (loadError) {
      console.error("Failed to load category heatmap", loadError);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    try {
      const storedHideBalances = localStorage.getItem("ledgerly:dashboard:hideBalances");
      if (storedHideBalances !== null) {
        setHideBalances(storedHideBalances === "true");
      }

      const storedVisibleAccounts = localStorage.getItem("ledgerly:dashboard:visibleAccounts");
      if (storedVisibleAccounts) {
        const parsed = JSON.parse(storedVisibleAccounts) as unknown;
        if (Array.isArray(parsed)) {
          setVisibleAccountIds(parsed.filter((value): value is string => typeof value === "string"));
        }
      }
    } catch (storageError) {
      console.error("Failed to restore dashboard preferences", storageError);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ledgerly:dashboard:hideBalances", String(hideBalances));
    } catch (storageError) {
      console.error("Failed to persist balance visibility", storageError);
    }
  }, [hideBalances]);

  useEffect(() => {
    try {
      localStorage.setItem("ledgerly:dashboard:visibleAccounts", JSON.stringify(visibleAccountIds));
    } catch (storageError) {
      console.error("Failed to persist account visibility", storageError);
    }
  }, [visibleAccountIds]);

  useEffect(() => {
    void loadCoreDashboard();
  }, [loadCoreDashboard]);

  useEffect(() => {
    void Promise.all([
      loadBudgetUtilizations(),
      loadBudgetReports(),
      loadCashflow(),
      loadCategoryHeatmap(),
    ]);
  }, [loadBudgetUtilizations, loadBudgetReports, loadCashflow, loadCategoryHeatmap]);

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((first, second) =>
        (first.name || "").localeCompare(second.name || "", undefined, {
          sensitivity: "base",
        })
      ),
    [accounts]
  );

  const categoryTypeMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.type])),
    [categories]
  );

  const categoryNameMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name || "Unknown"])),
    [categories]
  );

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    [accounts]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.transactionDate);
        const matchesMonth = transactionDate.getUTCMonth() + 1 === selectedMonth;
        const matchesYear = transactionDate.getUTCFullYear() === selectedYear;
        const matchesAccount =
          selectedAccount === "all" || transaction.accountId === selectedAccount;
        return matchesMonth && matchesYear && matchesAccount;
      }),
    [selectedAccount, selectedMonth, selectedYear, transactions]
  );

  const dailyTotals = useMemo(() => {
    const totals: DailyTotals = {};

    filteredTransactions.forEach((transaction) => {
      const dateKey = transaction.transactionDate.split("T")[0];
      if (!totals[dateKey]) {
        totals[dateKey] = { income: 0, expense: 0, creditCardExpense: 0 };
      }

      const amount = Number(transaction.amount || 0);
      if (transaction.type === "income") {
        totals[dateKey].income += amount;
      } else if (transaction.type === "expense") {
        totals[dateKey].expense += amount;
      }
    });

    return totals;
  }, [filteredTransactions]);

  const lineData = useMemo<ChartDataPoint[]>(
    () =>
      Object.entries(dailyTotals)
        .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
        .map(([date, totals]) => {
          const [, monthPart, dayPart] = date.split("-");
          return {
            date: `${Number(monthPart)}/${dayPart}`,
            income: totals.income,
            expense: totals.expense,
            creditCardExpense: totals.creditCardExpense,
          };
        }),
    [dailyTotals]
  );

  const pieData = useMemo<CategorySpending[]>(() => {
    const totals = new Map<string, number>();

    filteredTransactions.forEach((transaction) => {
      if (transaction.type !== "expense") return;
      const categoryName = categoryNameMap.get(transaction.categoryId) || "Unknown";
      const currentValue = totals.get(categoryName) || 0;
      totals.set(categoryName, currentValue + Number(transaction.amount || 0));
    });

    return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
  }, [categoryNameMap, filteredTransactions]);

  const monthIncome = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, transaction) =>
          transaction.type === "income" ? sum + Number(transaction.amount || 0) : sum,
        0
      ),
    [filteredTransactions]
  );

  const monthExpense = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, transaction) =>
          transaction.type === "expense" ? sum + Number(transaction.amount || 0) : sum,
        0
      ),
    [filteredTransactions]
  );

  const savingsRate = calculateSavingsRate(monthIncome, monthExpense);

  const selectedPeriodEnd = useMemo(() => {
    const isCurrentPeriod =
      selectedMonth === currentMonth && selectedYear === currentYear;
    return isCurrentPeriod ? today : new Date(selectedYear, selectedMonth, 0);
  }, [currentMonth, currentYear, selectedMonth, selectedYear, today]);

  const sevenDaySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const currentDate = new Date(selectedPeriodEnd);
      currentDate.setDate(selectedPeriodEnd.getDate() - (6 - index));
      const key = currentDate.toISOString().split("T")[0];
      const totals = dailyTotals[key] || { income: 0, expense: 0, creditCardExpense: 0 };
      return {
        label: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
        income: totals.income,
        expense: totals.expense,
        net: totals.income - totals.expense,
      };
    });

    let runningNet = totalBalance - days.reduce((sum, item) => sum + item.net, 0);
    return days.map((item) => {
      runningNet += item.net;
      const rate = calculateSavingsRate(item.income, item.expense);
      return {
        label: item.label,
        income: item.income,
        expense: item.expense,
        netWorth: runningNet,
        savingsRate: rate,
      };
    });
  }, [dailyTotals, selectedPeriodEnd, totalBalance]);

  const kpiCards = useMemo(
    () => [
      {
        id: "net-worth",
        label: "Net Worth",
        value: totalBalance,
        helper: `${sortedAccounts.length} account${sortedAccounts.length === 1 ? "" : "s"} tracked`,
        icon: <RiWallet3Line className="text-xl" />,
        sparkline: sevenDaySeries.map((item) => ({ label: item.label, value: item.netWorth })),
        accent: "#38bdf8",
      },
      {
        id: "spent",
        label: "This Month Spent",
        value: monthExpense,
        helper: "Total outgoing spend in the active period",
        icon: <RiExchangeDollarLine className="text-xl" />,
        sparkline: sevenDaySeries.map((item) => ({ label: item.label, value: item.expense })),
        accent: "#34d399",
      },
      {
        id: "earned",
        label: "This Month Earned",
        value: monthIncome,
        helper: "Income captured during the active period",
        icon: <RiMoneyDollarCircleLine className="text-xl" />,
        sparkline: sevenDaySeries.map((item) => ({ label: item.label, value: item.income })),
        accent: "#22d3ee",
      },
      {
        id: "savings-rate",
        label: "Savings Rate",
        value: savingsRate,
        helper: "Share of income kept after expenses",
        icon: <RiLineChartLine className="text-xl" />,
        formatAs: "percent" as const,
        sparkline: sevenDaySeries.map((item) => ({ label: item.label, value: item.savingsRate })),
        accent: "#a78bfa",
      },
    ],
    [monthExpense, monthIncome, savingsRate, sevenDaySeries, sortedAccounts.length, totalBalance]
  );

  const comparisonData = useMemo(() => {
    const baseDate = new Date(selectedYear, selectedMonth - 1, 1);

    return Array.from({ length: 6 }, (_, index) => {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - (5 - index), 1);
      const label = `${MONTHS[current.getMonth()]} ${String(current.getFullYear()).slice(-2)}`;

      const summary = transactions.reduce(
        (accumulator, transaction) => {
          const transactionDate = new Date(transaction.transactionDate);
          const matchesMonth = transactionDate.getUTCMonth() === current.getMonth();
          const matchesYear = transactionDate.getUTCFullYear() === current.getFullYear();
          const matchesAccount =
            selectedAccount === "all" || transaction.accountId === selectedAccount;

          if (!matchesMonth || !matchesYear || !matchesAccount) return accumulator;

          const amount = Number(transaction.amount || 0);
          if (transaction.type === "income") {
            accumulator.income += amount;
          } else if (transaction.type === "expense") {
            accumulator.expense += amount;
          }

          return accumulator;
        },
        { income: 0, expense: 0 }
      );

      return {
        label,
        income: summary.income,
        expense: summary.expense,
        net: summary.income - summary.expense,
      };
    });
  }, [selectedAccount, selectedMonth, selectedYear, transactions]);

  const savingsRateTrend = useMemo(
    () =>
      comparisonData.map((item) => ({
        label: item.label,
        rate: calculateSavingsRate(item.income, item.expense),
      })),
    [comparisonData]
  );

  const topExpenseCategories = useMemo(
    () => [...pieData].sort((first, second) => second.value - first.value).slice(0, 5),
    [pieData]
  );

  const filteredCategories = useMemo(
    () =>
      (budgetReports?.categories || []).filter((category: BudgetCategory) => {
        if (filter === "all") return true;
        return category.status === filter;
      }),
    [budgetReports?.categories, filter]
  );

  const filteredBudgetByType = useMemo(
    () =>
      filteredCategories.filter((category) => categoryTypeMap.get(category.categoryId) === budgetView),
    [budgetView, categoryTypeMap, filteredCategories]
  );

  const budgetOverspentAmount = useMemo(() => {
    if (!budgetReports?.categories) return 0;
    return budgetReports.categories
      .filter((category) => category.status === "overspent")
      .reduce((sum, category) => sum + Math.max(category.actual - category.budget, 0), 0);
  }, [budgetReports?.categories]);

  const prioritizedBudgetUtilizations = useMemo(
    () => [...budgetUtilizations].sort((first, second) => second.percent - first.percent).slice(0, 4),
    [budgetUtilizations]
  );

  const handleRetry = useCallback(async () => {
    await Promise.all([
      loadCoreDashboard(),
      loadBudgetUtilizations(),
      loadBudgetReports(),
      loadCashflow(),
      loadCategoryHeatmap(),
    ]);
    toast.success("Dashboard reloaded");
  }, [
    loadCategoryHeatmap,
    loadBudgetReports,
    loadBudgetUtilizations,
    loadCashflow,
    loadCoreDashboard,
  ]);

  const toggleAccountVisibility = useCallback((accountId: string) => {
    setVisibleAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId]
    );
  }, []);

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Financial overview
            </p>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                  Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
                  A cleaner, insight-first view of your money with richer trends, account drill-downs,
                  and budget health at a glance.
                </p>
              </div>
              <div className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </div>
            </div>
          </div>

          {error && (
            <div className="dashboard-surface flex flex-col gap-3 border-[var(--color-error)] bg-[var(--color-error-bg)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-error)]">Dashboard data failed to load</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleRetry()}
                className="dashboard-filter-pill inline-flex items-center justify-center"
              >
                Retry
              </button>
            </div>
          )}

          <KpiStrip cards={kpiCards} />

          <FilterToolbar
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedAccount={selectedAccount}
            accounts={sortedAccounts}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onAccountChange={setSelectedAccount}
          />

          <AccountRail
            accounts={sortedAccounts}
            totalBalance={totalBalance}
            hideBalances={hideBalances}
            visibleAccountIds={visibleAccountIds}
            onToggleHideBalances={() => setHideBalances((current) => !current)}
            onToggleAccountVisibility={toggleAccountVisibility}
            formatBalance={format}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedMonth}-${selectedYear}-${selectedAccount}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
                <AnalyticsCard
                  title="Income vs expense"
                  subtitle="Six months of incoming vs outgoing money with net savings overlaid."
                  icon={RiBarChartGroupedLine}
                >
                  {comparisonData.some((item) => item.income > 0 || item.expense > 0) ? (
                    <IncomeExpenseComparisonChart data={comparisonData} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No transaction data for the last six months.</p>
                  )}
                </AnalyticsCard>

                <AnalyticsCard
                  title="Budget health"
                  subtitle="Track how much of your planned spend is already used this month."
                  icon={RiMoneyDollarCircleLine}
                >
                  {budgetReports?.totals ? (
                    <BudgetHealthRing
                      totalBudget={budgetReports.totals.totalBudgetExpense}
                      totalActual={budgetReports.totals.totalActualExpense}
                      overspentAmount={budgetOverspentAmount}
                      unbudgetedAmount={budgetReports.totals.unbudgeted}
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Budget health will appear once budget data is available.</p>
                  )}
                </AnalyticsCard>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AnalyticsCard
                  title="Spending breakdown"
                  subtitle="Donut view for the current period so major categories stand out faster."
                  icon={RiExchangeDollarLine}
                >
                  {pieData.length > 0 ? (
                    <PieSpendingChart data={pieData} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No expense transactions found in this period.</p>
                  )}
                </AnalyticsCard>

                <AnalyticsCard
                  title="Savings rate trend"
                  subtitle="See whether your saving behavior is improving over the last six months."
                  icon={RiLineChartLine}
                >
                  {savingsRateTrend.some((item) => item.rate !== 0) ? (
                    <SavingsRateTrendChart data={savingsRateTrend} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Not enough income history yet to plot savings rate.</p>
                  )}
                </AnalyticsCard>
              </div>

              <AnalyticsCard
                title="Daily flow"
                subtitle="Switch between income and expense to inspect short-term movement inside the selected month."
                icon={RiCalendarLine}
                action={
                  <SegmentedControl
                    options={[
                      { value: "expense", label: "Expense" },
                      { value: "income", label: "Income" },
                    ]}
                    value={trendView}
                    onChange={(value) => setTrendView(value as "income" | "expense")}
                    size="sm"
                    className="w-full sm:w-[220px]"
                  />
                }
              >
                {lineData.length > 0 ? (
                  <LineTrendChart data={lineData} view={trendView} />
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No daily transaction trends for this month yet.</p>
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Cash flow timeline"
                subtitle="Wider timeline for income, expenses, savings, and net change across the month."
                icon={RiLineChartLine}
              >
                {cashflowData.length > 0 ? (
                  <ChashFlowLine data={cashflowData} />
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Cash flow data is still loading or unavailable for this period.</p>
                )}
              </AnalyticsCard>

              <div className="grid gap-6 lg:grid-cols-2">
                <AnalyticsCard
                  title="Budget utilization"
                  subtitle="Highest-usage budgets surface first so you can spot pressure points quickly."
                  icon={RiMoneyDollarCircleLine}
                >
                  {prioritizedBudgetUtilizations.length > 0 ? (
                    <BudgetUtilizationRadialList
                      data={prioritizedBudgetUtilizations}
                      categoryNames={categoryNameMap}
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No budget utilization found for this period.</p>
                  )}
                </AnalyticsCard>

                <AnalyticsCard
                  title="Top expense categories"
                  subtitle="Ranked categories make it easier to see what is driving spend."
                  icon={RiBarChartGroupedLine}
                >
                  {topExpenseCategories.length > 0 ? (
                    <TopExpenseCategoriesChart data={topExpenseCategories} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Need more expense activity to rank categories.</p>
                  )}
                </AnalyticsCard>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AnalyticsCard
                  title="Budget vs actual"
                  subtitle="Compare budgeted and actual amounts by category, with overspending highlighted."
                  icon={RiMoneyDollarCircleLine}
                  action={
                    <SegmentedControl
                      options={[
                        { value: "expense", label: "Expense" },
                        { value: "income", label: "Income" },
                      ]}
                      value={budgetView}
                      onChange={(value) => setBudgetView(value as "income" | "expense")}
                      size="sm"
                      className="w-full sm:w-[220px]"
                    />
                  }
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(["all", "within_budget", "overspent", "no_budget"] as BudgetFilter[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilter(status)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          filter === status
                            ? "bg-[var(--accent-soft)] text-[var(--nav-active)]"
                            : "border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        {status === "all"
                          ? "All categories"
                          : status === "within_budget"
                            ? "Budgeted"
                            : status === "overspent"
                              ? "Overspent"
                              : "Unbudgeted"}
                      </button>
                    ))}
                  </div>

                  {filteredBudgetByType.length > 0 ? (
                    <BarChartComponent data={filteredBudgetByType} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No {budgetView} categories found for this filter.</p>
                  )}
                </AnalyticsCard>

                <AnalyticsCard
                  title="Category concentration"
                  subtitle="See which categories account for the largest share of this month's totals."
                  icon={RiExchangeDollarLine}
                >
                  {catHeatmap.length > 0 ? (
                    <CatHeatmapPie data={catHeatmap} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Category concentration data is unavailable right now.</p>
                  )}
                </AnalyticsCard>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AnalyticsCard
                  title="Budget mix"
                  subtitle="A quick split of overspent, on-track, and unbudgeted categories."
                  icon={RiMoneyDollarCircleLine}
                >
                  {budgetReports?.categories?.length ? (
                    <PieChartComponent data={budgetReports.categories} />
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Budget mix will appear once categories have budget activity.</p>
                  )}
                </AnalyticsCard>

                <AnalyticsCard
                  title="Transaction activity heatmap"
                  subtitle="A calendar-style view of how often money moved each day this month."
                  icon={RiCalendarLine}
                >
                  <SpendingHeatmap
                    transactions={filteredTransactions}
                    month={selectedMonth}
                    year={selectedYear}
                  />
                </AnalyticsCard>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
