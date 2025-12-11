"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Bar,
  BarChart,
  LabelList,
  Brush,
} from "recharts";
import { ChartDataPoint,CategorySpending, CashflowRow, CategoryRow } from "@/models/chat";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useTheme } from "@/context/ThemeContext";


const COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];

// Theme-aware colors for chart axes and text
const getChartColors = (theme: "light" | "dark") => ({
  axisStroke: theme === "light" ? "#9ca3af" : "#6b7280",
  gridStroke: theme === "light" ? "#e5e7eb33" : "#ffffff11",
  labelFill: theme === "light" ? "#6b7280" : "#d1d5db",
  tooltipBg: theme === "light" 
    ? "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 245, 245, 0.95))"
    : "linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(17, 24, 39, 0.95))",
  tooltipColor: theme === "light" ? "#1e293b" : "#f3f4f6",
  tooltipBorder: theme === "light" ? "rgba(229, 231, 235, 0.5)" : "rgba(107, 114, 128, 0.3)",
});

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
  const totalIncome = data.reduce((sum, point) => sum + (point.income || 0), 0);
  const totalExpense = data.reduce((sum, point) => sum + (point.expense || 0), 0);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <filter id="incomeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
          </filter>
          <filter id="expenseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
          </filter>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#69a7fd" stopOpacity={1} />
            <stop offset="50%" stopColor="#69a7fd" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#69a7fd" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6bffae" stopOpacity={1} />
            <stop offset="50%" stopColor="#6bffae" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#6bffae" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="4 4" stroke={colors.gridStroke} vertical={true} horizontalPoints={[]} />
        <XAxis 
          dataKey="date" 
          stroke={colors.axisStroke} 
          tick={{ fontSize: 11, fill: colors.labelFill, fontWeight: 500 }}
          axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
        />
        <YAxis 
          stroke={colors.axisStroke} 
          tick={{ fill: colors.labelFill, fontSize: 11, fontWeight: 500 }}
          axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
        />
        <Tooltip
          formatter={(value: number) => `${format(value)}`}
          labelFormatter={(label) => `📅 ${label}`}
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: "12px",
            color: colors.tooltipColor,
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            padding: "12px 16px",
          }}
          cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={() =>
            `💰 Income: ${format(totalIncome)} | 💸 Expense: ${format(totalExpense)}`
          }
          wrapperStyle={{ color: colors.labelFill, fontWeight: 600, paddingBottom: 10 }}
        />
        {view === "income" && (
    <Line
      type="monotone"
      dataKey="income"
      stroke="#69a7fd"
      strokeWidth={3}
      dot={{ r: 5, fill: "#69a7fd", strokeWidth: 2, stroke: "white" }}
      activeDot={{ r: 7, strokeWidth: 2 }}
      filter="url(#incomeGlow)"
      isAnimationActive={true}
      animationDuration={600}
    />
  )}

  {view === "expense" && (
    <Line
      type="monotone"
      dataKey="expense"
      stroke="#6bffae"
      strokeWidth={3}
      dot={{ r: 5, fill: "#6bffae", strokeWidth: 2, stroke: "white" }}
      activeDot={{ r: 7, strokeWidth: 2 }}
      filter="url(#expenseGlow)"
      isAnimationActive={true}
      animationDuration={600}
    />
  )}

      </LineChart>
    </ResponsiveContainer>
  );
}


export function PieSpendingChart({ data }: { data: CategorySpending[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  const chartColors = useMemo(() => data.map((d) => stringToColor(d.name || "")), [data]);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, value }) => `${name}: ${typeof value === "number" ? format(value) : "N/A"}`}
          outerRadius={95}
          innerRadius={30}
          dataKey="value"
          isAnimationActive={true}
          animationDuration={800}
          filter="url(#pieShadow)"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${format(value)}`}
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: "12px",
            color: colors.tooltipColor,
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            padding: "12px 16px",
          }}
          cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
export function BarChartComponent({ data }: { data: any[] }) {
  const { format, formatCompact } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  const chartData = data.map((c) => {
    const budget = (c?.budget && Number(c.budget)) || 0;
    const actual = (c?.actual && Number(c.actual)) || 0;
    const overspent = Math.max(actual - budget, 0);
    return {
      name: c.categoryName,
      Budget: budget,
      Actual: actual,
      Overspent: overspent,
    };
  });


  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barCategoryGap="15%">
        <defs>
          <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
          <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#69a7fd" stopOpacity={1} />
            <stop offset="100%" stopColor="#4f8ecc" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6bffae" stopOpacity={1} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="overspentGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b6b" stopOpacity={1} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={colors.gridStroke} vertical={true} />
        <XAxis 
          dataKey="name" 
          stroke={colors.axisStroke} 
          tick={{ fontSize: 11, fill: colors.labelFill, fontWeight: 500 }}
          axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
        />
        <YAxis 
          stroke={colors.axisStroke} 
          tick={{ fill: colors.labelFill, fontSize: 11, fontWeight: 500 }}
          axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
          domain={[0, "dataMax"]} 
          allowDataOverflow 
        />
        <Tooltip
          formatter={(value: number) => `${format(value)}`}
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: "12px",
            color: colors.tooltipColor,
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            padding: "12px 16px",
          }}
          cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
        />
        <Legend 
          verticalAlign="top" 
          height={36} 
          wrapperStyle={{ color: colors.labelFill, fontWeight: 600, paddingBottom: 10 }}
        />

        <Bar
          dataKey="Budget"
          fill="url(#budgetGradient)"
          radius={[8, 8, 0, 0]}
          animationDuration={800}
          isAnimationActive={true}
          filter="url(#barGlow)"
        >
          <LabelList
            dataKey="Budget"
            position="top"
            formatter={(label: any) => (label > 0 ? `${formatCompact(Number(label))}` : "")}
            style={{ fill: colors.labelFill, fontSize: 10, fontWeight: 600 }}
          />
        </Bar>

        <Bar
          dataKey="Actual"
          fill="url(#actualGradient)"
          radius={[8, 8, 0, 0]}
          animationDuration={800}
          isAnimationActive={true}
          filter="url(#barGlow)"
        >
          <LabelList
            dataKey="Actual"
            position="top"
            formatter={(label: any) => (label > 0 ? `${formatCompact(Number(label))}` : "")}
            style={{ fill: colors.labelFill, fontSize: 10, fontWeight: 600 }}
          />
        </Bar>
        <Bar 
          dataKey="Overspent" 
          fill="url(#overspentGradient)" 
          radius={[8, 8, 0, 0]} 
          animationDuration={800}
          isAnimationActive={true}
          filter="url(#barGlow)"
        >
          <LabelList
            dataKey="Overspent"
            position="top"
            formatter={(label: any) => (label > 0 ? `+${formatCompact(Number(label))}` : "")}
            style={{ fill: colors.labelFill, fontSize: 10, fontWeight: 600 }}
          />
        </Bar>

      </BarChart>
    </ResponsiveContainer>
  );
}
export function PieChartComponent({ data }: { data: any[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  const pieData = [
  {
    name: 'Overspent',
    value: data.filter((d) => d.status === 'overspent').reduce((sum, d) => sum + d.actual - d.budget, 0),
    fill: '#ee0202ff',
  },
  {
    name: 'Within Budget',
    value: data.filter((d) => d.status === 'within_budget').reduce((sum, d) => sum + d.actual, 0),
    fill: '#6bffae',
  },
  {
    name: 'Unbudgeted',
    value: data.filter((d) => d.status === 'no_budget').reduce((sum, d) => sum + d.actual, 0),
    fill: '#ffc107',
  },
];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <filter id="donutShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>
        <Tooltip
          formatter={(value: number) => `${format(value)}`}
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: "12px",
            color: colors.tooltipColor,
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            padding: "12px 16px",
          }}
          cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          wrapperStyle={{ color: colors.labelFill, fontWeight: 600, paddingTop: 10 }} 
        />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={110}
          innerRadius={60}
          label={({ name, percent }) =>
  percent != null ? `${name}: ${(percent * 100).toFixed(0)}%` : `${name}`
}
          isAnimationActive={true}
          animationDuration={1000}
          filter="url(#donutShadow)"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChashFlowLine({
  data,
}: {
  data: CashflowRow[];
}) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  return (
  <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
      <defs>
        <filter id="incomeFlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
        <filter id="expenseFlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
        <filter id="savingsFlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
        <filter id="netFlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
        <linearGradient id="incomeFlowGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#69a7fd" stopOpacity={1} />
          <stop offset="50%" stopColor="#69a7fd" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#69a7fd" stopOpacity={0.1} />
        </linearGradient>
        <linearGradient id="expenseFlowGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6bffae" stopOpacity={1} />
          <stop offset="50%" stopColor="#6bffae" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#6bffae" stopOpacity={0.1} />
        </linearGradient>
        <linearGradient id="savingsFlowGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb347" stopOpacity={1} />
          <stop offset="50%" stopColor="#ffb347" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#ffb347" stopOpacity={0.1} />
        </linearGradient>
        <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme === "light" ? "#1e293b" : "#ffffff"} stopOpacity={1} />
          <stop offset="50%" stopColor={theme === "light" ? "#1e293b" : "#ffffff"} stopOpacity={0.6} />
          <stop offset="100%" stopColor={theme === "light" ? "#1e293b" : "#ffffff"} stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <Brush dataKey="date" height={10} stroke="#8884d8" fill={colors.gridStroke} />
      <CartesianGrid strokeDasharray="4 4" stroke={colors.gridStroke} vertical={true} />
      <XAxis 
        dataKey="date" 
        stroke={colors.axisStroke} 
        tick={{ fontSize: 11, fill: colors.labelFill, fontWeight: 500 }}
        axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
      />
      <YAxis 
        stroke={colors.axisStroke} 
        tick={{ fill: colors.labelFill, fontSize: 11, fontWeight: 500 }}
        axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
      />
      <Tooltip
        formatter={(value: number) => `${format(value)}`}
        labelFormatter={(label) => `📅 ${label}`}
        contentStyle={{
          background: colors.tooltipBg,
          border: `1px solid ${colors.tooltipBorder}`,
          borderRadius: "12px",
          color: colors.tooltipColor,
          backdropFilter: "blur(8px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          padding: "12px 16px",
        }}
        cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
      />
      <Legend 
        verticalAlign="top" 
        height={36} 
        wrapperStyle={{ color: colors.labelFill, fontWeight: 600, paddingBottom: 10 }} 
      />
      <Line
        type="monotone"
        dataKey="income"
        stroke="#69a7fd"
        strokeWidth={3}
        dot={{ r: 4, fill: "#69a7fd", strokeWidth: 2, stroke: "white" }}
        activeDot={{ r: 6, strokeWidth: 2 }}
        filter="url(#incomeFlow)"
        name={`💰 Income`}
        isAnimationActive={true}
        animationDuration={600}
      />
      <Line
        type="monotone"
        dataKey="expense"
        stroke="#6bffae"
        strokeWidth={3}
        dot={{ r: 4, fill: "#6bffae", strokeWidth: 2, stroke: "white" }}
        activeDot={{ r: 6, strokeWidth: 2 }}
        filter="url(#expenseFlow)"
        name={`💸 Expense`}
        isAnimationActive={true}
        animationDuration={600}
      />
      <Line
        type="monotone"
        dataKey="savings"
        stroke="#ffb347"
        strokeWidth={3}
        dot={{ r: 4, fill: "#ffb347", strokeWidth: 2, stroke: "white" }}
        activeDot={{ r: 6, strokeWidth: 2 }}
        filter="url(#savingsFlow)"
        name={`📈 Savings`}
        isAnimationActive={true}
        animationDuration={600}
      />
      <Line
        type="monotone"
        dataKey="netChange"
        stroke={theme === "light" ? "#1e293b" : "#ffffff"}
        strokeWidth={3}
        strokeDasharray="5 5"
        dot={{ r: 4, fill: theme === "light" ? "#1e293b" : "#ffffff", strokeWidth: 2, stroke: "white" }}
        activeDot={{ r: 6, strokeWidth: 2 }}
        filter="url(#netFlow)"
        name={`🧮 Net Change`}
        isAnimationActive={true}
        animationDuration={600}
      />
    </LineChart>
  </ResponsiveContainer>
);

}

export function CatHeatmapPie({ data }: { data: CategoryRow[] }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  const dynamicColors = useMemo(() => data.map((d) => stringToColor(d.categoryName || "")), [data]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <filter id="categoryGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.2" />
          </filter>
        </defs>
        <Pie
          data={data}
          dataKey="total"
          nameKey="categoryName"
          cx="50%"
          cy="50%"
          outerRadius={105}
          labelLine={true}
          label={({ categoryName, total }) =>
            `${categoryName}: ${format(total)}`
          }
          isAnimationActive={true}
          animationDuration={800}
          filter="url(#categoryGlow)"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={dynamicColors[index]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${format(value)}`,
            `📂 ${name}`,
          ]}
          contentStyle={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: "12px",
            color: colors.tooltipColor,
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            padding: "12px 16px",
          }}
          itemStyle={{ color: colors.tooltipColor, fontSize: 12, fontWeight: 500 }}
          labelStyle={{ color: colors.tooltipColor, fontWeight: 600 }}
          cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
        />
        {/* Optional: Add styled legend if needed */}
        {/* <Legend verticalAlign="bottom" height={36} /> */}
      </PieChart>
      
      
    </ResponsiveContainer>
  );
  

}

// Removed AnimatedNumber to simplify currency formatting

export function SummaryCard({ totals }: { totals: any }) {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);

  const collapse = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: "auto", opacity: 1 },
  };

  const summaryCards = [
    { label: "Total Budget", value: totals.totalBudget, color: "from-blue-500/30 to-indigo-500/20" },
    { label: "Total Actual", value: totals.totalActual, color: "from-green-400/30 to-emerald-500/20" },
    { label: "Overspent", value: totals.overspentAmount, color: "from-rose-400/30 to-pink-500/20" },
    { label: "Unbudgeted", value: totals.unbudgeted, color: "from-amber-400/30 to-yellow-500/20" },
  ];

  const getPercentage = (actual: number, budget: number) => {
    if (!budget || budget === 0) return 0;
    return (actual / budget) * 100;
  };

  return (
    <div className="space-y-6 mt-4 mb-4" style={{ color: "var(--text-primary)" }}>
      {/* ===== Top Summary ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className={`bg-gradient-to-br ${c.color} backdrop-blur-lg rounded-2xl p-5 shadow-md`}
            style={{ border: "1px solid var(--border-primary)" }}
          >
            <h4 className="text-sm" style={{ color: "var(--text-secondary)" }}>{c.label}</h4>
            <p className="text-2xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{format(c.value || 0)}</p>
          </motion.div>
        ))}
      </div>

      {/* ===== Income & Expense Side by Side ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* === Income Summary === */}
        <div className="bg-gradient-to-br from-lime-400/20 to-emerald-500/20 rounded-2xl p-5 shadow-md" style={{ border: "1px solid var(--border-primary)" }}>
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setShowIncome(!showIncome)}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-success)" }}>Income Summary</h3>
            <motion.div animate={{ rotate: showIncome ? 180 : 0 }} transition={{ duration: 0.3 }} style={{ color: "var(--text-primary)" }}>
              <ChevronDown />
            </motion.div>
          </div>

          <AnimatePresence initial={false}>
            {showIncome && (
              <motion.div
                variants={collapse}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Budgeted Income */}
                  <div className="p-4 rounded-xl backdrop-blur-sm" style={{ background: "var(--bg-card)" }}>
                    <h4 className="text-sm" style={{ color: "var(--text-secondary)" }}>Budgeted Income</h4>
                    <p className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{format(totals.totalBudgetIncome || 0)}</p>
                  </div>

                  {/* Actual Income */}
                  <div className="p-4 rounded-xl backdrop-blur-sm" style={{ background: "var(--bg-card)" }}>
                    <h4 className="text-sm" style={{ color: "var(--text-secondary)" }}>Actual Income</h4>
                    <p className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{format(totals.totalActualIncome || 0)}</p>
                    <ProgressBar
                      percent={getPercentage(totals.totalActualIncome, totals.totalBudgetIncome)}
                      label="of budget achieved"
                      isExpense={false}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === Expense Summary === */}
        <div className="bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-2xl p-5 shadow-md" style={{ border: "1px solid var(--border-primary)" }}>
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setShowExpense(!showExpense)}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-warning)" }}>Expense Summary</h3>
            <motion.div animate={{ rotate: showExpense ? 180 : 0 }} transition={{ duration: 0.3 }} style={{ color: "var(--text-primary)" }}>
              <ChevronDown />
            </motion.div>
          </div>

          <AnimatePresence initial={false}>
            {showExpense && (
              <motion.div
                variants={collapse}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Budgeted Expense */}
                  <div className="p-4 rounded-xl backdrop-blur-sm" style={{ background: "var(--bg-card)" }}>
                    <h4 className="text-sm" style={{ color: "var(--text-secondary)" }}>Budgeted Expense</h4>
                    <p className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{format(totals.totalBudgetExpense || 0)}</p>
                  </div>

                  {/* Actual Expense */}
                  <div className="p-4 rounded-xl backdrop-blur-sm" style={{ background: "var(--bg-card)" }}>
                    <h4 className="text-sm" style={{ color: "var(--text-secondary)" }}>Actual Expense</h4>
                    <p className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{format(totals.totalActualExpense || 0)}</p>
                    <ProgressBar
                      percent={getPercentage(totals.totalActualExpense, totals.totalBudgetExpense)}
                      label="of budget used"
                      isExpense={true}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===== Progress Bar Component with Dynamic Colors =====
function ProgressBar({
  percent,
  label,
  isExpense,
}: {
  percent: number;
  label: string;
  isExpense?: boolean;
}) {
  const getBarColor = () => {
    if (percent > 100) return "from-red-500 to-rose-500"; // overspent
    if (percent > 90) return "from-amber-400 to-yellow-500"; // near limit
    return isExpense
      ? "from-green-400 to-emerald-500"
      : "from-sky-400 to-cyan-500"; // healthy
  };

  const displayPercent = percent > 150 ? 150 : percent; // prevent overflow visual

  return (
    <div className="mt-2">
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--skeleton-base)" }}>
        <motion.div
          className={`h-full bg-gradient-to-r ${getBarColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${displayPercent}%` }}
          transition={{ duration: 1 }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {Math.min(percent, 150).toFixed(0)}% {label}
      </p>
    </div>
  );
}
