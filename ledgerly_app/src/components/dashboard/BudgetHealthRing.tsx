import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

export default function BudgetHealthRing({
  totalBudget,
  totalActual,
  overspentAmount,
  unbudgetedAmount,
}: {
  totalBudget: number;
  totalActual: number;
  overspentAmount: number;
  unbudgetedAmount: number;
}) {
  const { format } = useCurrencyFormatter();
  const percent = totalBudget > 0 ? Math.max(0, (totalActual / totalBudget) * 100) : 0;
  const chartValue = Math.min(percent, 100);
  const ringColor = percent > 100 ? "#f87171" : percent > 85 ? "#fbbf24" : "#38bdf8";

  return (
    <div className="grid gap-4 lg:grid-cols-[220px,1fr] lg:items-center">
      <div className="mx-auto h-[220px] w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ value: chartValue }]}
            innerRadius="74%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={24}
              fill={ringColor}
              background={{ fill: "rgba(148, 197, 233, 0.12)" }}
            />
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize="12">
              Budget used
            </text>
            <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize="22" fontWeight={700}>
              {percent.toFixed(0)}%
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-card-hover)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Budgeted</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{format(totalBudget)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-card-hover)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Actual spend</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{format(totalActual)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-card-hover)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Overspent</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-error)]">{format(overspentAmount)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-card-hover)]/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Unbudgeted</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-warning)]">{format(unbudgetedAmount)}</p>
        </div>
      </div>
    </div>
  );
}
