import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getSpendingInsights, getAIInsights, getAIUsage, getAIInsightsHistory, getAIInsightById } from "../services/reports";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface SpendingInsights {
  period: {
    start: string;
    end: string;
    days: number;
  };
  comparisonPeriod: {
    start: string;
    end: string;
  } | null;
  summary: {
    totalExpense: number;
    totalIncome: number;
    totalSavings: number;
    netCashflow: number;
    avgDailyExpense: number;
    avgTransactionSize: number;
    transactionCount: number;
  };
  trends: {
    expenseChange: number;
    expenseChangePercent: number;
    incomeChange: number;
    incomeChangePercent: number;
    savingsChange: number;
    avgDailyExpenseChange: number;
  } | null;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  dayOfWeekSpending: Array<{
    day: string;
    totalExpense: number;
    transactionCount: number;
    avgExpense: number;
  }>;
  weeklyTrend: Array<{
    weekStart: string;
    weekEnd: string;
    expense: number;
    income: number;
    savings: number;
    count: number;
    netCashflow: number;
  }>;
  anomalies: Array<{
    date: string;
    amount: number;
    avgDailyExpense: number;
    deviation: number;
    transactionCount: number;
    topTransactions: Array<{
      amount: string;
      category: string;
      description: string;
    }>;
  }>;
  categoryComparison: Array<{
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    previousAmount: number;
    change: number;
    changePercent: number;
    trend: string;
  }> | null;
}

interface AIAnalysis {
  fullAnalysis: string;
  sections: {
    healthAssessment: string;
    keyObservations: string[];
    recommendations: string[];
    budgetSuggestions: string[];
    predictions: string;
  };
  generatedAt: string;
  cached?: boolean;
}

interface AIUsage {
  used: number;
  limit: number;
  remaining: number;
}

export default function Insights() {
  const { format, formatCompact } = useCurrencyFormatter();
  const [insights, setInsights] = useState<SpendingInsights | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; periodStart: string; periodEnd: string; createdAt: string }>>([]);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const formattedMonth = String(selectedMonth).padStart(2, '0');
      const startDate = dayjs(`${selectedYear}-${formattedMonth}-01`);
      const endDate = startDate.endOf('month');

      const data = await getSpendingInsights({
        from: startDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD'),
        compareWithPrevious,
      });

      setInsights(data);
      toast.success("Insights loaded successfully!");
    } catch (error) {
      console.error("Error loading insights:", error);
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    fetchAIUsage();
    // Clear any previously shown AI analysis when filters change
    setAiAnalysis(null);
    setShowAI(false);
  }, [selectedMonth, selectedYear, compareWithPrevious]);

  const fetchAIUsage = async () => {
    try {
      const usage = await getAIUsage(selectedMonth, selectedYear);
      setAiUsage(usage);
      // Also fetch history for the month
      const hist = await getAIInsightsHistory(selectedMonth, selectedYear);
      setHistory(hist);
    } catch (error) {
      console.error("Error fetching AI usage:", error);
    }
  };

  const handleGetAIInsights = async (forceNew = false) => {
    // If forcing new and limit reached, prevent call
    if (forceNew && aiUsage && aiUsage.remaining <= 0) {
      toast.error(`Monthly limit reached (${aiUsage.limit} predictions). View cached insights or try next month.`);
      return;
    }
    setLoadingAI(true);
    try {
      const formattedMonth = String(selectedMonth).padStart(2, '0');
      const startDate = dayjs(`${selectedYear}-${formattedMonth}-01`);
      const endDate = startDate.endOf('month');

      const data = await getAIInsights({
        from: startDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD'),
        compareWithPrevious,
        forceNew,
      });

      setAiAnalysis(data.aiAnalysis);
      if (data.usage) {
        setAiUsage(data.usage);
      }
      setShowAI(true);
      if (data.aiAnalysis?.cached) {
        toast.success("Loaded cached AI analysis");
      } else {
        toast.success("New AI analysis generated");
      }
    } catch (error) {
      console.error("Error generating AI insights:", error);
      // Show backend error message if present
      // @ts-ignore
      const msg = error?.response?.data?.message || "Failed to generate AI insights";
      toast.error(msg);
    } finally {
      setLoadingAI(false);
    }
  };

  const formatPercent = (percent: number) => `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;

  return (
    <Layout>
      <div className="mx-auto p-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg">
          💡 Spending Insights & Trends
        </h1>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-white mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white/20 backdrop-blur-xl border border-white/30 px-3 py-2 rounded-xl text-black hover:bg-white/30 transition"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-white mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white/20 backdrop-blur-xl border border-white/30 px-3 py-2 rounded-xl text-black hover:bg-white/30 transition"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const year = today.getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareWithPrevious}
                  onChange={(e) => setCompareWithPrevious(e.target.checked)}
                  className="rounded w-4 h-4"
                />
                Compare with previous period
              </label>
            </div>

            <div className="ml-auto mt-6 flex items-center gap-3">
              {aiUsage && (
                <div className="text-white text-sm bg-white/10 px-4 py-2 rounded-xl">
                  AI Usage: {aiUsage.used}/{aiUsage.limit} this month
                  {aiUsage.remaining > 0 && (
                    <span className="text-green-400 ml-2">({aiUsage.remaining} left)</span>
                  )}
                  {aiUsage.remaining === 0 && (
                    <span className="text-red-400 ml-2">(limit reached)</span>
                  )}
                </div>
              )}
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm"
                >
                  📚 View Previous Insights
                </button>
              )}
              <button
                onClick={() => handleGetAIInsights(false)}
                disabled={loadingAI || !insights}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold shadow-lg transition-all transform hover:scale-105"
              >
                {loadingAI ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    🤖 Get AI Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <AnimatePresence>
          {showAI && aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-2xl shadow-xl rounded-3xl border border-purple-500/30 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🤖 AI Financial Analysis
                  </h2>
                  {aiAnalysis.cached && (
                    <span className="text-xs bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-500/50">
                      📦 Cached
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {aiAnalysis.cached && aiUsage && aiUsage.remaining > 0 && (
                    <button
                      onClick={() => handleGetAIInsights(true)}
                      disabled={loadingAI}
                      className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-white transition"
                      title="Generate fresh analysis (uses 1 credit)"
                    >
                      🔄 Regenerate
                    </button>
                  )}
                  <button
                    onClick={() => setShowAI(false)}
                    className="text-white/70 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Health Assessment */}
              {aiAnalysis.sections.healthAssessment && (
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <h3 className="text-lg font-bold text-white mb-2">💊 Financial Health</h3>
                  <p className="text-white/90">{aiAnalysis.sections.healthAssessment}</p>
                </div>
              )}

              {/* Key Observations */}
              {aiAnalysis.sections.keyObservations.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <h3 className="text-lg font-bold text-white mb-3">🔍 Key Observations</h3>
                  <ul className="space-y-2">
                    {aiAnalysis.sections.keyObservations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/90">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {aiAnalysis.sections.recommendations.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <h3 className="text-lg font-bold text-white mb-3">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {aiAnalysis.sections.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/90">
                        <span className="text-green-400 font-bold mt-1">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Budget Suggestions */}
              {aiAnalysis.sections.budgetSuggestions.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <h3 className="text-lg font-bold text-white mb-3">💰 Budget Suggestions</h3>
                  <ul className="space-y-2">
                    {aiAnalysis.sections.budgetSuggestions.map((sug, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/90">
                        <span className="text-blue-400 mt-1">→</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Predictions */}
              {aiAnalysis.sections.predictions && (
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-white mb-2">🔮 Predictions</h3>
                  <p className="text-white/90">{aiAnalysis.sections.predictions}</p>
                </div>
              )}

              <div className="text-xs text-white/50 mt-4 text-center">
                Generated at {dayjs(aiAnalysis.generatedAt).format('MMM DD, YYYY HH:mm')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Modal */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white text-xl font-bold">Previous AI Insights</h3>
                  <button className="text-white/70 hover:text-white" onClick={() => setShowHistory(false)}>✕</button>
                </div>
                <div className="space-y-2">
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={async () => {
                        try {
                          const data = await getAIInsightById(item.id);
                          setAiAnalysis(data);
                          setShowAI(true);
                          setShowHistory(false);
                          toast.success("Loaded previous AI insight");
                        } catch (e) {
                          toast.error("Failed to load previous insight");
                        }
                      }}
                      className="w-full text-left bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl"
                    >
                      <div className="flex justify-between">
                        <span>
                          {dayjs(item.periodStart).format('MMM DD')} - {dayjs(item.periodEnd).format('MMM DD')}
                        </span>
                        <span className="text-white/70 text-sm">
                          {dayjs(item.createdAt).format('MMM DD, YYYY HH:mm')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="text-center text-white text-xl py-12">Loading insights...</div>
        )}

        {!loading && insights && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Total Expense"
                value={format(insights.summary.totalExpense)}
                change={insights.trends?.expenseChange}
                changePercent={insights.trends?.expenseChangePercent}
                icon="💸"
                color="red"
              />
              <SummaryCard
                title="Total Income"
                value={format(insights.summary.totalIncome)}
                change={insights.trends?.incomeChange}
                changePercent={insights.trends?.incomeChangePercent}
                icon="💰"
                color="green"
              />
              <SummaryCard
                title="Net Cashflow"
                value={format(insights.summary.netCashflow)}
                icon="📊"
                color="blue"
              />
              <SummaryCard
                title="Avg Daily Expense"
                value={format(insights.summary.avgDailyExpense)}
                change={insights.trends?.avgDailyExpenseChange}
                icon="📅"
                color="purple"
              />
            </div>

            {/* Top Categories */}
            <div className="bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">🏆 Top Spending Categories</h2>
              <div className="space-y-3">
                {insights.topCategories.slice(0, 5).map((cat, idx) => (
                  <div key={cat.categoryId} className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white/50 w-8">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-semibold">{cat.categoryName}</span>
                        <span className="text-white font-bold">{format(cat.amount)}</span>
                      </div>
                      <div className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percentage}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-white/70 mt-1">
                        <span>{cat.count} transactions</span>
                        <span>{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day of Week Pattern */}
            <div className="bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">📆 Spending by Day of Week</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {insights.dayOfWeekSpending.map((day) => (
                  <div key={day.day} className="bg-white/10 rounded-xl p-4 text-center">
                    <div className="text-white font-semibold mb-2">{day.day.slice(0, 3)}</div>
                    <div className="text-2xl font-bold text-white">{format(day.totalExpense)}</div>
                    <div className="text-xs text-white/70 mt-1">{day.transactionCount} txns</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Trend */}
            {insights.weeklyTrend.length > 0 && (
              <div className="bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">📈 Weekly Trend</h2>
                <div className="space-y-3">
                  {insights.weeklyTrend.map((week) => (
                    <div key={week.weekStart} className="bg-white/10 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-semibold">
                          {dayjs(week.weekStart).format('MMM DD')} - {dayjs(week.weekEnd).format('MMM DD')}
                        </span>
                        <span className={clsx(
                          "font-bold",
                          week.netCashflow >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {format(week.netCashflow)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-400">Income: {format(week.income)}</span>
                        <span className="text-red-400">Expense: {format(week.expense)}</span>
                        <span className="text-blue-400">Savings: {format(week.savings)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies */}
            {insights.anomalies.length > 0 && (
              <div className="bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">⚠️ Unusual Spending Days</h2>
                <div className="space-y-3">
                  {insights.anomalies.map((anomaly) => (
                    <div key={anomaly.date} className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-semibold">{dayjs(anomaly.date).format('MMM DD, YYYY')}</span>
                        <span className="text-red-300 font-bold">{format(anomaly.amount)}</span>
                      </div>
                      <div className="text-sm text-white/80 mb-2">
                        {formatPercent(anomaly.deviation)} higher than average ({format(anomaly.avgDailyExpense)})
                      </div>
                      <div className="text-xs text-white/70">
                        Top transactions: {anomaly.topTransactions.map(t => t.category).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Comparison */}
            {insights.categoryComparison && insights.categoryComparison.length > 0 && (
              <div className="bg-white/10 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/20 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">📊 Category Changes vs Previous Period</h2>
                <div className="space-y-2">
                  {insights.categoryComparison.slice(0, 8).map((cat) => (
                    <div key={cat.categoryId} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                      <div className="flex-1">
                        <span className="text-white font-semibold">{cat.categoryName}</span>
                        <div className="flex gap-4 text-xs text-white/70 mt-1">
                          <span>Current: {format(cat.currentAmount)}</span>
                          <span>Previous: {format(cat.previousAmount)}</span>
                        </div>
                      </div>
                      <div className={clsx(
                        "font-bold text-lg",
                        cat.trend === 'increased' ? "text-red-400" :
                        cat.trend === 'decreased' ? "text-green-400" :
                        cat.trend === 'new' ? "text-blue-400" :
                        cat.trend === 'stopped' ? "text-gray-400" :
                        "text-white"
                      )}>
                        {cat.trend === 'new' ? '🆕' : 
                         cat.trend === 'stopped' ? '🛑' :
                         formatPercent(cat.changePercent)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function SummaryCard({
  title,
  value,
  change,
  changePercent,
  icon,
  color,
}: {
  title: string;
  value: string;
  change?: number;
  changePercent?: number;
  icon: string;
  color: string;
}) {
  const { format } = useCurrencyFormatter();
  const colorClasses = {
    red: 'from-red-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-indigo-500',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-3xl p-6 shadow-xl`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-4xl">{icon}</span>
        {change !== undefined && changePercent !== undefined && (
          <span className={clsx(
            "text-sm font-bold px-2 py-1 rounded-lg bg-white/20",
            change >= 0 ? "text-white" : "text-white"
          )}>
            {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-white/80 text-sm mb-1">{title}</div>
      <div className="text-white font-bold text-2xl">{value}</div>
      {change !== undefined && (
        <div className="text-white/70 text-xs mt-2">
          {change >= 0 ? '↑' : '↓'} {format(Math.abs(change))} vs previous
        </div>
      )}
    </div>
  );
}
