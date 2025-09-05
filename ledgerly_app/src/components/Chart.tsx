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
} from "recharts";
import { ChartDataPoint,CategorySpending } from "@/models/chat";


const COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];

export function LineTrendChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis dataKey="date" stroke="black" tick={{fontSize:10 }}/>
        <YAxis stroke="black" />
        <Tooltip />
        <Line type="monotone" dataKey="income" stroke="#69a7fdff" strokeWidth={2} />
        <Line type="monotone" dataKey="expense" stroke="#6bffaeff" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PieSpendingChart({ data }: { data: CategorySpending[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: $${value}`}
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
