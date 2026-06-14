import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  Debt,
  DebtAnalytics,
  DebtType,
  DebtUpdate,
  PersonLedgerSummary,
} from "@/models/debt";
import {
  catchUpDebts,
  deleteDebt,
  deleteDebtUpdate,
  getDebtAnalytics,
  getDebtUpdates,
  getPersonLedger,
  getUserDebts,
  payDebtEarly,
  payInstallment,
  recordDebtUpdate,
  updateDebt,
} from "@/services/debts";
import { getCategories } from "@/services/category";
import { Category } from "@/models/category";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { useNotifications } from "@/context/NotificationContext";
import { createDebtReminderNotification } from "@/services/notifications";

type StatusFilter = "all" | "active" | "completed" | "overdue" | "active+overdue";
type ViewMode = "people" | "debts";
type ActionType = "payment" | "promise" | "reminder" | "note" | "settle";

const getTodayDate = () => new Date().toISOString().split("T")[0];
const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error && "response" in error) {
    const maybeResponse = (error as {
      response?: { data?: { message?: string } };
    }).response;
    return maybeResponse?.data?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export default function DebtList() {
  const { format } = useCurrencyFormatter();
  const { refreshNotifications } = useNotifications();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [personLedger, setPersonLedger] = useState<PersonLedgerSummary[]>([]);
  const [analytics, setAnalytics] = useState<DebtAnalytics | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [updates, setUpdates] = useState<DebtUpdate[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [debtTypeFilter, setDebtTypeFilter] = useState<DebtType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active+overdue");
  const [categories, setCategories] = useState<Category[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("people");
  const [actionDebt, setActionDebt] = useState<Debt | null>(null);
  const [actionType, setActionType] = useState<ActionType>("payment");
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [actionForm, setActionForm] = useState({
    amount: "",
    note: "",
    reminderDate: "",
    createTransaction: true,
    categoryId: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    principal: "",
    currentBalance: "",
    installmentAmount: "",
    nextDueDate: "",
    reminderDate: "",
    status: "active" as "active" | "completed",
  });

  const loadData = async () => {
    const [debtsRes, categoriesRes, ledgerRes, analyticsRes] = await Promise.all([
      getUserDebts(),
      getCategories(),
      getPersonLedger(),
      getDebtAnalytics(),
    ]);
    setDebts(debtsRes);
    setCategories(categoriesRes);
    setPersonLedger(ledgerRes);
    setAnalytics(analyticsRes);
    if (ledgerRes.length === 0) {
      setViewMode("debts");
    }
  };

  useEffect(() => {
    loadData().catch((error) => {
      console.error("Failed to load debts", error);
      toast.error("Failed to load debt data");
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (debts.length === 0) return;

    const overdueDebts = debts.filter(
      (debt) => debt.overdue && debt.status === "active"
    );
    if (overdueDebts.length === 0) return;

    // Persist each overdue debt reminder to the backend.
    // The backend deduplicates by debtId so this is safe to call on every
    // render — it only creates a new notification the first time.
    // The NotificationContext will then show the toast exactly once per
    // notification (tracked in localStorage via shownNotificationIds).
    void (async () => {
      await Promise.all(
        overdueDebts.map(async (debt) => {
          const title =
            debt.debtType === "institutional" ? "Debt overdue" : "Follow-up overdue";
          const message = `${debt.name} needs attention${debt.personName ? ` for ${debt.personName}` : ""}`;
          try {
            const result = await createDebtReminderNotification(debt.id, title, message);
            if (result.created) {
              // Refresh context so the new backend notification is picked up
              // and shown as a toast (the context deduplicates via localStorage).
              await refreshNotifications();
            }
          } catch (err) {
            console.error("Failed to persist debt reminder notification", err);
          }
        })
      );
    })();
  }, [debts, refreshNotifications]);

  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      if (debtTypeFilter !== "all" && debt.debtType !== debtTypeFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "active+overdue") return debt.status !== "completed";
      if (statusFilter === "completed") return debt.status === "completed";
      if (statusFilter === "overdue") return debt.overdue === true;
      if (statusFilter === "active") return debt.status === "active" && !debt.overdue;
      return true;
    });
  }, [debts, debtTypeFilter, statusFilter]);

  const filteredLedger = useMemo(() => {
    return personLedger.filter((entry) => {
      const matchingDebts = entry.debts.filter((debt) => {
        if (debtTypeFilter !== "all" && debt.debtType !== debtTypeFilter) return false;
        if (statusFilter === "all") return true;
        if (statusFilter === "active+overdue") return debt.status !== "completed";
        if (statusFilter === "completed") return debt.status === "completed";
        if (statusFilter === "overdue") return debt.overdue;
        if (statusFilter === "active") return debt.status === "active" && !debt.overdue;
        return true;
      });
      return matchingDebts.length > 0;
    });
  }, [debtTypeFilter, personLedger, statusFilter]);

  const openHistory = async (debt: Debt) => {
    setSelectedDebt(debt);
    const res = await getDebtUpdates(debt.id);
    setUpdates(Array.isArray(res) ? res : []);
    setShowHistoryModal(true);
  };

  const openAction = (debt: Debt, type: ActionType) => {
    setActionDebt(debt);
    setActionType(type);
    setActionForm({
      amount:
        type === "payment"
          ? debt.installmentAmount?.toString() || ""
          : type === "settle"
            ? debt.currentBalance.toString()
            : "",
      note: "",
      reminderDate: debt.reminderDate || getTodayDate(),
      createTransaction: type === "payment" || type === "settle",
      categoryId: "",
    });
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setActionDebt(null);
    setActionForm({
      amount: "",
      note: "",
      reminderDate: getTodayDate(),
      createTransaction: true,
      categoryId: "",
    });
  };

  const openEditDebt = (debt: Debt) => {
    setEditDebt(debt);
    setEditForm({
      name: debt.name || "",
      principal: debt.principal?.toString() || "",
      currentBalance: debt.currentBalance?.toString() || "",
      installmentAmount: debt.installmentAmount?.toString() || "",
      nextDueDate: debt.nextDueDate || "",
      reminderDate: debt.reminderDate || "",
      status: debt.status || "active",
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditDebt(null);
  };

  const submitEditDebt = async () => {
    if (!editDebt) return;
    try {
      await updateDebt(editDebt.id, {
        name: editForm.name,
        principal: editForm.principal ? Number(editForm.principal) : undefined,
        currentBalance: editForm.currentBalance ? Number(editForm.currentBalance) : undefined,
        installmentAmount:
          editDebt.debtType === "institutional" && editForm.installmentAmount
            ? Number(editForm.installmentAmount)
            : undefined,
        nextDueDate:
          editDebt.debtType === "institutional"
            ? editForm.nextDueDate || undefined
            : undefined,
        reminderDate:
          editDebt.debtType !== "institutional"
            ? editForm.reminderDate || undefined
            : undefined,
        status: editForm.status,
      });
      toast.success("Debt updated");
      closeEditModal();
      await loadData();
    } catch (error: unknown) {
      console.error("Failed to update debt", error);
      toast.error(getErrorMessage(error, "Failed to update debt"));
    }
  };

  const submitAction = async () => {
    if (!actionDebt) return;

    try {
      if (actionType === "payment" || actionType === "settle") {
        await payInstallment(
          actionDebt.id,
          actionForm.amount ? parseFloat(actionForm.amount) : undefined,
          actionForm.createTransaction,
          actionForm.categoryId || undefined,
          actionType === "settle",
          actionForm.note || undefined
        );
      } else {
        await recordDebtUpdate(actionDebt.id, {
          intent: actionType,
          amount: actionForm.amount ? parseFloat(actionForm.amount) : undefined,
          createTransaction: false,
          note: actionForm.note || undefined,
          reminderDate:
            actionType === "reminder" || actionType === "promise"
              ? actionForm.reminderDate || undefined
              : undefined,
        });
      }

      toast.success("Debt update saved");
      closeActionModal();
      await loadData();
    } catch (error: unknown) {
      console.error("Failed to save debt action", error);
      toast.error(getErrorMessage(error, "Failed to save debt update"));
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!selectedDebt) return;

    try {
      await deleteDebtUpdate(updateId);
      toast.success("Debt update deleted successfully");
      const refreshedUpdates = await getDebtUpdates(selectedDebt.id);
      setUpdates(Array.isArray(refreshedUpdates) ? refreshedUpdates : []);
      await loadData();
    } catch (error: unknown) {
      console.error("Failed to delete update", error);
      toast.error(getErrorMessage(error, "Failed to delete update"));
    }
  };

  const handleCatchUp = async () => {
    try {
      await catchUpDebts();
      toast.success("Catch-up processed");
      await loadData();
    } catch (error: unknown) {
      console.error("Catch up failed", error);
      toast.error(getErrorMessage(error, "Catch-up failed"));
    }
  };

  const handlePayDebtEarly = async (debt: Debt) => {
    try {
      const res = await payDebtEarly(debt.id);
      toast.success(`Paid early: ${res.name}`);
      await loadData();
    } catch (error: unknown) {
      console.error("Early payment failed", error);
      toast.error(getErrorMessage(error, "Early payment failed"));
    }
  };

  const getDebtTypeLabel = (type: DebtType) => {
    switch (type) {
      case "institutional":
        return "Loan / Credit";
      case "borrowed":
        return "I Owe";
      case "lent":
        return "Owed to Me";
      default:
        return type;
    }
  };

  const getIntentLabel = (intent: DebtUpdate["intent"]) => {
    switch (intent) {
      case "payment":
        return "Payment";
      case "promise":
        return "Promise to Pay";
      case "reminder":
        return "Reminder";
      case "note":
        return "Note";
      default:
        return intent;
    }
  };

  const getCategoryOptions = (debt: Debt | null) => {
    if (!debt) return [];
    const expectedType = debt.debtType === "lent" ? "income" : "expense";
    return categories.filter((category) => category.type === expectedType);
  };

  return (
    <div className="space-y-6">
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Outstanding", value: format(analytics.summary.totalOutstanding) },
            { label: "P2P Exposure", value: format(analytics.summary.totalP2POutstanding) },
            { label: "Recovered", value: format(analytics.summary.totalPaid) },
            { label: "Recovery Rate", value: `${analytics.summary.recoveryRate.toFixed(1)}%` },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-4 shadow-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{card.label}</p>
              <p className="text-2xl font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl p-4 shadow-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Debt workspace</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Person-ledger view is primary for borrowed/lent debts; individual records stay available for reconciliation.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setViewMode("people")}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: viewMode === "people" ? "var(--accent-primary)" : "var(--bg-card-hover)",
                color: viewMode === "people" ? "var(--text-inverse)" : "var(--text-primary)",
              }}
            >
              Person Ledger
            </button>
            <button
              onClick={() => setViewMode("debts")}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: viewMode === "debts" ? "var(--accent-primary)" : "var(--bg-card-hover)",
                color: viewMode === "debts" ? "var(--text-inverse)" : "var(--text-primary)",
              }}
            >
              Individual Debts
            </button>
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap mb-4">
          <select
            value={debtTypeFilter}
            onChange={(e) => setDebtTypeFilter(e.target.value as DebtType | "all")}
            className="px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
          >
            <option value="all">All debt types</option>
            <option value="institutional">Institutional</option>
            <option value="borrowed">Borrowed</option>
            <option value="lent">Lent</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
          >
            <option value="active+overdue">Active + Overdue</option>
            <option value="active">Active only</option>
            <option value="completed">Completed only</option>
            <option value="overdue">Overdue only</option>
            <option value="all">All status</option>
          </select>

          <button
            onClick={handleCatchUp}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ background: "var(--color-success)", color: "#fff" }}
          >
            Catch Up Institutional Debts
          </button>
        </div>

        {analytics?.duplicateCandidates && analytics.duplicateCandidates.length > 0 && (
          <div className="mb-4 rounded-lg p-3" style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)" }}>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>Potential merge candidates</p>
            <div className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {analytics.duplicateCandidates.slice(0, 3).map((candidate) => (
                <p key={`${candidate.personName}-${candidate.normalizedName}`}>
                  {candidate.personName}: {candidate.labels.join(", ")} ({format(candidate.totalOutstanding)})
                </p>
              ))}
            </div>
          </div>
        )}

        {viewMode === "people" ? (
          filteredLedger.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredLedger.map((person) => (
                <div
                  key={person.personName}
                  className="rounded-xl p-5 shadow-lg"
                  style={{ background: "var(--bg-card)", border: `1px solid ${person.overdueCount > 0 ? 'var(--color-warning)' : 'var(--border-primary)'}` }}
                >
                  <div className="flex justify-between gap-4 items-start flex-wrap">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{person.personName}</h3>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        {person.debtCount} record{person.debtCount === 1 ? "" : "s"} · {person.overdueCount} overdue
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Net (lent - owe)</p>
                      <p className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                        {format(person.totalLentOutstanding - person.totalBorrowedOutstanding)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
                    <div className="rounded-lg p-3" style={{ background: "var(--bg-card-hover)" }}>
                      <p style={{ color: "var(--text-muted)" }}>I owe</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(person.totalBorrowedOutstanding)}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "var(--bg-card-hover)" }}>
                      <p style={{ color: "var(--text-muted)" }}>I lent</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(person.totalLentOutstanding)}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "var(--bg-card-hover)" }}>
                      <p style={{ color: "var(--text-muted)" }}>Recovered</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(person.totalPaid)}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "var(--bg-card-hover)" }}>
                      <p style={{ color: "var(--text-muted)" }}>Next reminder</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {person.nextReminderDate ? new Date(person.nextReminderDate).toLocaleDateString() : "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {person.debts
                      .filter((debt) => {
                        if (debtTypeFilter !== "all" && debt.debtType !== debtTypeFilter) return false;
                        if (statusFilter === "all") return true;
                        if (statusFilter === "active+overdue") return debt.status !== "completed";
                        if (statusFilter === "completed") return debt.status === "completed";
                        if (statusFilter === "overdue") return debt.overdue;
                        if (statusFilter === "active") return debt.status === "active" && !debt.overdue;
                        return true;
                      })
                      .map((debt) => {
                      const fullDebt = debts.find((item) => item.id === debt.id);
                      if (!fullDebt) return null;
                      return (
                        <div
                          key={debt.id}
                          className="rounded-lg p-3"
                          style={{ background: "var(--bg-card-hover)", border: `1px solid ${debt.overdue ? 'var(--color-warning)' : 'transparent'}` }}
                        >
                          <div className="flex justify-between gap-3 items-start">
                            <div>
                              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{debt.name}</p>
                              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                {getDebtTypeLabel(debt.debtType)} · Balance {format(debt.currentBalance)}
                              </p>
                            </div>
                              <button
                                onClick={() => openHistory(fullDebt)}
                                className="px-3 py-1 rounded text-xs"
                                style={{ background: "var(--accent-secondary)", color: "#fff" }}
                              >
                                Timeline
                              </button>
                              <button
                                onClick={() => openEditDebt(fullDebt)}
                                className="px-3 py-1 rounded text-xs"
                                style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}
                              >
                                Edit
                              </button>
                            </div>

                          {fullDebt.status !== "completed" && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <button
                                onClick={() => openAction(fullDebt, "payment")}
                                className="px-3 py-1 rounded text-xs"
                                style={{ background: "var(--color-info)", color: "#fff" }}
                              >
                                Add Payment
                              </button>
                              <button
                                onClick={() => openAction(fullDebt, "reminder")}
                                className="px-3 py-1 rounded text-xs"
                                style={{ background: "var(--color-warning)", color: "#fff" }}
                              >
                                Set Follow-up
                              </button>
                              <button
                                onClick={() => openAction(fullDebt, "settle")}
                                className="px-3 py-1 rounded text-xs"
                                style={{ background: "var(--color-success)", color: "#fff" }}
                              >
                                Mark Settled
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>No person-to-person debt records yet.</p>
          )
        ) : filteredDebts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDebts.map((debt) => {
              const isCompleted = debt.status === "completed";
              return (
                <div
                  key={debt.id}
                  className="rounded-xl p-5 shadow-lg flex flex-col"
                  style={{
                    background: isCompleted ? "var(--bg-card-hover)" : "var(--bg-card)",
                    border: `1px solid ${debt.overdue ? 'var(--color-warning)' : isCompleted ? 'var(--color-success)' : 'var(--border-primary)'}`,
                  }}
                >
                  <div className="flex justify-between gap-3 items-start">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{debt.name}</h3>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        {getDebtTypeLabel(debt.debtType)}
                        {debt.personName ? ` · ${debt.personName}` : ""}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: debt.debtType === "lent" ? "var(--color-success)" : debt.debtType === "borrowed" ? "var(--color-error)" : "var(--color-info)", color: "#fff" }}
                    >
                      {debt.overdue ? "Needs attention" : debt.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <p><strong>Principal:</strong> {format(debt.principal)}</p>
                    <p><strong>Balance:</strong> {format(debt.currentBalance)}</p>
                    <p><strong>Total paid:</strong> {format(debt.totalPaid || 0)}</p>
                    {debt.lastPaymentDate && <p><strong>Last payment:</strong> {new Date(debt.lastPaymentDate).toLocaleDateString()}</p>}
                    {debt.debtType === "institutional" && debt.nextDueDate && (
                      <p><strong>Next due:</strong> {new Date(debt.nextDueDate).toLocaleDateString()}</p>
                    )}
                    {debt.debtType !== "institutional" && (
                      <p><strong>Reminder:</strong> {debt.reminderDate ? new Date(debt.reminderDate).toLocaleDateString() : "Not set"}</p>
                    )}
                    {debt.overdueReason && <p><strong>Reason:</strong> {debt.overdueReason.replace(/-/g, " ")}</p>}
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      <span>Progress</span>
                      <span>{(debt.progress || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--skeleton-base)" }}>
                      <div className="h-2 rounded-full" style={{ width: `${Math.min(100, debt.progress || 0)}%`, background: "var(--accent-secondary)" }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => openHistory(debt)}
                      className="px-3 py-1 rounded text-xs"
                      style={{ background: "var(--accent-secondary)", color: "#fff" }}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => openEditDebt(debt)}
                      className="px-3 py-1 rounded text-xs"
                      style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
                    >
                      Edit
                    </button>
                    {!isCompleted && (
                      <>
                        <button
                          onClick={() => openAction(debt, "payment")}
                          className="px-3 py-1 rounded text-xs"
                          style={{ background: "var(--color-info)", color: "#fff" }}
                        >
                          {debt.debtType === "institutional" ? "Pay Installment" : "Add Payment"}
                        </button>
                        {debt.debtType === "institutional" && debt.nextDueDate && (
                          <button
                            onClick={() => handlePayDebtEarly(debt)}
                            className="px-3 py-1 rounded text-xs"
                            style={{ background: "var(--color-warning)", color: "#fff" }}
                          >
                            Pay Early
                          </button>
                        )}
                        {debt.debtType !== "institutional" && (
                          <>
                            <button
                              onClick={() => openAction(debt, "promise")}
                              className="px-3 py-1 rounded text-xs"
                              style={{ background: "var(--color-warning)", color: "#fff" }}
                            >
                              Promise
                            </button>
                            <button
                              onClick={() => openAction(debt, "note")}
                              className="px-3 py-1 rounded text-xs"
                              style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
                            >
                              Note
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(debt.id)}
                      className="ml-auto transition-transform hover:scale-110"
                      title="Delete debt"
                      style={{ color: "var(--color-error)" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>No debts match the selected filters.</p>
        )}
      </div>

      {analytics && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl p-4 shadow-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Exposure by person</h3>
            <div className="mt-3 space-y-2">
              {analytics.personExposure.slice(0, 5).map((row) => (
                <div key={row.personName} className="rounded-lg p-3 text-sm" style={{ background: "var(--bg-card-hover)", color: "var(--text-secondary)" }}>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{row.personName}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>I owe</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(row.totalBorrowedOutstanding)}</p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>I lent</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(row.totalLentOutstanding)}</p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)" }}>Net</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(row.netPosition)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-4 shadow-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Aging buckets</h3>
            <div className="mt-3 space-y-2">
              {analytics.agingBuckets.map((bucket) => (
                <div key={bucket.label} className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>{bucket.label}</span>
                  <span>{format(bucket.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mounted && showHistoryModal && selectedDebt && createPortal(
        <div
          className="fixed inset-0 z-[9999] p-4"
          style={{ background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", overflowY: "auto" }}
        >
          <div
            className="w-full max-w-2xl rounded-xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{selectedDebt.name} timeline</h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  Running balance and reconciliation status for every debt update.
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1 rounded"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-lg p-4"
                  style={{ background: "var(--bg-card-hover)", border: `1px solid ${update.requiresReconciliation ? 'var(--color-warning)' : 'transparent'}` }}
                >
                  <div className="flex justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{getIntentLabel(update.intent)}</p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{new Date(update.updateDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right space-y-2">
                      <div>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{format(update.amount)}</p>
                      {update.balanceImpact && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Balance after: {format(update.runningBalanceAfter || 0)}
                        </p>
                      )}
                      </div>
                      <button
                        onClick={() => handleDeleteUpdate(update.id)}
                        className="px-2 py-1 rounded text-xs"
                        style={{ color: "var(--color-error)", background: "var(--bg-card)" }}
                        title="Delete debt update"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <p><strong>Status:</strong> {update.status}</p>
                    {update.note && <p><strong>Note:</strong> {update.note}</p>}
                    <p>
                      <strong>Reconciliation:</strong>{" "}
                      {update.requiresReconciliation ? "Missing linked transaction" : update.transactionId ? "Linked to transaction" : "No transaction expected"}
                    </p>
                  </div>
                  {update.transaction && (
                    <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
                      <p><strong>Transaction:</strong> {update.transaction.description || "Debt payment"}</p>
                      <p><strong>Type:</strong> {update.transaction.type}</p>
                      <p><strong>Date:</strong> {new Date(update.transaction.transactionDate).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && showActionModal && actionDebt && createPortal(
        <div
          className="fixed inset-0 z-[9999] p-4"
          style={{ background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", overflowY: "auto" }}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {actionType === "payment"
                ? "Add payment"
                : actionType === "settle"
                  ? "Mark settled"
                  : actionType === "promise"
                    ? "Log promise to pay"
                    : actionType === "reminder"
                      ? "Set follow-up reminder"
                      : "Add note"}
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{actionDebt.name}</p>

            <div className="space-y-4 mt-5">
              {(actionType === "payment" || actionType === "promise" || actionType === "settle") && (
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={actionForm.amount}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, amount: e.target.value }))}
                    readOnly={actionType === "settle" || actionDebt.debtType === "institutional"}
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  />
                </div>
              )}

              {(actionType === "reminder" || actionType === "promise") && (
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Reminder date</label>
                  <input
                    type="date"
                    value={actionForm.reminderDate}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, reminderDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  />
                </div>
              )}

              {(actionType === "payment" || actionType === "settle") && (
                <div className="flex items-center gap-3">
                  <input
                    id="createDebtTransaction"
                    type="checkbox"
                    checked={actionForm.createTransaction}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, createTransaction: e.target.checked }))}
                    className="h-4 w-4"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <label htmlFor="createDebtTransaction" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Create linked transaction
                  </label>
                </div>
              )}

              {(actionType === "payment" || actionType === "settle") && actionForm.createTransaction && (
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Transaction category</label>
                  <select
                    value={actionForm.categoryId}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  >
                    <option value="">Auto-select category</option>
                    {getCategoryOptions(actionDebt).map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Note</label>
                <textarea
                  value={actionForm.note}
                  onChange={(e) => setActionForm((prev) => ({ ...prev, note: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded"
                  style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  placeholder="Optional note for audit trail"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeActionModal}
                className="px-4 py-2 rounded"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                className="px-4 py-2 rounded"
                style={{ background: "var(--accent-primary)", color: "var(--text-inverse)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && showEditModal && editDebt && createPortal(
        <div
          className="fixed inset-0 z-[9999] p-4"
          style={{ background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", overflowY: "auto" }}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Edit debt</h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{editDebt.debtType === "institutional" ? "Institutional debt" : "Person-to-person debt"}</p>

            <div className="space-y-4 mt-5">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded"
                  style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Principal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.principal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, principal: e.target.value }))}
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Current balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.currentBalance}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, currentBalance: e.target.value }))}
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  />
                </div>
              </div>

              {editDebt.debtType === "institutional" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Installment</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.installmentAmount}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, installmentAmount: e.target.value }))}
                      className="w-full px-3 py-2 rounded"
                      style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Next due date</label>
                    <input
                      type="date"
                      value={editForm.nextDueDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, nextDueDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded"
                      style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Reminder date</label>
                  <input
                    type="date"
                    value={editForm.reminderDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, reminderDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as "active" | "completed" }))}
                  className="w-full px-3 py-2 rounded"
                  style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 rounded"
                style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitEditDebt}
                className="px-4 py-2 rounded"
                style={{ background: "var(--accent-primary)", color: "var(--text-inverse)" }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Debt"
        description="Delete this debt? This action cannot be undone. Remove its update history first if Ledgerly blocks deletion."
        confirmLabel="Delete"
        confirmColor="red-500"
        loading={false}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await deleteDebt(deleteConfirm);
            toast.success("Debt deleted.");
            await loadData();
          } catch (error: unknown) {
            console.error("Debt delete failed", error);
            toast.error(getErrorMessage(error, "Delete failed. Please try again."));
          } finally {
            setDeleteConfirm(null);
          }
        }}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
