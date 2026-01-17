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
  const cells: Array<{ key: string; label: string; date?: string }> = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `pad-${i}`, label: "", date: undefined });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = startOfMonth.date(d).format("YYYY-MM-DD");
    cells.push({ key: dateStr, label: String(d), date: dateStr });
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    return Object.values(daily).reduce(
      (acc, d) => ({
        income: acc.income + d.income,
        expense: acc.expense + d.expense,
        savings: acc.savings + (typeof d.savings === 'number' ? d.savings : 0),
        net: acc.net + d.netCashflow,
      }),
      { income: 0, expense: 0, savings: 0, net: 0 }
    );
  }, [daily]);

  // Memoize today's date string for comparison
  const todayStr = useMemo(() => today.format("YYYY-MM-DD"), [today]);

  return (
    <Layout>
      <div className="mx-auto p-2 sm:p-4 max-w-[1600px]">
        {/* Modern Header with gradient */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl sm:text-5xl">📅</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Financial Calendar
            </h1>
          </div>
          <p className="text-sm sm:text-base ml-14 sm:ml-16" style={{ color: "var(--text-muted)" }}>
            Track your daily cashflow and upcoming recurring transactions
          </p>
        </div>

        {/* Month Summary Statistics Bar */}
        {!loading && Object.keys(daily).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 rounded-xl" style={{ background: "var(--bg-card-hover)" }}>
                <div className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Total Income</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <span>💰</span>
                  {formatCompact(monthlyTotals.income)}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl" style={{ background: "var(--bg-card-hover)" }}>
                <div className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Total Expenses</div>
                <div className="text-xl sm:text-2xl font-bold text-rose-400 flex items-center justify-center gap-1">
                  <span>💸</span>
                  {formatCompact(monthlyTotals.expense)}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl" style={{ background: "var(--bg-card-hover)" }}>
                <div className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Total Savings</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-400 flex items-center justify-center gap-1">
                  <span>🏦</span>
                  {formatCompact(monthlyTotals.savings)}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl" style={{ background: "var(--bg-card-hover)" }}>
                <div className="text-xs sm:text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Net Cashflow</div>
                <div className={clsx("text-xl sm:text-2xl font-bold flex items-center justify-center gap-1", 
                  monthlyTotals.net >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  <span>{monthlyTotals.net >= 0 ? '↗' : '↘'}</span>
                  {formatCompact(Math.abs(monthlyTotals.net))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Navigation Controls */}
        <div className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 mb-4 sm:mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-1">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base flex-1 font-semibold transition-all hover:scale-105"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base flex-1 font-semibold transition-all hover:scale-105"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const y = today.year() - 3 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { const prev = startOfMonth.subtract(1, "month"); setMonth(prev.month() + 1); setYear(prev.year()); }}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base flex-1 sm:flex-none font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                ◀ Prev
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMonth(today.month() + 1); setYear(today.year()); }}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ 
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))", 
                  color: "var(--text-primary)",
                  border: "1px solid rgba(59, 130, 246, 0.5)"
                }}
              >
                📍 Today
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { const next = startOfMonth.add(1, "month"); setMonth(next.month() + 1); setYear(next.year()); }}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base flex-1 sm:flex-none font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                Next ▶
              </motion.button>
            </div>
          </div>
        </div>

        {/* Legend/Key */}
        <div className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400/50"></div>
              <span style={{ color: "var(--text-muted)" }}>Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-400/50"></div>
              <span style={{ color: "var(--text-muted)" }}>Expense</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-400/50"></div>
              <span style={{ color: "var(--text-muted)" }}>Savings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-500/30 border border-gray-400/50"></div>
              <span style={{ color: "var(--text-muted)" }}>Transfer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">Recurring</div>
              <span style={{ color: "var(--text-muted)" }}>Scheduled</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin text-4xl">⏳</div>
              <div className="text-lg sm:text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Loading calendar data...</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Fetching your financial timeline</div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="backdrop-blur-2xl shadow-xl rounded-2xl sm:rounded-3xl p-3 sm:p-5" 
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w, idx) => (
                <div 
                  key={w} 
                  className={clsx(
                    "text-[11px] sm:text-sm font-bold text-center py-2 rounded-lg",
                    idx === 0 || idx === 6 ? "text-purple-400" : ""
                  )}
                  style={{ color: idx === 0 || idx === 6 ? undefined : "var(--text-muted)" }}
                >
                  {w}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {cells.map((c) => {
                const agg = c.date ? daily[c.date] : undefined;
                const net = agg?.netCashflow ?? 0;
                const heat = c.date ? Math.min(1, Math.abs(net) / 500) : 0;
                const isToday = c.date === todayStr;
                const hasRecurring = c.date && recurringMarks[c.date] && recurringMarks[c.date].length > 0;
                
                return (
                  <motion.button
                    key={c.key}
                    whileHover={{ scale: c.date ? 1.03 : 1, y: c.date ? -2 : 0 }}
                    whileTap={{ scale: c.date ? 0.98 : 1 }}
                    onClick={() => c.date && onDayClick(c.date)}
                    disabled={!c.date}
                    className={clsx(
                      "rounded-xl sm:rounded-2xl p-2 sm:p-3 h-32 sm:h-36 text-left overflow-hidden transition-all relative",
                      c.date ? "shadow-md hover:shadow-xl cursor-pointer" : "bg-transparent cursor-default",
                      isToday ? "ring-2 ring-blue-500" : ""
                    )}
                    style={c.date ? {
                      background: "var(--bg-card-hover)",
                      border: isToday ? "2px solid rgba(59, 130, 246, 0.8)" : "1px solid var(--border-primary)",
                      backgroundImage: net >= 0
                        ? `linear-gradient(to bottom, rgba(16,185,129,${0.2 * heat}), rgba(16,185,129,${0.05 * heat}))`
                        : `linear-gradient(to bottom, rgba(244,63,94,${0.2 * heat}), rgba(244,63,94,${0.05 * heat}))`,
                    } : undefined}
                  >
                    {/* Today indicator */}
                    {isToday && (
                      <div 
                        className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                        aria-label="Today"
                        role="status"
                      ></div>
                    )}
                    
                    <div className="flex justify-between items-start mb-1">
                      <div className={clsx(
                        "font-bold text-base sm:text-lg",
                        isToday ? "text-blue-400" : ""
                      )} style={isToday ? undefined : { color: "var(--text-primary)" }}>
                        {c.label}
                      </div>
                      {agg?.count ? (
                        <div className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/30" style={{ color: "var(--text-primary)" }}>
                          {agg.count}
                        </div>
                      ) : null}
                    </div>
                    {agg && (
                      <div className="space-y-1.5">
                        {/* Income/Expense visual bar with enhanced styling */}
                        <div className="flex items-center gap-0.5 sm:gap-1 h-1.5 rounded-full overflow-hidden shadow-inner" style={{ background: "var(--skeleton-base)" }}>
                          {agg.income > 0 && (
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm"
                              style={{ width: `${(agg.income / (agg.income + agg.expense)) * 100}%` }}
                            />
                          )}
                          {agg.expense > 0 && (
                            <div 
                              className="h-full bg-gradient-to-r from-rose-400 to-rose-500 shadow-sm"
                              style={{ width: `${(agg.expense / (agg.income + agg.expense)) * 100}%` }}
                            />
                          )}
                        </div>
                        
                        {/* Transaction type badges with improved styling */}
                        <div className="flex flex-wrap gap-1">
                          {agg.income > 0 && (
                            <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold shadow-sm">
                              <span>💰</span>
                              <span>{formatCompact(agg.income)}</span>
                            </div>
                          )}
                          {agg.expense > 0 && (
                            <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/25 text-rose-200 border border-rose-400/40 font-semibold shadow-sm">
                              <span>💸</span>
                              <span>{formatCompact(agg.expense)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Savings & Transfers row with enhanced styling */}
                        {((typeof agg.savings === 'number' && agg.savings > 0) || (c.date && transfersByDay[c.date] && transfersByDay[c.date] > 0)) && (
                          <div className="flex flex-wrap gap-1">
                            {typeof agg.savings === 'number' && agg.savings > 0 && (
                              <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/25 text-blue-200 border border-blue-400/40 font-semibold shadow-sm">
                                <span>🏦</span>
                                <span>{formatCompact(agg.savings)}</span>
                              </div>
                            )}
                            {c.date && transfersByDay[c.date] && transfersByDay[c.date] > 0 && (
                              <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-gray-500/25 text-gray-200 border border-gray-400/40 font-semibold shadow-sm">
                                <span>🔀</span>
                                <span>{formatCompact(transfersByDay[c.date])}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Net cashflow with enhanced styling */}
                        <div className="pt-1" style={{ borderTop: "1px solid var(--border-primary)" }}>
                          <div className={clsx(
                            "text-[9px] sm:text-[10px] font-bold flex items-center justify-between",
                            net >= 0 ? "text-emerald-300" : "text-rose-300"
                          )}>
                            <span className="font-semibold">Net</span>
                            <span className="flex items-center gap-0.5">
                              {net >= 0 ? '↗' : '↘'} 
                              <span className="font-bold">{formatCompact(Math.abs(net))}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Recurring transaction indicators with improved design */}
                    {hasRecurring && c.date && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {recurringMarks[c.date].slice(0, 2).map((r, idx) => (
                          <span
                            key={idx}
                            className={clsx(
                              "text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full border font-semibold shadow-sm",
                              r.type === "income"
                                ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/50"
                                : "bg-rose-500/25 text-rose-200 border-rose-400/50"
                            )}
                            title={`Recurring ${r.type}: ${formatCompact(Number(r.amount || 0))}`}
                          >
                            {r.type === "income" ? "💰" : "💸"} {formatCompact(Number(r.amount || 0))}
                          </span>
                        ))}
                        {recurringMarks[c.date].length > 2 && (
                          <span 
                            className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-sm" 
                            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-primary)" }}
                            title={`${recurringMarks[c.date].length - 2} more recurring transactions`}
                          >
                            +{recurringMarks[c.date].length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Enhanced Day Detail Modal */}
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
            onClick={() => { setSelectedDay(null); setDayTxns([]); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: "var(--border-primary)" }}>
                <div>
                  <div className="font-bold text-xl sm:text-2xl mb-1" style={{ color: "var(--text-primary)" }}>
                    {dayjs(selectedDay).format("MMMM DD, YYYY")}
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
                    {dayjs(selectedDay).format("dddd")} • {dayTxns.length} transaction{dayTxns.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-2xl transition-colors p-2 rounded-lg hover:bg-red-500/20"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => { setSelectedDay(null); setDayTxns([]); }}
                >
                  ✕
                </motion.button>
              </div>
              
              {/* Day Summary Cards */}
              {selectedDay && daily[selectedDay] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="rounded-xl p-3 sm:p-4 shadow-md"
                    style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.3)" }}
                  >
                    <div className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Income</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-300 flex items-center gap-1">
                      <span>💰</span>
                      {formatCompact(daily[selectedDay].income)}
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="rounded-xl p-3 sm:p-4 shadow-md"
                    style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))", border: "1px solid rgba(244,63,94,0.3)" }}
                  >
                    <div className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Expense</div>
                    <div className="text-lg sm:text-xl font-bold text-rose-300 flex items-center gap-1">
                      <span>💸</span>
                      {formatCompact(daily[selectedDay].expense)}
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="rounded-xl p-3 sm:p-4 shadow-md"
                    style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.3)" }}
                  >
                    <div className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Savings</div>
                    <div className="text-lg sm:text-xl font-bold text-blue-300 flex items-center gap-1">
                      <span>🏦</span>
                      {formatCompact(typeof daily[selectedDay].savings === 'number' ? daily[selectedDay].savings : 0)}
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={clsx("rounded-xl p-3 sm:p-4 shadow-md")}
                    style={{ 
                      background: daily[selectedDay].netCashflow >= 0 
                        ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))" 
                        : "linear-gradient(135deg, rgba(244,63,94,0.2), rgba(244,63,94,0.05))",
                      border: daily[selectedDay].netCashflow >= 0 
                        ? "1px solid rgba(16,185,129,0.4)" 
                        : "1px solid rgba(244,63,94,0.4)"
                    }}
                  >
                    <div className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Net</div>
                    <div className={clsx("text-lg sm:text-xl font-bold flex items-center gap-1", 
                      daily[selectedDay].netCashflow >= 0 ? "text-emerald-300" : "text-rose-300"
                    )}>
                      <span>{daily[selectedDay].netCashflow >= 0 ? '↗' : '↘'}</span>
                      {formatCompact(Math.abs(daily[selectedDay].netCashflow))}
                    </div>
                  </motion.div>
                </div>
              )}
              
              {/* Additional Metrics (if available) */}
              {selectedDay && dayTxns.length > 0 && (() => {
                const totals = dayTxns.reduce(
                  (acc: { savings: number; transfers: number }, t: any) => {
                    const amt = Number(t.amount || 0);
                    if (t.type === "savings") acc.savings += amt;
                    if (t.type === "transfer") acc.transfers += amt;
                    return acc;
                  },
                  { savings: 0, transfers: 0 }
                );
                return totals.transfers > 0 ? (
                  <div className="mb-4">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="rounded-xl p-3 text-center shadow-md"
                      style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}
                    >
                      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Transfers</div>
                      <div className="text-lg font-bold text-gray-300 flex items-center justify-center gap-1">
                        <span>🔀</span>
                        {formatCompact(totals.transfers)}
                      </div>
                    </motion.div>
                  </div>
                ) : null;
              })()}
              
              {/* Transactions List */}
              {dayLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin text-3xl">⏳</div>
                  <div className="text-base" style={{ color: "var(--text-primary)" }}>Loading transactions...</div>
                </div>
              ) : (
                <div 
                  className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin"
                  role="list"
                  aria-label="Transactions for selected day"
                >
                  {dayTxns.length === 0 ? (
                    <div className="text-center py-8 rounded-xl" style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}>
                      <div className="text-3xl mb-2">📭</div>
                      <div className="text-sm">No transactions for this day</div>
                    </div>
                  ) : (
                    dayTxns.map((t: any) => {
                      const typeColor = t.type === "income" ? "text-emerald-300" : t.type === "expense" ? "text-rose-300" : t.type === "savings" ? "text-blue-300" : t.type === "transfer" ? "text-gray-300" : "";
                      const typeBadge = t.type === "income" ? "Income" : t.type === "expense" ? "Expense" : t.type === "savings" ? "Savings" : t.type === "transfer" ? "Transfer" : "";
                      const typeIcon = t.type === "income" ? "💰" : t.type === "expense" ? "💸" : t.type === "savings" ? "🏦" : t.type === "transfer" ? "🔀" : "";
                      const typeBg = t.type === "income" ? "rgba(16,185,129,0.1)" : t.type === "expense" ? "rgba(244,63,94,0.1)" : t.type === "savings" ? "rgba(59,130,246,0.1)" : t.type === "transfer" ? "rgba(156,163,175,0.1)" : "var(--bg-card-hover)";
                      const typeBorder = t.type === "income" ? "rgba(16,185,129,0.3)" : t.type === "expense" ? "rgba(244,63,94,0.3)" : t.type === "savings" ? "rgba(59,130,246,0.3)" : t.type === "transfer" ? "rgba(156,163,175,0.3)" : "var(--border-primary)";
                      
                      return (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.01, x: 4 }}
                          className="flex justify-between items-center p-3 sm:p-4 rounded-xl shadow-md transition-all"
                          style={{ background: typeBg, border: `1px solid ${typeBorder}` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{typeIcon}</span>
                              <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                {categoryNames[t.categoryId] || t.categoryName || t.category || "Transaction"}
                              </span>
                              {typeBadge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-primary)" }}>
                                  {typeBadge}
                                </span>
                              )}
                            </div>
                            {(t.description || t.note) && (
                              <div className="text-xs sm:text-sm mb-1 truncate" style={{ color: "var(--text-muted)" }}>
                                {t.description || t.note}
                              </div>
                            )}
                            <div className="text-[10px] sm:text-xs" style={{ color: "var(--text-muted)" }}>
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
                              <div className="text-[9px] sm:text-[10px] mt-1 italic opacity-70" style={{ color: "var(--text-muted)" }}>
                                Does not affect net cashflow
                              </div>
                            )}
                          </div>
                          <div className={clsx("font-bold text-base sm:text-lg ml-3 shrink-0", typeColor)}>
                            {formatCompact(Number(t.amount || 0))}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
