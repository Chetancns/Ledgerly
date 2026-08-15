import { useState, FormEvent, useEffect, useCallback, useMemo, useRef } from "react";
import { Transaction } from "@/models/Transaction";
import { createTransaction, updateTransaction } from "@/services/transactions";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { getUserCategory } from "@/services/category";
import { parseTransaction } from "@/services/ai";
import toast from "react-hot-toast";
import NeumorphicSelect from "./NeumorphicSelect";
import NeumorphicInput from "./NeumorphicInput";
import ModernButton from "./NeumorphicButton";
import TagInput from "./TagInput";
import SegmentedControl from "./SegmentedControl";
import { useTheme } from "@/context/ThemeContext";
import { RiArrowDownSLine, RiArrowUpSLine, RiSparklingLine } from "react-icons/ri";

type TransactionFormData = Omit<Transaction, "id">;
type ComposerType = "expense" | "income" | "transfer";

const LAST_DEFAULTS_KEY = "ledgerly:transactions:lastDefaults";
const LAST_DRAFT_KEY = "ledgerly:transactions:lastDraft";

type LastDefaults = {
  accountId?: string;
  categoryId?: string;
  tagIds?: string[];
};

export default function TransactionForm({
  onCreated,
  transaction,
  onUpdated,
  onCancel,
  openAiImportSignal,
}: {
  onCreated: () => void;
  transaction?: Transaction;
  onUpdated?: () => void;
  onCancel?: () => void;
  openAiImportSignal?: number;
}) {
  const { theme } = useTheme();
  const today = new Date().toISOString().split("T")[0];
  const normalizeType = useCallback(
    (type?: Transaction["type"]): ComposerType =>
      type === "income" ? "income" : type === "transfer" || type === "savings" ? "transfer" : "expense",
    []
  );

  const [form, setForm] = useState<TransactionFormData>({
    accountId: transaction?.accountId || "",
    categoryId: transaction?.categoryId || "",
    amount: transaction?.amount?.toString() || "",
    description: transaction?.description || "",
    transactionDate: transaction?.transactionDate?.split("T")[0] || today,
    tagIds: transaction?.tags?.map((tag) => tag.id) || [],
    status: transaction?.status || "posted",
    expectedPostDate: transaction?.expectedPostDate?.split("T")[0] || undefined,
    type: transaction ? normalizeType(transaction.type) : "expense",
    toAccountId: transaction?.toAccountId || undefined,
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitMode, setSubmitMode] = useState<"save" | "saveAndAdd">("save");
  const [kind, setKind] = useState<ComposerType>(transaction ? normalizeType(transaction.type) : "expense");
  const [toAccountId, setToAccountId] = useState("");
  const [lastDefaults, setLastDefaults] = useState<LastDefaults>({});
  const [lastDraft, setLastDraft] = useState<Partial<TransactionFormData> | null>(null);
  const previousAiSignal = useRef<number | undefined>(openAiImportSignal);

  const amountValue = Number(form.amount || 0);
  const amountError = !form.amount
    ? "Amount is required"
    : !Number.isFinite(amountValue) || amountValue <= 0
      ? "Amount must be greater than 0"
      : "";

  const toISOStringWithoutOffset = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString();
  };

  const applySmartDefaults = useCallback((defaults: LastDefaults) => {
    setForm((previous) => ({
      ...previous,
      accountId: defaults.accountId || previous.accountId,
      categoryId: defaults.categoryId || previous.categoryId,
      tagIds: defaults.tagIds || previous.tagIds || [],
    }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [accRes, catRes] = await Promise.all([getUserAccount(), getUserCategory()]);
      setAccounts(accRes);
      setCategories(catRes);
    };
    void fetchData();
  }, []);

  useEffect(() => {
    try {
      const storedDefaults = localStorage.getItem(LAST_DEFAULTS_KEY);
      if (storedDefaults) {
        const parsed = JSON.parse(storedDefaults) as LastDefaults;
        setLastDefaults(parsed);
        if (!transaction) {
          applySmartDefaults(parsed);
        }
      }

      const storedDraft = localStorage.getItem(LAST_DRAFT_KEY);
      if (storedDraft) {
        const parsedDraft = JSON.parse(storedDraft) as Partial<TransactionFormData>;
        setLastDraft(parsedDraft);
      }
    } catch (error) {
      console.error("Failed to restore form defaults", error);
    }
  }, [applySmartDefaults, transaction]);

  useEffect(() => {
    if (!transaction) return;

    setForm({
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      amount: transaction.amount.toString(),
      description: transaction.description,
      transactionDate: transaction.transactionDate.split("T")[0],
      tagIds: transaction.tags?.map((tag) => tag.id) || [],
      status: transaction.status || "posted",
      expectedPostDate: transaction.expectedPostDate?.split("T")[0] || undefined,
      type: normalizeType(transaction.type),
      toAccountId: transaction.toAccountId || undefined,
    });

    if (transaction.type === "transfer" || transaction.type === "savings") {
      setKind("transfer");
      setToAccountId(transaction.toAccountId || "");
    } else {
      setKind(normalizeType(transaction.type));
      setToAccountId("");
    }
  }, [normalizeType, transaction]);

  useEffect(() => {
    if (openAiImportSignal === undefined || openAiImportSignal <= 0) return;
    if (previousAiSignal.current === openAiImportSignal) return;
    setShowImportPopup(true);
    previousAiSignal.current = openAiImportSignal;
  }, [openAiImportSignal]);

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      type: kind,
      categoryId: kind === "transfer" ? undefined : previous.categoryId,
      toAccountId: kind === "transfer" ? previous.toAccountId : undefined,
    }));

    if (kind !== "transfer") {
      setToAccountId("");
    }
  }, [kind]);

  const applyFormReset = useCallback((overrides?: Partial<TransactionFormData>) => {
    setForm({
      accountId: "",
      categoryId: "",
      amount: "",
      description: "",
      transactionDate: today,
      tagIds: [],
      status: "posted",
      expectedPostDate: undefined,
      type: "expense",
      toAccountId: undefined,
      ...overrides,
    });
    setKind(overrides?.type ? normalizeType(overrides.type) : "expense");
    setToAccountId("");
    setAdvancedOpen(false);
  }, [normalizeType, today]);

  const resetForm = useCallback(() => {
    applyFormReset({
      accountId: lastDefaults.accountId || "",
      categoryId: lastDefaults.categoryId || "",
      tagIds: lastDefaults.tagIds || [],
    });
  }, [applyFormReset, lastDefaults.accountId, lastDefaults.categoryId, lastDefaults.tagIds]);

  const clearFormToEmpty = useCallback(() => {
    applyFormReset();
  }, [applyFormReset]);

  const saveDefaults = useCallback((payload: TransactionFormData) => {
    const defaults: LastDefaults = {
      accountId: payload.accountId,
      categoryId: payload.type === "transfer" ? undefined : payload.categoryId || undefined,
      tagIds: payload.tagIds || [],
    };

    const draftToStore: Partial<TransactionFormData> = {
      ...payload,
      amount: payload.amount,
      transactionDate: payload.transactionDate,
    };

    setLastDefaults(defaults);
    setLastDraft(draftToStore);

    try {
      localStorage.setItem(LAST_DEFAULTS_KEY, JSON.stringify(defaults));
      localStorage.setItem(LAST_DRAFT_KEY, JSON.stringify(draftToStore));
    } catch (error) {
      console.error("Failed to store transaction defaults", error);
    }
  }, []);

  const handleUseLastDraft = () => {
    if (!lastDraft) {
      toast.error("No recent draft to duplicate yet.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      ...lastDraft,
      transactionDate: today,
      amount: lastDraft.amount || "",
      description: lastDraft.description || "",
    }));

    if (lastDraft.type === "transfer" || lastDraft.type === "savings") {
      setKind("transfer");
      setToAccountId(lastDraft.toAccountId || "");
    } else {
      setKind(normalizeType(lastDraft.type));
      setToAccountId("");
    }

    toast.success("Loaded previous transaction details.");
  };

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name || "Unnamed category",
      })),
    [categories]
  );

  const filteredCategoryOptions = useMemo(() => {
    if (kind === "transfer") {
      return [];
    }
    return [
      { value: "", label: "Uncategorized" },
      ...categoryOptions.filter((option) => {
      const category = categories.find((item) => item.id === option.value);
      return category?.type === kind;
      }),
    ];
  }, [categories, categoryOptions, kind]);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name ?? "Unnamed account",
      })),
    [accounts]
  );

  const destinationOptions = useMemo(
    () =>
      accounts
        .filter((account) => account.id !== form.accountId)
        .map((account) => ({
          value: account.id,
          label: `${account.name} (${account.type || "account"})`,
        })),
    [accounts, form.accountId]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.accountId) {
      toast.error("Please select an account.");
      return;
    }

    if (amountError) {
      toast.error(amountError);
      return;
    }

    if (kind === "transfer" && !toAccountId) {
      toast.error("Please select the destination account.");
      return;
    }

    const payload: TransactionFormData = {
      accountId: form.accountId,
      categoryId: kind === "transfer" ? undefined : form.categoryId || undefined,
      amount: form.amount,
      description: form.description,
      transactionDate: toISOStringWithoutOffset(form.transactionDate),
      tagIds: form.tagIds || [],
      status: form.status,
      expectedPostDate: form.expectedPostDate ? form.expectedPostDate : undefined,
      type: kind,
      ...(kind === "transfer"
        ? { toAccountId }
        : { toAccountId: undefined }),
    };

    try {
      const request = transaction
        ? updateTransaction(transaction.id, payload)
        : createTransaction(payload);

      await toast.promise(request, {
        loading: transaction ? "Updating transaction..." : "Saving transaction...",
        success: transaction ? "✅ Transaction updated" : "✅ Transaction added",
        error: transaction ? "Failed to update transaction" : "Failed to create transaction",
      });

      saveDefaults(payload);

      if (transaction) {
        onUpdated?.();
        onCancel?.();
      } else {
        onCreated();
        if (submitMode === "saveAndAdd") {
          resetForm();
        } else {
          onCancel?.();
          resetForm();
        }
      }
    } catch (error) {
      console.error("Transaction submission failed", error);
    } finally {
      setSubmitMode("save");
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && onCancel) {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const callAiImport = async () => {
    if (!importInput.trim()) {
      toast.error("Please paste transaction text to import.");
      return;
    }

    try {
      const importPromise = (async () => {
        setImportLoading(true);
        await parseTransaction(importInput);
        onCreated();
      })();

      await toast.promise(importPromise, {
        loading: "Analyzing and importing transactions...",
        success: "✅ Import completed successfully",
        error: "❌ Import failed. Please try again.",
      });

      setShowImportPopup(false);
      setImportInput("");
    } catch (error) {
      console.error("Import failed", error);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div
      className="dashboard-surface relative w-full overflow-visible p-5 sm:p-6"
      style={{ borderRadius: "1.5rem" }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {transaction ? "Editing" : "Quick add"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
            {transaction ? "Edit transaction" : "New transaction"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Capture essentials first, then expand advanced details only when needed.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--border-primary)] px-3 py-1 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]"
          >
            Close
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <div className="dashboard-section-heading">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Basics</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">Transaction type</label>
              <SegmentedControl
                options={[
                  { value: "expense", label: "Expense", icon: "💸" },
                  { value: "income", label: "Income", icon: "💰" },
                  { value: "transfer", label: "Transfer", icon: "🔁" },
                ]}
                value={kind}
                onChange={(value) => setKind(value as ComposerType)}
                size="md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">Amount *</label>
              <NeumorphicInput
                type="number"
                value={form.amount}
                placeholder="0.00"
                onChange={(value) => setForm((previous) => ({ ...previous, amount: value }))}
                theme={theme}
              />
              {amountError ? (
                <p className="text-xs font-medium text-[var(--color-error)]">{amountError}</p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Use a positive number for faster validation.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">Transaction date *</label>
              <NeumorphicInput
                type="date"
                value={form.transactionDate}
                onChange={(value) => setForm((previous) => ({ ...previous, transactionDate: value }))}
                theme={theme}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">Description</label>
              <NeumorphicInput
                type="text"
                value={form.description || ""}
                placeholder="Optional notes"
                onChange={(value) => setForm((previous) => ({ ...previous, description: value }))}
                theme={theme}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="dashboard-section-heading">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Classification</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">
                {kind === "transfer" ? "From account *" : "Account *"}
              </label>
              <NeumorphicSelect
                value={form.accountId}
                onChange={(value) => setForm((previous) => ({ ...previous, accountId: value }))}
                options={accountOptions}
                placeholder="Select account"
                theme={theme}
              />
            </div>
            {kind !== "transfer" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--text-primary)]">Category</label>
                <NeumorphicSelect
                  value={form.categoryId || ""}
                  onChange={(value) => setForm((previous) => ({ ...previous, categoryId: value || undefined }))}
                  options={filteredCategoryOptions}
                  placeholder="Uncategorized (optional)"
                  theme={theme}
                />
              </div>
            )}
          </div>

          {kind === "transfer" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--text-primary)]">To account *</label>
              <NeumorphicSelect
                value={toAccountId}
                onChange={(value) => setToAccountId(value)}
                options={destinationOptions}
                placeholder="Select destination"
                theme={theme}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--text-primary)]">Tags</label>
            <TagInput
              value={form.tagIds || []}
              onChange={(tagIds) => setForm((previous) => ({ ...previous, tagIds }))}
              placeholder="Add tags to organize this transaction"
            />
          </div>
        </section>

        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            className="dashboard-filter-pill inline-flex items-center gap-2"
          >
            {advancedOpen ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
            Advanced
          </button>

          {advancedOpen && (
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card-hover)]/60 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">Status</label>
                  <SegmentedControl
                    options={[
                      { value: "posted", label: "Posted", icon: "✅" },
                      { value: "pending", label: "Pending", icon: "⏳" },
                      { value: "cancelled", label: "Cancelled", icon: "❌" },
                    ]}
                    value={form.status || "posted"}
                    onChange={(value) =>
                      setForm((previous) => ({ ...previous, status: value as "posted" | "pending" | "cancelled" }))
                    }
                    size="sm"
                  />
                </div>

                {form.status === "pending" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">Expected post date</label>
                    <NeumorphicInput
                      type="date"
                      value={form.expectedPostDate || ""}
                      onChange={(value) => setForm((previous) => ({ ...previous, expectedPostDate: value }))}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border-primary)] pt-4">
          <ModernButton
            type="submit"
            theme={theme}
            className="flex-1 min-w-[180px] bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-none hover:bg-[var(--accent-primary-hover)]"
          >
            {transaction ? "Save changes" : "Save transaction"}
          </ModernButton>

          {!transaction && (
            <ModernButton
              type="submit"
              theme={theme}
              onClick={() => setSubmitMode("saveAndAdd")}
              className="bg-[var(--bg-card-hover)] text-[var(--text-primary)] shadow-none"
            >
              Save & add another
            </ModernButton>
          )}

          {!transaction && (
            <ModernButton
              type="button"
              theme={theme}
              onClick={clearFormToEmpty}
              className="bg-[var(--bg-card-hover)] text-[var(--text-primary)] shadow-none"
            >
              Clear form
              <span className="sr-only"> and remove selected account, category, and tags</span>
            </ModernButton>
          )}

          {!transaction && (
            <ModernButton
              type="button"
              theme={theme}
              onClick={handleUseLastDraft}
              className="bg-[var(--bg-card-hover)] text-[var(--text-primary)] shadow-none"
            >
              Duplicate last
            </ModernButton>
          )}

          <ModernButton
            type="button"
            theme={theme}
            onClick={() => setShowImportPopup(true)}
            className="bg-[var(--color-info-bg)] text-[var(--text-primary)] shadow-none"
            leftIcon={<RiSparklingLine />}
          >
            AI import
          </ModernButton>
        </div>
      </form>

      {showImportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">AI transaction import</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Paste one or multiple transaction lines and Ledgerly will parse them into entries.
            </p>
            <textarea
              value={importInput}
              onChange={(event) => setImportInput(event.target.value)}
              className="mt-4 h-36 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)] outline-none"
              placeholder="Example: Grocery 42.50 from Checking on 2026-06-12"
              disabled={importLoading}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportPopup(false)}
                className="rounded-xl border border-[var(--border-primary)] px-4 py-2 text-sm text-[var(--text-secondary)]"
                disabled={importLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={callAiImport}
                className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)]"
                disabled={importLoading}
              >
                {importLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
