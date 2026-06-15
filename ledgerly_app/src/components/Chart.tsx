"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BudgetCategory, BudgetTotals } from "@/models/budget";
import { CashflowRow, CategoryRow, CategorySpending, ChartDataPoint } from "@/models/chat";
import { useMemo } from "react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useTheme } from "@/context/ThemeContext";

const FALLBACK_COLORS = ["#38bdf8", "#22d3ee", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

type ComparisonPoint = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

type SavingsRatePoint = {
  label: string;
  rate: number;
};

const getChartColors = (theme: "light" | "dark") => ({
  axisStroke: theme === "light" ? "#35506d" : "#d6ecff",
  gridStroke: theme === "light" ? "rgba(53, 80, 109, 0.12)" : "rgba(214, 236, 255, 0.12)",
  labelFill: theme === "light" ? "#0c1e33" : "#e8f4ff",
  mutedFill: theme === "light" ? "#3d5f7a" : "#6b8ea8",
  tooltipBg: theme === "light" ? "rgba(255, 255, 255, 0.96)" : "rgba(12, 26, 46, 0.96)",
  tooltipColor: theme === "light" ? "#0c1e33" : "#e8f4ff",
});

const stringToColor = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 72%, 58%)`;
};

function ChartTooltip({
  formatter,
  labelFormatter,
}: {
  formatter: (value: number) => string;
  labelFormatter?: (label: string) => string;
}) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  return (
    <Tooltip
      formatter={(value: number | string) =>
        typeof value === "number" ? formatter(value) : value
      }
      labelFormatter={labelFormatter}
      contentStyle={{
        backgroundColor: colors.tooltipBg,
        border: `1px solid ${theme === "light" ? "rgba(14, 59, 111, 0.12)" : "rgba(148, 197, 233, 0.18)"}`,
        borderRadius: "16px",
        color: colors.tooltipColor,
        backdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-lg)",
      }}
      itemStyle={{ color: colors.tooltipColor, fontSize: 12 }}
      labelStyle={{ color: colors.labelFill, fontWeight: 600 }}
    />
  );
}

export function LineTrendChart({
  data,
  view,
}: {
  data: ChartDataPoint[];
  view: "income" | "expense";
}) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  const gradientId = `${view}TrendGradient`;
  const stroke = view === "income" ? "#38bdf8" : "#34d399";
  const totalValue = data.reduce((sum, point) => sum + point[view], 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          formatter={format}
          labelFormatter={(label) => `Day ${label}`}
        />
        <Legend
          verticalAlign="top"
          height={30}
          formatter={() =>
            `${view === "income" ? "Income" : "Expense"} • ${format(totalValue)}`
          }
          wrapperStyle={{ color: colors.labelFill }}
        />
        <Area
          type="monotone"
          dataKey={view}
          stroke={stroke}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 2, fill: stroke, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PieSpendingChart({ data }: { data: CategorySpending[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  const totalSpent = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        fill: stringToColor(item.name || `category-${index}`) || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={98}
          paddingAngle={2}
          stroke="none"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip
          formatter={format}
          labelFormatter={(label) => `Category • ${label}`}
        />
        <text x="50%" y="46%" textAnchor="middle" fill={colors.mutedFill} fontSize="12">
          Total spent
        </text>
        <text x="50%" y="56%" textAnchor="middle" fill={colors.labelFill} fontSize="16" fontWeight={700}>
          {format(totalSpent)}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopExpenseCategoriesChart({ data }: { data: CategorySpending[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 12, left: 24, bottom: 8 }}
        barCategoryGap="18%"
      >
        <CartesianGrid stroke={colors.gridStroke} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={96}
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.labelFill }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip formatter={format} />
        <Bar dataKey="value" radius={[0, 10, 10, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={stringToColor(entry.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseComparisonChart({ data }: { data: ComparisonPoint[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="comparisonNetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip formatter={format} />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ color: colors.labelFill }} />
        <Bar dataKey="income" name="Income" fill="#38bdf8" radius={[10, 10, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#34d399" radius={[10, 10, 0, 0]} />
        <Area
          type="monotone"
          dataKey="net"
          name="Net savings"
          fill="url(#comparisonNetGradient)"
          stroke="#8b5cf6"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net savings"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SavingsRateTrendChart({ data }: { data: SavingsRatePoint[] }) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="savingsRateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip formatter={(value) => `${value.toFixed(1)}%`} />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="#22d3ee"
          strokeWidth={2.5}
          fill="url(#savingsRateGradient)"
          dot={{ r: 2, fill: "#22d3ee", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarChartComponent({ data }: { data: BudgetCategory[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  const chartData = data.map((category) => {
    const budget = Number(category.budget) || 0;
    const actual = Number(category.actual) || 0;
    return {
      name: category.categoryName,
      Budget: budget,
      Actual: actual,
      Overspent: Math.max(actual - budget, 0),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} barCategoryGap="20%">
        <CartesianGrid stroke={colors.gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          stroke={colors.axisStroke}
          tick={{ fontSize: 10, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip formatter={format} />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ color: colors.labelFill }} />
        <Bar dataKey="Budget" fill="#38bdf8" radius={[8, 8, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={`${entry.name}-budget`} fill="#38bdf8" />
          ))}
        </Bar>
        <Bar dataKey="Actual" fill="#34d399" radius={[8, 8, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={`${entry.name}-actual`} fill="#34d399" />
          ))}
        </Bar>
        <Bar dataKey="Overspent" fill="#f87171" radius={[8, 8, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={`${entry.name}-overspent`} fill="#f87171" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartComponent({ data }: { data: BudgetCategory[] }) {
  const { format } = useCurrencyFormatter();
  const pieData = [
    {
      name: "Overspent",
      value: data
        .filter((item) => item.status === "overspent")
        .reduce((sum, item) => sum + Math.max(item.actual - item.budget, 0), 0),
      fill: "#f87171",
    },
    {
      name: "Within Budget",
      value: data
        .filter((item) => item.status === "within_budget")
        .reduce((sum, item) => sum + item.actual, 0),
      fill: "#34d399",
    },
    {
      name: "Unbudgeted",
      value: data
        .filter((item) => item.status === "no_budget")
        .reduce((sum, item) => sum + item.actual, 0),
      fill: "#fbbf24",
    },
  ].filter((item) => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={105}
          innerRadius={62}
          paddingAngle={2}
          stroke="none"
        >
          {pieData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip formatter={format} />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChashFlowLine({ data }: { data: CashflowRow[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cashIncomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="cashExpenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <Brush dataKey="date" height={20} stroke="#8b5cf6" travellerWidth={10} />
        <CartesianGrid stroke={colors.gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={colors.axisStroke}
          tick={{ fontSize: 11, fill: colors.mutedFill }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip formatter={format} labelFormatter={(label) => `Date • ${label}`} />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ color: colors.labelFill }} />
        <Area type="monotone" dataKey="income" stroke="#38bdf8" fill="url(#cashIncomeGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="expense" stroke="#34d399" fill="url(#cashExpenseGradient)" strokeWidth={2} />
        <Line type="monotone" dataKey="savings" stroke="#fbbf24" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="netChange" stroke="#8b5cf6" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CatHeatmapPie({ data }: { data: CategoryRow[] }) {
  const { format } = useCurrencyFormatter();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="categoryName"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={105}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.categoryId} fill={stringToColor(entry.categoryName || entry.categoryId)} />
          ))}
        </Pie>
        <ChartTooltip formatter={format} labelFormatter={(label) => `Category • ${label}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SummaryCard({
  totals,
}: {
  totals: BudgetTotals & { overspentAmount?: number };
}) {
  const { format } = useCurrencyFormatter();

  const cards = [
    { label: "Total Budget", value: totals.totalBudget },
    { label: "Total Actual", value: totals.totalActual },
    { label: "Overspent", value: totals.overspentAmount || Math.max(totals.totalActualExpense - totals.totalBudgetExpense, 0) },
    { label: "Unbudgeted", value: totals.unbudgeted },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="dashboard-surface p-4">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{format(card.value || 0)}</p>
        </div>
      ))}
    </div>
  );
}

export function BudgetUtilizationRadialList({
  data,
  categoryNames,
}: {
  data: Array<{ categoryId: string; amount: number; percent: number; spent: number }>;
  categoryNames: Map<string, string>;
}) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const percent = Math.max(0, Math.min(item.percent, 999));
        return (
          <div
            key={`${item.categoryId}-${item.amount}`}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-card-hover)]/80 p-3"
          >
            <div className="h-16 w-16 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="68%"
                  outerRadius="100%"
                  data={[{ value: Math.min(percent, 100) }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={20}
                    fill={percent > 100 ? "#f87171" : "#38bdf8"}
                    background={{ fill: theme === "light" ? "rgba(14, 59, 111, 0.08)" : "rgba(148, 197, 233, 0.08)" }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={colors.labelFill}
                    fontSize="12"
                    fontWeight={700}
                  >
                    {Math.round(percent)}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {categoryNames.get(item.categoryId) || "Unknown"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {format(item.spent)} spent of {format(item.amount)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
