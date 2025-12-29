import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import {
  getTagInsightsSummary,
  TagInsightsSummary,
  getAllTags,
  Tag,
  getTagTrends,
  getCategoryBreakdownByTag,
  getTagStats,
  TagTrend,
  CategoryBreakdown,
  TagStats,
} from "@/services/tags";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Tag as TagIcon, TrendingUp, DollarSign, Package, ChevronDown } from "lucide-react";

dayjs.extend(quarterOfYear);

export default function TagInsightsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const formatCurrency = useCurrencyFormatter();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TagInsightsSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year" | "all">("month");
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  });
  
  // New state for single tag analysis
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagStats, setTagStats] = useState<TagStats | null>(null);
  const [tagTrends, setTagTrends] = useState<TagTrend[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadTags();
      loadInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      case "all":
        // For "all time", don't set date range
        setDateRange({
          from: "",
          to: "",
        });
        break;
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (selectedTag) {
      loadTagDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag, dateRange]);

  const loadTags = async () => {
    try {
      const res = await getAllTags(false);
      setTags(res.data);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  };

  const loadInsights = async () => {
    try {
      setLoading(true);
      const params = dateRange.from && dateRange.to ? dateRange : undefined;
      const res = await getTagInsightsSummary(params);
      setSummary(res.data);
    } catch (err) {
      toast.error("Failed to load tag insights");
      console.error("Failed to load tag insights:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTagDetails = async () => {
    if (!selectedTag) return;
    
    try {
      setLoading(true);
      const params = dateRange.from && dateRange.to ? dateRange : undefined;
      
      const [statsRes, trendsRes, categoriesRes] = await Promise.all([
        getTagStats(selectedTag.id),
        getTagTrends(selectedTag.id, 12), // Get 12 months of trends
        getCategoryBreakdownByTag(selectedTag.id, params),
      ]);
      
      setTagStats(statsRes.data);
      setTagTrends(trendsRes.data);
      setCategoryBreakdown(categoriesRes.data);
    } catch (err) {
      toast.error("Failed to load tag details");
      console.error("Failed to load tag details:", err);
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

        {/* Tag Selector and Period Selector */}
        <div className="mb-6 space-y-4">
          {/* Tag Selector */}
          <div className="flex gap-4 items-center flex-wrap">
            <label className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Select Tag:
            </label>
            <div className="relative">
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className={`px-4 py-2 rounded-md flex items-center gap-2 min-w-[200px] justify-between transition-colors ${
                  theme === "dark"
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                }`}
              >
                {selectedTag ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedTag.color }}
                    />
                    <span>{selectedTag.name}</span>
                  </div>
                ) : (
                  <span>All Tags Overview</span>
                )}
                <ChevronDown size={16} />
              </button>
              
              {showTagDropdown && (
                <div
                  className={`absolute z-10 mt-2 w-full rounded-lg border shadow-lg max-h-60 overflow-auto ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedTag(null);
                      setShowTagDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 transition-colors ${
                      !selectedTag
                        ? theme === "dark"
                          ? "bg-blue-900"
                          : "bg-blue-100"
                        : theme === "dark"
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    All Tags Overview
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTag(tag);
                        setShowTagDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                        selectedTag?.id === tag.id
                          ? theme === "dark"
                            ? "bg-blue-900"
                            : "bg-blue-100"
                          : theme === "dark"
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-4 items-center flex-wrap">
            <label className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Period:
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "month", label: "This Month" },
                { value: "quarter", label: "This Quarter" },
                { value: "year", label: "This Year" },
                { value: "all", label: "All Time" },
              ].map((period: { value: string; label: string }) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value as "month" | "quarter" | "year" | "all")}
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
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedTag ? (
          // Single Tag Detailed View
          <div className="space-y-6">
            {/* Tag Header */}
            <div
              className={`p-6 rounded-lg shadow-md ${
                theme === "dark" ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: selectedTag.color }}
                />
                <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {selectedTag.name}
                </h2>
              </div>
              {selectedTag.description && (
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {selectedTag.description}
                </p>
              )}
            </div>

            {/* Tag Stats Cards */}
            {tagStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-6 rounded-lg shadow-md ${
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Total Transactions
                    </h3>
                    <Package size={20} className="text-blue-500" />
                  </div>
                  <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {tagStats.transactionCount}
                  </p>
                </div>

                <div
                  className={`p-6 rounded-lg shadow-md ${
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Total Spending
                    </h3>
                    <DollarSign size={20} className="text-green-500" />
                  </div>
                  <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {formatCurrency.format(tagStats.totalSpending)}
                  </p>
                </div>

                <div
                  className={`p-6 rounded-lg shadow-md ${
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Average per Transaction
                    </h3>
                    <TrendingUp size={20} className="text-purple-500" />
                  </div>
                  <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {formatCurrency.format(tagStats.transactionCount > 0 ? tagStats.totalSpending / tagStats.transactionCount : 0)}
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Trends */}
            {tagTrends.length > 0 && (
              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  12-Month Spending Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tagTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#E5E7EB"} />
                    <XAxis dataKey="month" stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} />
                    <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                        border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
                        borderRadius: "0.5rem",
                      }}
                      labelStyle={{ color: theme === "dark" ? "#F3F4F6" : "#1F2937" }}
                      formatter={(value: number) => [formatCurrency.format(value), ""]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="expense" stroke="#EF4444" name="Expenses" strokeWidth={2} />
                    <Line type="monotone" dataKey="income" stroke="#10B981" name="Income" strokeWidth={2} />
                    <Line type="monotone" dataKey="netFlow" stroke="#3B82F6" name="Net Flow" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div
                className={`p-6 rounded-lg shadow-md ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Category Breakdown
                  {selectedPeriod !== "all" && (
                    <span className={`text-sm font-normal ml-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      ({selectedPeriod === "month" ? "This Month" : selectedPeriod === "quarter" ? "This Quarter" : "This Year"})
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ categoryName, percent }) =>
                            `${categoryName} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="totalAmount"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
                            border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
                            borderRadius: "0.5rem",
                          }}
                          formatter={(value: number) => [formatCurrency.format(value), "Amount"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {categoryBreakdown.map((cat) => (
                      <div
                        key={cat.categoryId}
                        className={`p-3 rounded-lg ${
                          theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][index % 6] }}
                            />
                            <span className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                              {cat.categoryName}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                              {formatCurrency.format(cat.totalAmount)}
                            </p>
                            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                              {cat.transactionCount} transaction{cat.transactionCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                  {summary.spendingByTag.map((tag) => (
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
