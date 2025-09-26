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


const COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];

export function LineTrendChart({
  data,
  view,
}: {
  data: ChartDataPoint[];
  view: "income" | "expense";
}) {
  const totalIncome = data.reduce((sum, point) => sum + (point.income || 0), 0);
  const totalExpense = data.reduce((sum, point) => sum + (point.expense || 0), 0);

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
        <Legend
          verticalAlign="top"
          height={36}
          formatter={() =>
            `💰 Income: ${totalIncome.toFixed(2)} | 💸 Expense: ${totalExpense.toFixed(2)}`
          }
        />
        {view === "income" && (
    <Line
      type="monotone"
      dataKey="income"
      stroke="url(#incomeGradient)"
      strokeWidth={2}
      dot={{ r: 2 }}
    />
  )}

  {view === "expense" && (
    <Line
      type="monotone"
      dataKey="expense"
      stroke="url(#expenseGradient)"
      strokeWidth={2}
      dot={{ r: 2 }}
    />
  )}

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
          label={({ name, value }) => `${name}: ${typeof value === "number" ? value.toFixed(2) : "N/A"}`}
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
export function BarChartComponent({ data }: { data: any[] }) {
  const chartData = data.map((c) => ({
    name: c.categoryName,
    Budget: c.budget > 0 ? c.budget : 0.1,
    Actual: c.actual > 0 ? c.actual : 0.1,
    Overspent: c.status === 'overspent' ? c.actual - c.budget : 0.1,
  }));


  return (
    <ResponsiveContainer width="100%" height={300}>
      
        <BarChart data={chartData} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
        <XAxis dataKey="name" stroke="#fff" tick={{ fontSize: 10 }} />
        
        {/* Logarithmic Y-axis */}
        <YAxis scale="log" domain={["auto", "auto"]} stroke="#fff" allowDataOverflow />

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
        <Legend verticalAlign="top" height={36} />

        <Bar
          dataKey="Budget"
          fill="#69a7fd"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
        >
          <LabelList
  dataKey="Budget"
  position="top"
  formatter={(label: any) =>
    label != null ? `${Number(label).toFixed(2)}` : ""
  }
  style={{ fill: "#fff", fontSize: 10 }}
/>
        </Bar>

        <Bar
          dataKey="Actual"
          fill="#6bffae"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
        >
          <LabelList
  dataKey="Actual"
  position="top"
  formatter={(label: any) =>
    label != null ? `${Number(label).toFixed(2)}` : ""
  }
  style={{ fill: "#fff", fontSize: 10 }}
/>
        </Bar>
        <Bar dataKey="Overspent" fill="#ff6b6b" radius={[4, 4, 0, 0]} animationDuration={800}>
  <LabelList
    dataKey="Overspent"
    position="top"
    formatter={(label: any) => label > 0 ? `+${label.toFixed(2)}` : ""}
    style={{ fill: "#fff", fontSize: 10 }}
  />
</Bar>

      </BarChart>
      
      
    </ResponsiveContainer>
  );
}
export function PieChartComponent({ data }: { data: any[] }) {
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
      
        <PieChart>
        <Tooltip
          formatter={(value: number) => `₹${value.toFixed(2)}`}
          contentStyle={{
            backgroundColor: "#ffffff22",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            backdropFilter: "blur(6px)",
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={60}
          label={({ name, percent }) =>
  percent != null ? `${name}: ${(percent * 100).toFixed(0)}%` : `${name}`
}
          isAnimationActive={true}
          animationDuration={1000}
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
        <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb347" stopOpacity={1} />
          <stop offset="100%" stopColor="#ffb347" stopOpacity={0.2} />
        </linearGradient>
        <linearGradient id="netChangeGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <Brush dataKey="date" height={10} stroke="#8884d8" />
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
        name={`💰 Income`}
      />
      <Line
        type="monotone"
        dataKey="expense"
        stroke="url(#expenseGradient)"
        strokeWidth={2}
        dot={{ r: 2 }}
        name={`💸 Expense`}
      />
      <Line


        type="monotone"
        dataKey="savings"
        stroke="url(#savingsGradient)"
        strokeWidth={2}
        dot={{ r: 2 }}
        name={`📈 Savings`}
      />
      <Line
        type="monotone"
        dataKey="netChange"
        stroke="url(#netChangeGradient)"
        strokeWidth={2}
        dot={{ r: 2 }}
        name={`🧮 Net Change`}
      />
    </LineChart>
    
    
  </ResponsiveContainer>
);

}

export function CatHeatmapPie({ data }: { data: CategoryRow[] }) {
  function generateUniqueColors(count: number): string[] {
    const colors = new Set<string>();
    while (colors.size < count) {
      const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
      colors.add(color);
    }
    return Array.from(colors);
  }

  const dynamicColors = generateUniqueColors(data.length);

  return (
    <ResponsiveContainer width="100%" height={250}>
      
        <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="categoryName"
          cx="50%"
          cy="50%"
          outerRadius={100}
          labelLine={false}
          label={({ categoryName, total }) =>
            `${categoryName}: ${total.toFixed(2)}`
          }
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={dynamicColors[index]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value.toFixed(2)}`,
            `📂 ${name}`,
          ]}
          contentStyle={{
            backgroundColor: "#ffffff22",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            backdropFilter: "blur(6px)",
          }}
          itemStyle={{ color: "#fff", fontSize: 12 }}
          labelStyle={{ color: "#fff", fontWeight: "bold" }}
        />
        {/* Optional: Add styled legend if needed */}
        {/* <Legend verticalAlign="bottom" height={36} /> */}
      </PieChart>
      
      
    </ResponsiveContainer>
  );
  

}

export function SummaryCard({ totals }: { totals: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white mb-3 mt-6">
      <div className="bg-[#69a7fd22] p-4 rounded-xl">
        <h4 className="text-sm">Total Budget</h4>
        <p className="text-lg font-bold">₹{totals.totalBudget.toFixed(2)}</p>
      </div>
      <div className="bg-[#6bffae22] p-4 rounded-xl">
        <h4 className="text-sm">Total Actual</h4>
        <p className="text-lg font-bold">₹{totals.totalActual.toFixed(2)}</p>
      </div>
      <div className="bg-[#ff6b6b22] p-4 rounded-xl">
        <h4 className="text-sm">Overspent</h4>
        <p className="text-lg font-bold">₹{totals.overspentAmount.toFixed(2)}</p>
      </div>
      <div className="bg-[#ffc10722] p-4 rounded-xl">
        <h4 className="text-sm">Unbudgeted</h4>
        <p className="text-lg font-bold">₹{totals.unbudgeted.toFixed(2)}</p>
      </div>
    </div>
  );
}