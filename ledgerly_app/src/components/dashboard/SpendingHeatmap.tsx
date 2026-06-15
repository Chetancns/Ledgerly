import { Transaction } from "@/models/Transaction";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useMemo } from "react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SpendingHeatmap({
  transactions,
  month,
  year,
}: {
  transactions: Transaction[];
  month: number;
  year: number;
}) {
  const { formatCompact } = useCurrencyFormatter();

  const heatmap = useMemo(() => {
    const totalsByDay = new Map<number, { count: number; amount: number }>();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transactionDate);
      const day = date.getUTCDate();
      const current = totalsByDay.get(day) || { count: 0, amount: 0 };
      totalsByDay.set(day, {
        count: current.count + 1,
        amount: current.amount + Number(transaction.amount || 0),
      });
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const maxCount = Math.max(...Array.from(totalsByDay.values(), (value) => value.count), 0);

    const cells = [
      ...Array.from({ length: firstDay }, (_, index) => ({
        key: `blank-${index}`,
        day: null,
        intensity: 0,
        count: 0,
        amount: 0,
      })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const summary = totalsByDay.get(day) || { count: 0, amount: 0 };
        const intensity = maxCount > 0 ? summary.count / maxCount : 0;
        return {
          key: `day-${day}`,
          day,
          intensity,
          count: summary.count,
          amount: summary.amount,
        };
      }),
    ];

    return { cells, maxCount };
  }, [month, transactions, year]);

  return (
    <div>
      <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {heatmap.cells.map((cell) =>
          cell.day === null ? (
            <div key={cell.key} className="aspect-square rounded-2xl border border-transparent" />
          ) : (
            <div
              key={cell.key}
              className="group aspect-square rounded-2xl border border-[var(--border-secondary)] p-2 transition hover:-translate-y-0.5"
              style={{
                background:
                  cell.count === 0
                    ? "var(--bg-card)"
                    : `linear-gradient(180deg, rgba(56, 189, 248, ${0.18 + cell.intensity * 0.4}), rgba(34, 211, 238, ${0.1 + cell.intensity * 0.28}))`,
              }}
              title={
                cell.count > 0
                  ? `${cell.day}: ${cell.count} transaction${cell.count === 1 ? "" : "s"} • ${formatCompact(cell.amount)}`
                  : `${cell.day}: No transactions`
              }
            >
              <div className="flex h-full flex-col justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">{cell.day}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {cell.count > 0 ? cell.count : ""}
                </span>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>Quiet</span>
        <span>Peak day: {heatmap.maxCount} transaction{heatmap.maxCount === 1 ? "" : "s"}</span>
        <span>Busy</span>
      </div>
    </div>
  );
}
