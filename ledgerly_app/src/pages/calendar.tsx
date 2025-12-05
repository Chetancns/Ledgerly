import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { getCashflowTimeline } from "@/services/reports";
import { getTransactionsWithPagination } from "@/services/transactions";
import { getRecurringTransactions } from "@/services/recurring";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { useTheme } from "@/context/ThemeContext";

interface DailyAggregate {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  savings?: number;
  netCashflow: number;
  count?: number;
}

export default function CalendarPage() {
  const { formatCompact } = useCurrencyFormatter();
  const { theme } = useTheme();
  const today = dayjs();
  const [month, setMonth] = useState<number>(today.month() + 1);
  const [year, setYear] = useState<number>(today.year());
  const [daily, setDaily] = useState<Record<string, DailyAggregate>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayTxns, setDayTxns] = useState<any[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [recurringMarks, setRecurringMarks] = useState<Record<string, Array<{ name: string; amount?: number; type?: string }>>>({});
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [transfersByDay, setTransfersByDay] = useState<Record<string, number>>({});

  const startOfMonth = useMemo(() => dayjs(`${year}-${String(month).padStart(2, "0")}-01`), [month, year]);
  const endOfMonth = useMemo(() => startOfMonth.endOf("month"), [startOfMonth]);

  useEffect(() => {
    const loadDaily = async () => {
      setLoading(true);
      try {
        // Preload account and category names for labeling recurring badges
        try {
          const [accounts, categories] = await Promise.all([getUserAccount(), getUserCategory()]);
          const accMap: Record<string, string> = {};
          const catMap: Record<string, string> = {};
          (Array.isArray(accounts) ? accounts : []).forEach((a: any) => { if (a?.id) accMap[a.id] = a.name || a.id; });
          (Array.isArray(categories) ? categories : []).forEach((c: any) => { if (c?.id) catMap[c.id] = c.name || c.id; });
          setAccountNames(accMap);
          setCategoryNames(catMap);
        } catch {}
        const data = await getCashflowTimeline("daily", startOfMonth.month() + 1, startOfMonth.year());
        // Expected shape: { start, end, interval: 'daily', timeline: [{ date, income, expense, savings, netChange }], totals }
        const map: Record<string, DailyAggregate> = {};
        const timeline: any[] = Array.isArray((data as any)?.timeline)
          ? (data as any).timeline
          : Array.isArray((data as any)?.data?.timeline)
            ? (data as any).data.timeline
            : [];
        timeline.forEach((d: any) => {
          const date = dayjs(d.date).format("YYYY-MM-DD");
          if (!date || date === "Invalid Date") return;
          const income = Number(d.income || 0);
          const expense = Number(d.expense || 0);
          const savings = Number(d.savings || 0);
          const netCashflow = Number(d.netChange ?? income - expense);
          map[date] = {
            date,
            income,
            expense,
            savings,
            netCashflow,
            count: Number(d.count || 0),
          };
        });
        setDaily(map);
        // Fetch month transactions to compute daily transfer totals (non-blocking)
        try {
          const monthTxns = await getTransactionsWithPagination({ from: startOfMonth.format("YYYY-MM-DD"), to: endOfMonth.format("YYYY-MM-DD"), skip: 0, take: 1000 });
          const items = (monthTxns && typeof monthTxns === 'object' && 'data' in monthTxns)
            ? (monthTxns as any).data || []
            : Array.isArray(monthTxns) ? monthTxns : [];
          const transfersMap: Record<string, number> = {};
          items.forEach((t: any) => {
            if (t.type === "transfer") {
              const d = dayjs(t.transactionDate).format("YYYY-MM-DD");
              transfersMap[d] = (transfersMap[d] || 0) + Number(t.amount || 0);
            }
          });
          setTransfersByDay(transfersMap);
        } catch (txErr: any) {
          console.warn("Transfer aggregation failed", txErr?.response?.data?.message || txErr?.message);
        }
        // Load recurring and compute occurrences in month (non-blocking)
        try {
          const rec = await getRecurringTransactions();
          const marks: Record<string, Array<{ name: string; amount?: number; type?: string }>> = {};
          const monthStart = startOfMonth.startOf("day");
          const monthEnd = endOfMonth.endOf("day");
          const list = Array.isArray(rec) ? rec : [];
          list.forEach((r: any) => {
            const freq = (r.frequency || "monthly").toLowerCase();
            const anchor = dayjs(r.nextOccurrence);
            if (!anchor.isValid()) return;
            const step = (f: string) => {
              switch (f) {
                case "daily": return { add: { unit: "day", val: 1 }, sub: { unit: "day", val: 1 } } as const;
                case "weekly": return { add: { unit: "week", val: 1 }, sub: { unit: "week", val: 1 } } as const;
                case "monthly": return { add: { unit: "month", val: 1 }, sub: { unit: "month", val: 1 } } as const;
                case "yearly": return { add: { unit: "year", val: 1 }, sub: { unit: "year", val: 1 } } as const;
                default: return { add: { unit: "month", val: 1 }, sub: { unit: "month", val: 1 } } as const;
              }
            };
            const s = step(freq);
            // Move current to the earliest occurrence not after monthStart
            let current = anchor.clone();
            while (current.isAfter(monthStart)) {
              current = current.subtract(s.sub.val, s.sub.unit as any);
            }
            // Step forward across the month window
            while (current.isBefore(monthEnd.add(1, "day"))) {
              if (current.isAfter(monthStart.subtract(1, "day"))) {
                const key = current.format("YYYY-MM-DD");
                const catLabel = r.categoryId && categoryNames[r.categoryId] ? ` • ${categoryNames[r.categoryId]}` : "";
                const accLabel = r.accountId && accountNames[r.accountId] ? ` • ${accountNames[r.accountId]}` : "";
                (marks[key] ||= []).push({ name: `${r.type === "income" ? "income" : "expense"}${catLabel}${accLabel}`, amount: Number(r.amount || 0), type: r.type });
              }
              current = current.add(s.add.val, s.add.unit as any);
            }
          });
          setRecurringMarks(marks);
        } catch (recErr: any) {
          console.warn("Recurring overlay load failed", recErr?.response?.data?.message || recErr?.message);
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message || "Failed to load daily cashflow";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    loadDaily();
  }, [startOfMonth, endOfMonth]);

  const onDayClick = async (date: string) => {
    setSelectedDay(date);
    setDayLoading(true);
    try {
      const txnsRes = await getTransactionsWithPagination({ from: date, to: date, skip: 0, take: 50 });
      const items = (txnsRes && typeof txnsRes === 'object' && 'data' in txnsRes)
        ? (txnsRes as any).data || []
        : Array.isArray(txnsRes) ? txnsRes : [];
      setDayTxns(items);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load transactions for day");
    } finally {
      setDayLoading(false);
    }
  };

  // Build calendar grid (start on Sunday)
  const firstWeekday = startOfMonth.day(); // 0-6 (Sun-Sat)
  const daysInMonth = endOfMonth.date();
  const cells: Array<{ key: string; label: string; date?: string }>= [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `pad-${i}`, label: "", date: undefined });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = startOfMonth.date(d).format("YYYY-MM-DD");
    cells.push({ key: dateStr, label: String(d), date: dateStr });
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <Layout>
      <div className="mx-auto p-2 sm:p-4">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 sm:mb-6 drop-shadow-lg" style={{ color: "var(--text-primary)" }}>📅 Financial Calendar</h1>

        <div className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 mb-4 sm:mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-1">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base flex-1"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base flex-1"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const y = today.year() - 3 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const prev = startOfMonth.subtract(1, "month"); setMonth(prev.month() + 1); setYear(prev.year()); }}
                className="px-3 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base flex-1 sm:flex-none"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                ◀ Prev
              </button>
              <button
                onClick={() => { const next = startOfMonth.add(1, "month"); setMonth(next.month() + 1); setYear(next.year()); }}
                className="px-3 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base flex-1 sm:flex-none"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-xl py-12" style={{ color: "var(--text-primary)" }}>Loading daily data...</div>
        ) : (
          <div className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-2 sm:p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
                <div key={w} className="text-[10px] sm:text-sm text-center py-1 sm:py-2" style={{ color: "var(--text-muted)" }}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-1 sm:mt-2">
              {cells.map((c) => {
                const agg = c.date ? daily[c.date] : undefined;
                const net = agg?.netCashflow ?? 0;
                const heat = c.date ? Math.min(1, Math.abs(net) / 500) : 0; // simple heat scaling
                return (
                  <motion.button
                    key={c.key}
                    whileHover={{ scale: c.date ? 1.02 : 1 }}
                    onClick={() => c.date && onDayClick(c.date)}
                    disabled={!c.date}
                    className={clsx(
                      "rounded-lg sm:rounded-xl p-2 sm:p-3 h-28 sm:h-32 text-left overflow-hidden",
                      c.date ? "" : "bg-transparent cursor-default"
                    )}
                    style={c.date ? {
                      background: "var(--bg-card-hover)",
                      border: "1px solid var(--border-primary)",
                      backgroundImage: net >= 0
                        ? `linear-gradient(to bottom, rgba(16,185,129,${0.15 * heat}), rgba(16,185,129,${0.05 * heat}))`
                        : `linear-gradient(to bottom, rgba(244,63,94,${0.15 * heat}), rgba(244,63,94,${0.05 * heat}))`,
                    } : undefined}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-base sm:text-lg" style={{ color: "var(--text-primary)" }}>{c.label}</div>
                      {agg?.count ? (
                        <div className="text-[9px] sm:text-[10px] px-1.5 sm:px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>{agg.count}</div>
                      ) : null}
                    </div>
                    {agg && (
                      <div className="space-y-1">
                        {/* Income/Expense visual bar */}
                        <div className="flex items-center gap-0.5 sm:gap-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--skeleton-base)" }}>
                          {agg.income > 0 && (
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                              style={{ width: `${(agg.income / (agg.income + agg.expense)) * 100}%` }}
                            />
                          )}
                          {agg.expense > 0 && (
                            <div 
                              className="h-full bg-gradient-to-r from-rose-400 to-rose-500"
                              style={{ width: `${(agg.expense / (agg.income + agg.expense)) * 100}%` }}
                            />
                          )}
                        </div>
                        
                        {/* Transaction type badges */}
                        <div className="flex flex-wrap gap-1">
                          {agg.income > 0 && (
                            <div className="flex items-center gap-0.5 text-[9px] sm:text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                              <span>💰</span>
                              <span className="font-semibold">{formatCompact(agg.income)}</span>
                            </div>
                          )}
                          {agg.expense > 0 && (
                            <div className="flex items-center gap-0.5 text-[9px] sm:text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-400/30">
                              <span>💸</span>
                              <span className="font-semibold">{formatCompact(agg.expense)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Savings & Transfers row */}
                        {((typeof agg.savings === 'number' && agg.savings > 0) || (c.date && transfersByDay[c.date] && transfersByDay[c.date] > 0)) && (
                          <div className="flex flex-wrap gap-1">
                            {typeof agg.savings === 'number' && agg.savings > 0 && (
                              <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/30">
                                <span>🏦</span>
                                <span>{formatCompact(agg.savings)}</span>
                              </div>
                            )}
                            {c.date && transfersByDay[c.date] && transfersByDay[c.date] > 0 && (
                              <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-gray-500/20 text-gray-200 border border-gray-400/30">
                                <span>🔀</span>
                                <span>{formatCompact(transfersByDay[c.date])}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Net cashflow */}
                        <div className="pt-0.5" style={{ borderTop: "1px solid var(--border-primary)" }}>
                          <div className={clsx(
                            "text-[9px] sm:text-[10px] font-bold flex items-center justify-between",
                            net >= 0 ? "text-emerald-300" : "text-rose-300"
                          )}>
                            <span>Net</span>
                            <span>{net >= 0 ? '↗' : '↘'} {formatCompact(Math.abs(net))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {c.date && recurringMarks[c.date] && recurringMarks[c.date].length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {recurringMarks[c.date].slice(0, 3).map((r, idx) => (
                          <span
                            key={idx}
                            className={clsx(
                              "text-[10px] px-2 py-0.5 rounded-full border",
                              r.type === "income"
                                ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                                : "bg-rose-500/20 text-rose-200 border-rose-400/40"
                            )}
                          >
                            {r.type === "income" ? "income" : "expense"} = {formatCompact(Number(r.amount || 0))}
                          </span>
                        ))}
                        {recurringMarks[c.date].length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}>+{recurringMarks[c.date].length - 3} more</span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Day detail modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-xl" style={{ color: "var(--text-primary)" }}>{dayjs(selectedDay).format("MMM DD, YYYY")}</div>
                <button className="transition" style={{ color: "var(--text-muted)" }} onClick={() => { setSelectedDay(null); setDayTxns([]); }}>✕</button>
              </div>
              {/* Day summary from cashflow map */}
              {selectedDay && daily[selectedDay] && (
                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="rounded-lg p-2 text-green-300" style={{ background: "var(--bg-card-hover)" }}>Income = +{formatCompact(daily[selectedDay].income)}</div>
                  <div className="rounded-lg p-2 text-red-300" style={{ background: "var(--bg-card-hover)" }}>Expense = -{formatCompact(daily[selectedDay].expense)}</div>
                  <div className={clsx("rounded-lg p-2 font-bold", daily[selectedDay].netCashflow >= 0 ? "text-emerald-300" : "text-rose-300")} style={{ background: "var(--bg-card-hover)" }}>Net = {formatCompact(daily[selectedDay].netCashflow)}</div>
                </div>
              )}
              {/* Additional day totals derived from transactions: savings + transfers */}
              {selectedDay && dayTxns.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4 text-[11px]">
                  {(() => {
                    const totals = dayTxns.reduce(
                      (acc: { savings: number; transfers: number }, t: any) => {
                        const amt = Number(t.amount || 0);
                        if (t.type === "savings") acc.savings += amt;
                        if (t.type === "transfer") acc.transfers += amt;
                        return acc;
                      },
                      { savings: 0, transfers: 0 }
                    );
                    return (
                      <>
                        <div className="rounded-lg p-2 text-blue-300" style={{ background: "var(--bg-card-hover)" }}>Savings = {formatCompact(totals.savings)}</div>
                        <div className="rounded-lg p-2 text-gray-300" style={{ background: "var(--bg-card-hover)" }}>Transfers = {formatCompact(totals.transfers)}</div>
                      </>
                    );
                  })()}
                </div>
              )}
              {dayLoading ? (
                <div className="text-center py-8" style={{ color: "var(--text-primary)" }}>Loading transactions...</div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {dayTxns.length === 0 ? (
                    <div style={{ color: "var(--text-muted)" }}>No transactions for this day.</div>
                  ) : (
                    dayTxns.map((t: any) => {
                      const typeColor = t.type === "income" ? "text-emerald-300" : t.type === "expense" ? "text-rose-300" : t.type === "savings" ? "text-blue-300" : t.type === "transfer" ? "text-gray-300" : "";
                      const typeBadge = t.type === "income" ? "Income" : t.type === "expense" ? "Expense" : t.type === "savings" ? "Savings" : t.type === "transfer" ? "Transfer" : "";
                      const typeIcon = t.type === "income" ? "💰" : t.type === "expense" ? "💸" : t.type === "savings" ? "🏦" : t.type === "transfer" ? "🔀" : "";
                      return (
                        <div key={t.id} className="flex justify-between items-center p-3 rounded-xl" style={{ background: "var(--bg-card-hover)" }}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                                {categoryNames[t.categoryId] || t.categoryName || t.category || "Transaction"}
                              </span>
                              {typeBadge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-primary)" }}>
                                  {typeIcon} {typeBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t.description || t.note || ""}</div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {(() => {
                                const accLabel = accountNames[t.accountId] || t.accountName || t.account || t.accountId;
                                const toAccLabel = accountNames[t.toAccountId] || t.toAccountName || t.toAccountId;
                                const parts: string[] = [];
                                if (accLabel) parts.push(`Account: ${accLabel}`);
                                if (toAccLabel) parts.push(`→ ${toAccLabel}`);
                                return parts.join(' ');
                              })()}
                            </div>
                            {(t.type === "transfer" || t.type === "savings") && (
                              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Does not affect net cashflow</div>
                            )}
                          </div>
                          <div className={clsx("font-bold", typeColor)}>{formatCompact(Number(t.amount || 0))}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
