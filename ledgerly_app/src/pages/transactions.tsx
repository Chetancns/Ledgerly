import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiFolderLine,
  RiSearchLine,
  RiSparklingLine,
  RiTaskLine,
} from "react-icons/ri";
import Layout from "../components/Layout";
import TransactionForm from "../components/TransactionForm";
import StatusBadge from "../components/StatusBadge";
import ConfirmModal from "@/components/ConfirmModal";
import NeumorphicSelect from "@/components/NeumorphicSelect";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useTheme } from "@/context/ThemeContext";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { Transaction, TransactionType } from "@/models/Transaction";
import { getUserAccount } from "@/services/accounts";
import { getUserCategory } from "@/services/category";
import { bulkUpdateTransactionStatus, createTransaction, getFilterTransactions, getTransactionSummary, onDelete, updateTransaction, updateTransactionStatus } from "@/services/transactions";
import { getAllTags, Tag } from "@/services/tags";
import toast from "react-hot-toast";

type SortBy = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
type GroupBy = "none" | "date" | "account" | "category" | "status";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TYPE_META: Record<TransactionType, { label: string; icon: string; color: string }> = {
  income: { label: "Income", icon: "💰", color: "var(--color-success)" },
  expense: { label: "Expense", icon: "💸", color: "var(--color-error)" },
  savings: { label: "Savings", icon: "🏦", color: "var(--color-info)" },
  transfer: { label: "Transfer", icon: "🔁", color: "#8b5cf6" },
};

export default function Transactions() {
  const { format } = useCurrencyFormatter();
  const { theme } = useTheme();
  const today = new Date();
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [summary, setSummary] = useState<Partial<Record<TransactionType, number>>>({});
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");
  const [groupBy, setGroupBy] = useState<GroupBy>("date");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("all");
  const [bulkTag, setBulkTag] = useState("all");

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [aiSignal, setAiSignal] = useState(0);

  const [hideBalances, setHideBalances] = useState(true);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  const [singleCategorizeId, setSingleCategorizeId] = useState<string | null>(null);
  const [singleCategory, setSingleCategory] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const totalBalance = useMemo(() => accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0), [accounts]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, cat, tagsResponse] = await Promise.all([getUserAccount(), getUserCategory(), getAllTags(false)]);
      setAccounts(acc);
      setCategories(cat);
      setTags(tagsResponse.data || []);

      const from = dayjs(`${selectedYear}-${selectedMonth}-01`).startOf("month").format("YYYY-MM-DD");
      const to = dayjs(`${selectedYear}-${selectedMonth}-01`).endOf("month").format("YYYY-MM-DD");
      const filters: { from: string; to: string; accountId?: string; categoryId?: string; status?: string; type?: string } = { from, to };
      if (selectedAccount !== "all") filters.accountId = selectedAccount;
      if (selectedCategory !== "all") filters.categoryId = selectedCategory;
      if (selectedStatus !== "all") filters.status = selectedStatus;
      if (selectedType !== "all") filters.type = selectedType;

      const [txRes, summaryRes] = await Promise.all([getFilterTransactions(filters), getTransactionSummary(filters)]);
      const payload = txRes.data;
      const tx = payload && typeof payload === "object" && "data" in payload ? (payload.data as Transaction[]) : (payload as Transaction[]);
      setTransactions(tx || []);
      setSummary((summaryRes.data || {}) as Partial<Record<TransactionType, number>>);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load transaction data");
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedCategory, selectedMonth, selectedStatus, selectedType, selectedYear]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.key === "n" || e.key === "N") && !typing) {
        e.preventDefault();
        setEditing(null);
        setShowComposer(true);
      }
      if (e.key === "Escape") setShowComposer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = transactions.filter((t) => {
      if (!s) return true;
      const text = [t.description || "", accountMap.get(t.accountId)?.name || "", categoryMap.get(t.categoryId)?.name || "", t.tags?.map((x) => x.name).join(" ") || "", String(t.amount || "")].join(" ").toLowerCase();
      return text.includes(s);
    });
    rows.sort((a, b) => {
      if (sortBy === "date_desc") return dayjs(b.transactionDate).valueOf() - dayjs(a.transactionDate).valueOf();
      if (sortBy === "date_asc") return dayjs(a.transactionDate).valueOf() - dayjs(b.transactionDate).valueOf();
      if (sortBy === "amount_desc") return Number(b.amount || 0) - Number(a.amount || 0);
      return Number(a.amount || 0) - Number(b.amount || 0);
    });
    return rows;
  }, [accountMap, categoryMap, search, sortBy, transactions]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All", items: filtered }];
    const map = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const label = groupBy === "account"
        ? accountMap.get(t.accountId)?.name || "Unknown"
        : groupBy === "category"
          ? categoryMap.get(t.categoryId)?.name || "Unknown"
          : groupBy === "status"
            ? t.status || "posted"
            : dayjs(t.transactionDate).isSame(dayjs(), "day")
              ? "Today"
              : dayjs(t.transactionDate).isSame(dayjs().subtract(1, "day"), "day")
                ? "Yesterday"
                : dayjs(t.transactionDate).format("MMM D, YYYY");
      map.set(label, [...(map.get(label) || []), t]);
    });
    return [...map.entries()].map(([key, items]) => ({ key, label: key, items }));
  }, [accountMap, categoryMap, filtered, groupBy]);

  const allVisibleIds = filtered.map((t) => t.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds((prev) => (allSelected ? prev.filter((id) => !allVisibleIds.includes(id)) : [...new Set([...prev, ...allVisibleIds])]));

  const markPosted = async (id: string) => {
    try {
      await updateTransactionStatus(id, "posted");
      await fetchData();
      toast.success("Marked as posted");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const duplicateTx = async (tx: Transaction) => {
    try {
      const payload: Partial<Transaction> = { ...tx, transactionDate: new Date().toISOString(), tagIds: tx.tags?.map((t) => t.id) || [] };
      delete payload.id;
      await createTransaction(payload);
      await fetchData();
      toast.success("Duplicated");
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const deleteTx = async () => {
    if (!deleteConfirm) return;
    try {
      await onDelete(deleteConfirm);
      setDeleteConfirm(null);
      await fetchData();
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const bulkStatus = async (status: "pending" | "posted" | "cancelled") => {
    if (!selectedIds.length) return;
    try {
      await bulkUpdateTransactionStatus(selectedIds, status);
      setSelectedIds([]);
      await fetchData();
      toast.success("Bulk status updated");
    } catch {
      toast.error("Bulk action failed");
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(selectedIds.map((id) => onDelete(id)));
      setSelectedIds([]);
      await fetchData();
      toast.success("Selected transactions deleted");
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const applySingleCategory = async () => {
    if (!singleCategorizeId || !singleCategory) return;
    const tx = transactions.find((t) => t.id === singleCategorizeId);
    if (!tx) return;
    try {
      await updateTransaction(singleCategorizeId, {
        accountId: tx.accountId,
        categoryId: singleCategory,
        amount: tx.amount,
        description: tx.description,
        transactionDate: tx.transactionDate,
        tagIds: tx.tags?.map((x) => x.id) || [],
        status: tx.status,
        type: tx.type,
        toAccountId: tx.toAccountId || undefined,
        expectedPostDate: tx.expectedPostDate,
      });
      setSingleCategorizeId(null);
      setSingleCategory("");
      await fetchData();
      toast.success("Category updated");
    } catch {
      toast.error("Failed to categorize");
    }
  };

  const quickMonthOptions = Array.from({ length: 48 }).map((_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 36 + i, 1);
    return { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, value: `${d.getFullYear()}-${d.getMonth() + 1}` };
  });

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);

  return (
    <Layout>
      <div className="mx-auto space-y-6 px-3 py-4 sm:px-6 sm:py-6">
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">Transaction workspace</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">Transactions</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Compact, scan-friendly transactions with quick actions.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="dashboard-filter-pill inline-flex items-center gap-2" onClick={() => { setEditing(null); setShowComposer(true); }}><RiAddLine />Add transaction</button>
              <button className="dashboard-filter-pill inline-flex items-center gap-2" onClick={() => { setEditing(null); setShowComposer(true); setAiSignal((x) => x + 1); }}><RiSparklingLine />AI import</button>
              <button className="dashboard-filter-pill inline-flex items-center gap-2" onClick={() => setShowBalanceModal(true)}>Quick view</button>
            </div>
          </div>
        </section>

        <section className="dashboard-surface sticky top-20 z-20 p-4 sm:top-24">
          <div className="grid gap-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-4"><label className="text-xs text-[var(--text-muted)]">Search</label><div className="mt-1 flex items-center gap-2 rounded-xl border border-[var(--input-border)] px-3 py-2"><RiSearchLine /><input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" /></div></div>
            <div className="lg:col-span-4"><label className="text-xs text-[var(--text-muted)]">Period</label><div className="mt-1 flex items-center gap-2"><button onClick={() => { const d = new Date(selectedYear, selectedMonth - 2, 1); setSelectedMonth(d.getMonth() + 1); setSelectedYear(d.getFullYear()); }}><RiArrowLeftSLine /></button><span className="text-sm font-semibold text-[var(--text-primary)]">{MONTHS[selectedMonth - 1]} {selectedYear}</span><button onClick={() => { const d = new Date(selectedYear, selectedMonth, 1); setSelectedMonth(d.getMonth() + 1); setSelectedYear(d.getFullYear()); }}><RiArrowRightSLine /></button><select value={`${selectedYear}-${selectedMonth}`} onChange={(e) => { const [y, m] = e.target.value.split("-").map(Number); setSelectedYear(y); setSelectedMonth(m); }} className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm">{quickMonthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
            <div className="lg:col-span-4 grid grid-cols-2 gap-2">
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All status</option><option value="posted">Posted</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option><option value="savings">Savings</option></select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="date_desc">Newest</option><option value="date_asc">Oldest</option><option value="amount_desc">Amount high-low</option><option value="amount_asc">Amount low-high</option></select>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="none">No group</option><option value="date">Date</option><option value="account">Account</option><option value="category">Category</option><option value="status">Status</option></select>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{Object.entries(summary).map(([type, total]) => <span key={type} className="rounded-full border border-[var(--border-primary)] px-3 py-1 text-xs">{TYPE_META[type as TransactionType]?.icon} {format(Number(total || 0))}</span>)}</div>
        </section>

        <section className="space-y-3">
          {!!selectedIds.length && (
            <div className="dashboard-surface p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-[var(--text-primary)]">{selectedIds.length} selected</span>
                <button className="rounded-lg border border-[var(--border-primary)] px-2 py-1" onClick={() => void bulkStatus("posted")}>Mark posted</button>
                <button className="rounded-lg border border-[var(--border-primary)] px-2 py-1" onClick={() => void bulkDelete()}>Delete</button>
                <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"><option value="all">Category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <select value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1"><option value="all">Tag</option>{tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </div>
            </div>
          )}

          {loading ? <div className="dashboard-surface p-4"><div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--skeleton-base)]" />)}</div></div> : (
            groups.map((g) => (
              <div key={g.key} className="dashboard-surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border-secondary)] bg-[var(--bg-card-hover)] px-3 py-2"><span className="text-sm font-semibold text-[var(--text-primary)]">{g.label}</span>{g.key === groups[0]?.key && <div className="text-xs"><input id="select-all-transactions" type="checkbox" checked={allSelected} onChange={toggleAll} /><label htmlFor="select-all-transactions" className="ml-1">Select all</label></div>}</div>
                <div className="divide-y divide-[var(--border-secondary)]">{g.items.map((t) => {
                  const type = (t.type || "expense") as TransactionType;
                  const account = accountMap.get(t.accountId)?.name || "Unknown account";
                  const category = categoryMap.get(t.categoryId)?.name || "Unknown category";
                  const toAccount = t.toAccountId ? accountMap.get(t.toAccountId)?.name || "Unknown account" : "";
                  return (
                    <div key={t.id} className="group px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelected(t.id)} /><span className="mt-1 h-6 w-1 rounded-full" style={{ background: TYPE_META[type].color }} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--text-primary)]">{t.description?.trim() || category}</p><p className="truncate text-xs text-[var(--text-secondary)]">{account}{toAccount ? ` → ${toAccount}` : ""} · {category} · {dayjs(t.transactionDate).format("MMM D")}</p></div></div>
                        <div className="text-right"><p className="text-sm font-semibold text-[var(--text-primary)]">{format(Number(t.amount || 0))}</p><span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: TYPE_META[type].color, color: TYPE_META[type].color }}>{TYPE_META[type].icon} {TYPE_META[type].label}</span></div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between"><StatusBadge status={t.status} size="sm" /><div className="flex gap-1"><button onClick={() => { setEditing(t); setShowComposer(true); }} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiEdit2Line /></button><button onClick={() => { setSingleCategorizeId(t.id); setSingleCategory(t.categoryId || ""); }} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiFolderLine /></button><button onClick={() => void duplicateTx(t)} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiAddLine /></button>{t.status === "pending" && <button onClick={() => void markPosted(t.id)} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiTaskLine /></button>}<button onClick={() => setDeleteConfirm(t.id)} className="rounded-lg border border-[var(--border-primary)] p-1.5 text-[var(--color-error)]"><RiDeleteBinLine /></button></div></div>
                    </div>
                  );
                })}</div>
              </div>
            ))
          )}
        </section>
      </div>

      <AnimatePresence>{showComposer && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"><motion.div initial={{ x: 60 }} animate={{ x: 0 }} exit={{ x: 60 }} className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="transaction-drawer-title"><div className="mb-3 flex items-center justify-between"><h3 id="transaction-drawer-title" className="text-lg font-semibold text-[var(--text-primary)]">{editing ? "Edit transaction" : "Add transaction"}</h3><button onClick={() => { setEditing(null); setShowComposer(false); }} className="rounded-full border border-[var(--border-primary)] p-2" aria-label="Close drawer"><RiCloseLine /></button></div><div className="min-h-0 flex-1 overflow-auto"><TransactionForm transaction={editing || undefined} onCreated={() => { void fetchData(); }} onUpdated={() => { setEditing(null); void fetchData(); }} onCancel={() => { setEditing(null); setShowComposer(false); }} openAiImportSignal={aiSignal} /></div></motion.div></motion.div>}</AnimatePresence>

      <AnimatePresence>{showBalanceModal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/55 p-4 backdrop-blur-sm" onClick={() => setShowBalanceModal(false)}><motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="mx-auto max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="quick-view-title"><div className="mb-4 flex items-center justify-between"><h3 id="quick-view-title" className="text-lg font-bold text-[var(--text-primary)]">Account quick view</h3><button onClick={() => setHideBalances((x) => !x)} className="rounded-full border border-[var(--border-primary)] px-3 py-1 text-xs">{hideBalances ? "Show" : "Hide"}</button></div><p className="mb-3 text-sm text-[var(--text-secondary)]">Total balance: <span className="font-semibold text-[var(--text-primary)]">{hideBalances ? "••••••" : format(totalBalance)}</span></p><div className="space-y-2">{accounts.map((a) => <div key={a.id} className="flex items-center justify-between rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2"><p className="text-sm font-medium text-[var(--text-primary)]">{a.name}</p><p className="text-sm font-semibold text-[var(--text-primary)]">{hideBalances ? "••••••" : format(Number(a.balance || 0))}</p></div>)}</div></motion.div></motion.div>}</AnimatePresence>

      <AnimatePresence>{!!singleCategorizeId && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => { setSingleCategorizeId(null); setSingleCategory(""); }}><motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="category-dialog-title"><h3 id="category-dialog-title" className="mb-3 text-base font-semibold text-[var(--text-primary)]">Update category</h3><NeumorphicSelect value={singleCategory} onChange={setSingleCategory} options={categoryOptions} placeholder="Select category" theme={theme} /><div className="mt-4 flex justify-end gap-2"><button className="rounded-xl border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-secondary)]" onClick={() => { setSingleCategorizeId(null); setSingleCategory(""); }}>Cancel</button><button className="rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-60" disabled={!singleCategory} onClick={() => void applySingleCategory()}>Apply</button></div></motion.div></motion.div>}</AnimatePresence>

      <ConfirmModal open={!!deleteConfirm} title="Delete transaction" description="Delete this transaction permanently?" confirmLabel="Delete" confirmColor="red-500" onConfirm={() => void deleteTx()} onClose={() => setDeleteConfirm(null)} />
    </Layout>
  );
}
