import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import {
  getTagInsightsSummary,
  TagInsightsSummary,
} from "@/services/tags";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Tag as TagIcon, TrendingUp, DollarSign, Package } from "lucide-react";

dayjs.extend(quarterOfYear);

export default function TagInsightsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const formatCurrency = useCurrencyFormatter();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TagInsightsSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month");
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user, dateRange]);

  useEffect(() => {
    // Update date range when period changes
    const now = dayjs();
    switch (selectedPeriod) {
      case "month":
        setDateRange({
          from: now.startOf("month").format("YYYY-MM-DD"),
          to: now.endOf("month").format("YYYY-MM-DD"),
        });
        break;
      case "quarter":
        setDateRange({
          from: now.startOf("quarter").format("YYYY-MM-DD"),
          to: now.endOf("quarter").format("YYYY-MM-DD"),
        });
        break;
      case "year":
        setDateRange({
          from: now.startOf("year").format("YYYY-MM-DD"),
          to: now.endOf("year").format("YYYY-MM-DD"),
        });
        break;
    }
  }, [selectedPeriod]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const res = await getTagInsightsSummary(dateRange);
      setSummary(res.data);
    } catch (error) {
      toast.error("Failed to load tag insights");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            <TagIcon size={32} />
            Tag Insights & Analytics
          </h1>
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Analyze your spending patterns across different tags
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-4 items-center">
          <label className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Period:
          </label>
          <div className="flex gap-2">
            {[
              { value: "month", label: "This Month" },
              { value: "quarter", label: "This Quarter" },
              { value: "year", label: "This Year" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value as any)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedPeriod === period.value
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Total Tags
                  </h3>
                  <TagIcon size={20} className="text-blue-500" />
                </div>
                <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {summary.summary.totalTags}
                </p>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {summary.summary.usedTags} active
                </p>
              </div>

              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Transactions
                  </h3>
                  <Package size={20} className="text-green-500" />
                </div>
                <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {summary.summary.totalTransactions}
                </p>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  with tags
                </p>
              </div>

              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Total Spent
                  </h3>
                  <DollarSign size={20} className="text-orange-500" />
                </div>
                <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {formatCurrency.format(summary.summary.totalSpent)}
                </p>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  across all tags
                </p>
              </div>

              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Top Tag
                  </h3>
                  <TrendingUp size={20} className="text-purple-500" />
                </div>
                {summary.topTag ? (
                  <>
                    <p className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {summary.topTag.tagName}
                    </p>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      {formatCurrency.format(summary.topTag.totalSpent)}
                    </p>
                  </>
                ) : (
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    No data
                  </p>
                )}
              </div>
            </div>

            {/* Spending by Tag - Bar Chart */}
            {summary.spendingByTag.length > 0 && (
              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Spending by Tag
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.spendingByTag}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#E5E7EB"} />
                    <XAxis dataKey="tagName" stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} />
                    <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                        border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
                        borderRadius: "0.5rem",
                      }}
                      labelStyle={{ color: theme === "dark" ? "#F3F4F6" : "#1F2937" }}
                      formatter={(value: number) => [formatCurrency.format(value), "Spent"]}
                    />
                    <Legend />
                    <Bar dataKey="totalSpent" fill="#3B82F6" name="Amount Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Spending Distribution - Pie Chart */}
            {summary.spendingByTag.length > 0 && (
              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Spending Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={summary.spendingByTag}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ tagName, percent }) =>
                        `${tagName} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="totalSpent"
                    >
                      {summary.spendingByTag.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.tagColor || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                        border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
                        borderRadius: "0.5rem",
                      }}
                      formatter={(value: number) => [formatCurrency.format(value), "Spent"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tag List */}
            {summary.spendingByTag.length > 0 && (
              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Tag Details
                </h3>
                <div className="space-y-3">
                  {summary.spendingByTag.map((tag, index) => (
                    <div
                      key={tag.tagId}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.tagColor }}
                        />
                        <div>
                          <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {tag.tagName}
                          </p>
                          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            {tag.transactionCount} transaction{tag.transactionCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          {formatCurrency.format(tag.totalSpent)}
                        </p>
                        <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                          {((tag.totalSpent / summary.summary.totalSpent) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.spendingByTag.length === 0 && (
              <div className={`text-center py-12 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                <TagIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tag data available for this period</p>
                <p className="text-sm mt-2">Start adding tags to your transactions to see insights here</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
