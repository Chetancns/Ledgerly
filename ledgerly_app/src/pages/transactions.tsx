import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiEyeLine,
  RiEyeOffLine,
  RiFolderLine,
  RiPushpin2Fill,
  RiPushpin2Line,
  RiSearchLine,
  RiSparklingLine,
  RiTaskLine,
} from "react-icons/ri";
import { HiOutlineSquares2X2 } from "react-icons/hi2";
import Layout from "../components/Layout";
import TransactionForm from "../components/TransactionForm";
import StatusBadge from "../components/StatusBadge";
import ConfirmModal from "@/components/ConfirmModal";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
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
  const [cardMode, setCardMode] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("all");
  const [bulkTag, setBulkTag] = useState("all");

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [aiSignal, setAiSignal] = useState(0);

  const [hideBalances, setHideBalances] = useState(true);
  const [visibleAccountIds] = useState<string[]>([]);
  const [showBalancesPanel, setShowBalancesPanel] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [pinBalancePill, setPinBalancePill] = useState(false);

  const [singleCategorizeId, setSingleCategorizeId] = useState<string | null>(null);
  const [singleCategory, setSingleCategory] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const totalBalance = useMemo(() => accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0), [accounts]);
  const selectedAccountEntity = useMemo(() => accounts.find((a) => a.id === selectedAccount), [accounts, selectedAccount]);

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
        setShowForm(true);
        setShowMobileForm(true);
      }
      if (e.key === "Escape") setShowMobileForm(false);
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
    if (!singleCategorizeId || singleCategory === "all") return;
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
      setSingleCategory("all");
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

  return (
    <Layout>
      <div className="mx-auto space-y-6 px-3 py-4 sm:px-6 sm:py-6">
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">Transaction workspace</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">Transactions</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Modern scanning, grouping, quick actions, and balance visibility in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="dashboard-filter-pill inline-flex items-center gap-2" onClick={() => { setEditing(null); setShowForm(true); setShowMobileForm(true); }}><RiAddLine />Add transaction</button>
              <button className="dashboard-filter-pill inline-flex items-center gap-2" onClick={() => { setShowForm(true); setShowMobileForm(true); setAiSignal((x) => x + 1); }}><RiSparklingLine />AI import</button>
            </div>
          </div>
        </section>

        <section className="dashboard-surface p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Account overview</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{hideBalances ? "••••••" : format(totalBalance)}</p>
              {selectedAccountEntity && <p className="text-sm text-[var(--text-secondary)]">{selectedAccountEntity.name}: {hideBalances ? "••••••" : format(Number(selectedAccountEntity.balance || 0))}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="dashboard-filter-pill" onClick={() => setHideBalances((x) => !x)}>{hideBalances ? <RiEyeLine /> : <RiEyeOffLine />}</button>
              <button className="dashboard-filter-pill" onClick={() => setShowBalancesPanel((x) => !x)}>{showBalancesPanel ? "Hide panel" : "Account panel"}</button>
              <button className="dashboard-filter-pill" onClick={() => setShowBalanceModal(true)}>Quick view</button>
              <button className="dashboard-filter-pill" onClick={() => setPinBalancePill((x) => !x)}>{pinBalancePill ? <RiPushpin2Fill /> : <RiPushpin2Line />}</button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSelectedAccount("all")} className={clsx("rounded-xl border px-3 py-2 text-sm", selectedAccount === "all" ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]" : "border-[var(--border-primary)]")}>All</button>
            {accounts.map((a) => (
              <button key={a.id} onClick={() => setSelectedAccount(a.id)} className={clsx("rounded-xl border px-3 py-2 text-left text-sm", selectedAccount === a.id ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]" : "border-[var(--border-primary)]")}>{a.name} · {hideBalances && !visibleAccountIds.includes(a.id) ? "••••••" : format(Number(a.balance || 0))}</button>
            ))}
          </div>
          <AnimatePresence>{showBalancesPanel && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 grid gap-2 md:grid-cols-2">{accounts.map((a) => <div key={a.id} className="rounded-xl border border-[var(--border-primary)] p-3 text-sm text-[var(--text-secondary)]">{a.name}<div className="font-semibold text-[var(--text-primary)]">{hideBalances && !visibleAccountIds.includes(a.id) ? "••••••" : format(Number(a.balance || 0))}</div></div>)}</motion.div>}</AnimatePresence>
        </section>

        <section className="dashboard-surface sticky top-20 z-20 p-4 sm:top-24">
          <div className="grid gap-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-4"><label className="text-xs text-[var(--text-muted)]">Search</label><div className="mt-1 flex items-center gap-2 rounded-xl border border-[var(--input-border)] px-3 py-2"><RiSearchLine /><input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" /></div></div>
            <div className="lg:col-span-4"><label className="text-xs text-[var(--text-muted)]">Period</label><div className="mt-1 flex items-center gap-2"><button onClick={() => { const d = new Date(selectedYear, selectedMonth - 2, 1); setSelectedMonth(d.getMonth() + 1); setSelectedYear(d.getFullYear()); }}><RiArrowLeftSLine /></button><span className="text-sm font-semibold text-[var(--text-primary)]">{MONTHS[selectedMonth - 1]} {selectedYear}</span><button onClick={() => { const d = new Date(selectedYear, selectedMonth, 1); setSelectedMonth(d.getMonth() + 1); setSelectedYear(d.getFullYear()); }}><RiArrowRightSLine /></button><select value={`${selectedYear}-${selectedMonth}`} onChange={(e) => { const [y, m] = e.target.value.split("-").map(Number); setSelectedYear(y); setSelectedMonth(m); }} className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm">{quickMonthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></div>
            <div className="lg:col-span-4 grid grid-cols-2 gap-2">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All status</option><option value="posted">Posted</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option><option value="savings">Savings</option></select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="date_desc">Newest</option><option value="date_asc">Oldest</option><option value="amount_desc">Amount high-low</option><option value="amount_asc">Amount low-high</option></select>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"><option value="none">No group</option><option value="date">Date</option><option value="account">Account</option><option value="category">Category</option><option value="status">Status</option></select>
              <button type="button" onClick={() => setCardMode((x) => !x)} className="rounded-xl border border-[var(--border-primary)] px-2 py-2 text-sm">{cardMode ? <HiOutlineSquares2X2 className="mx-auto" /> : "Table"}</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{Object.entries(summary).map(([type, total]) => <span key={type} className="rounded-full border border-[var(--border-primary)] px-3 py-1 text-xs">{TYPE_META[type as TransactionType]?.icon} {format(Number(total || 0))}</span>)}</div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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

            {loading ? <div className="dashboard-surface p-4"><div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--skeleton-base)]" />)}</div></div> : (
              groups.map((g) => (
                <div key={g.key} className="dashboard-surface overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[var(--border-secondary)] bg-[var(--bg-card-hover)] px-4 py-2"><span className="text-sm font-semibold text-[var(--text-primary)]">{g.label}</span>{g.key === groups[0]?.key && <label className="text-xs"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all</label>}</div>
                  <div className={clsx(cardMode ? "grid grid-cols-1 gap-3 p-3 sm:grid-cols-2" : "divide-y divide-[var(--border-secondary)]")}>{g.items.map((t) => {
                    const type = (t.type || "expense") as TransactionType;
                    const account = accountMap.get(t.accountId)?.name || "Unknown account";
                    const category = categoryMap.get(t.categoryId)?.name || "Unknown category";
                    const toAccount = t.toAccountId ? accountMap.get(t.toAccountId)?.name || "Unknown account" : "";
                    return (
                      <div key={t.id} className={clsx("group", cardMode ? "rounded-xl border border-[var(--border-primary)] p-3" : "px-3 py-3") }>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelected(t.id)} /><span className="mt-1 h-8 w-1 rounded-full" style={{ background: TYPE_META[type].color }} /><div><p className="font-semibold text-[var(--text-primary)]">{t.description?.trim() || category}</p><p className="text-xs text-[var(--text-secondary)]">{account}{toAccount ? ` → ${toAccount}` : ""} · {category} · {dayjs(t.transactionDate).format("MMM D, YYYY")}</p></div></div>
                          <div className="text-right"><p className="font-semibold text-[var(--text-primary)]">{format(Number(t.amount || 0))}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TYPE_META[type].color, color: TYPE_META[type].color }}>{TYPE_META[type].icon} {TYPE_META[type].label}</span></div>
                        </div>
                        <div className="mt-2 flex items-center justify-between"><StatusBadge status={t.status} size="sm" /><div className="flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><button onClick={() => { setEditing(t); setShowForm(true); setShowMobileForm(true); }} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiEdit2Line /></button><button onClick={() => setSingleCategorizeId(t.id)} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiFolderLine /></button><button onClick={() => void duplicateTx(t)} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiAddLine /></button>{t.status === "pending" && <button onClick={() => void markPosted(t.id)} className="rounded-lg border border-[var(--border-primary)] p-1.5"><RiTaskLine /></button>}<button onClick={() => setDeleteConfirm(t.id)} className="rounded-lg border border-[var(--border-primary)] p-1.5 text-[var(--color-error)]"><RiDeleteBinLine /></button></div></div>
                      </div>
                    );
                  })}</div>
                </div>
              ))
            )}
          </section>

          <section className="hidden lg:block">
            <div className="dashboard-surface sticky top-[7.5rem] p-3">
              <button className="dashboard-filter-pill mb-3" onClick={() => setShowForm((x) => !x)}>{showForm ? "Hide form" : "Show form"}</button>
              <AnimatePresence>{showForm && <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><TransactionForm transaction={editing || undefined} onCreated={() => void fetchData()} onUpdated={() => { setEditing(null); void fetchData(); }} onCancel={() => setEditing(null)} openAiImportSignal={aiSignal} /></motion.div>}</AnimatePresence>
            </div>
          </section>
        </div>
      </div>

      <button className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-primary)] text-2xl text-[var(--text-inverse)] lg:hidden" onClick={() => { setEditing(null); setShowMobileForm(true); }} aria-label="Add transaction"><RiAddLine /></button>
      <AnimatePresence>{showMobileForm && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 p-3 backdrop-blur-sm lg:hidden"><motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 30 }} className="h-full overflow-auto rounded-3xl bg-[var(--bg-secondary)] p-3"><TransactionForm transaction={editing || undefined} onCreated={() => { void fetchData(); setShowMobileForm(false); }} onUpdated={() => { setEditing(null); setShowMobileForm(false); void fetchData(); }} onCancel={() => { setEditing(null); setShowMobileForm(false); }} openAiImportSignal={aiSignal} /></motion.div></motion.div>}</AnimatePresence>

      <AnimatePresence>{showBalanceModal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/55 p-4 backdrop-blur-sm" onClick={() => setShowBalanceModal(false)}><motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="mx-auto max-h-[90vh] max-w-4xl overflow-auto rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5" onClick={(e) => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold text-[var(--text-primary)]">Balances quick view</h3><button onClick={() => setShowBalanceModal(false)} className="rounded-full border border-[var(--border-primary)] p-2"><RiCloseLine /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{accounts.map((a) => <div key={a.id} className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4"><p className="text-sm font-semibold text-[var(--text-primary)]">{a.name}</p><p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{hideBalances && !visibleAccountIds.includes(a.id) ? "••••••" : format(Number(a.balance || 0))}</p></div>)}</div></motion.div></motion.div>}</AnimatePresence>

      {pinBalancePill && <div className="pointer-events-none fixed bottom-6 left-6 z-40 rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">{hideBalances ? "••••••" : selectedAccountEntity ? format(Number(selectedAccountEntity.balance || 0)) : format(totalBalance)}</div>}

      <ConfirmModal open={!!deleteConfirm} title="Delete transaction" description="Delete this transaction permanently?" confirmLabel="Delete" confirmColor="red-500" onConfirm={() => void deleteTx()} onClose={() => setDeleteConfirm(null)} />
      <ConfirmModal open={!!singleCategorizeId} title="Categorize transaction" description="Apply selected category" confirmLabel="Apply" confirmColor="blue-500" onConfirm={() => void applySingleCategory()} onClose={() => { setSingleCategorizeId(null); setSingleCategory("all"); }} />
      {singleCategorizeId && <div className="pointer-events-none fixed inset-0 z-[51] flex items-center justify-center p-4"><div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4"><label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Category</label><select value={singleCategory} onChange={(e) => setSingleCategory(e.target.value)} className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"><option value="all">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>}
    </Layout>
  );
}
