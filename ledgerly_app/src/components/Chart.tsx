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
} from "recharts";
import { ChartDataPoint,CategorySpending } from "@/models/chat";


const COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];

export function LineTrendChart({ data }: { data: ChartDataPoint[] }) {
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#69a7fd" stopOpacity={1} />
            <stop offset="100%" stopColor="#69a7fd" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6bffae" stopOpacity={1} />
            <stop offset="100%" stopColor="#6bffae" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
        <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} />
        <YAxis stroke="#fff" />
        <Tooltip
          formatter={(value: number) => `${value.toFixed(2)}`}
          labelFormatter={(label) => `📅 ${label}`}
          contentStyle={{
            backgroundColor: "#ffffff22",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            backdropFilter: "blur(6px)",
          }}
        />
        <Legend verticalAlign="top" height={36} />
        <Line
          type="monotone"
          dataKey="income"
          stroke="url(#incomeGradient)"
          strokeWidth={2}
          dot={{ r: 2 }}
          name="💰 Income"
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="url(#expenseGradient)"
          strokeWidth={2}
          dot={{ r: 2 }}
          name="💸 Expense"
        />
      </LineChart>
    </ResponsiveContainer>
  );

}

export function PieSpendingChart({ data }: { data: CategorySpending[] }) {
  function generateUniqueColors(count: number): string[] {
  const colors = new Set<string>();
  while (colors.size < count) {
    const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
    colors.add(color);
  }
  return Array.from(colors);
}
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
const dynamicColors = generateUniqueColors(data.length);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={90}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={dynamicColors[index]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${value.toFixed(2)}`}
          contentStyle={{
            backgroundColor: "#ffffff22",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            backdropFilter: "blur(6px)",
          }}
        />
        {/* <Legend verticalAlign="bottom" height={36} /> */}
      </PieChart>
    </ResponsiveContainer>
  );
}
