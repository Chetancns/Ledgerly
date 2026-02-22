// components/DebtList.tsx
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Debt, DebtUpdate, DEBT_TYPES, DebtType } from "@/models/debt";
import { getUserDebts, deleteDebt, catchUpDebts, getDebtUpdates, payDebtEarly, payInstallment, deleteDebtUpdate, updateDebt } from "@/services/debts";
import { getCategories } from "@/services/category";
import { Category } from "@/models/category";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { useNotifications } from "@/context/NotificationContext";

type StatusFilter = 'all' | 'active' | 'completed' | 'overdue' | 'active+overdue';

export default function DebtList() {
  const { format } = useCurrencyFormatter();
  const { addNotification } = useNotifications();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [updates, setUpdates] = useState<DebtUpdate[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [activeDebt, setActiveDebt] = useState<Debt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [debtTypeFilter, setDebtTypeFilter] = useState<DebtType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active+overdue');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    createTransaction: true,
    categoryId: '',
    notes: '',
  });
  const [mounted, setMounted] = useState(false);
  const [notifiedDebts, setNotifiedDebts] = useState<Set<string>>(new Set());
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [editReminderDate, setEditReminderDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'balance-desc' | 'balance-asc' | 'name-asc' | 'progress-desc'>('default');

  const loadDebts = async () => {
    const res = await getUserDebts();
    setDebts(res);
  };

  useEffect(() => {
    let filtered = debtTypeFilter === 'all' 
      ? debts 
      : debts.filter(d => d.debtType === debtTypeFilter);

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(debt => {
        const isCompleted = debt.status === 'completed';
        const isOverdue = debt.reminderDate && new Date(debt.reminderDate) < new Date() && !isCompleted;
        
        if (statusFilter === 'active+overdue') {
          // Default: show active and overdue (hide completed)
          return !isCompleted;
        } else if (statusFilter === 'active') {
          return !isCompleted && !isOverdue;
        } else if (statusFilter === 'completed') {
          return isCompleted;
        } else if (statusFilter === 'overdue') {
          return isOverdue;
        }
        return true;
      });
    }
    
    setFilteredDebts(filtered);
  }, [debts, debtTypeFilter, statusFilter]);

  useEffect(() => {
    const fetchData = async () => {
      await loadDebts();
      const cats = await getCategories();
      setCategories(cats);
    };
    fetchData();
  }, []);

  // Check for overdue reminders and create notifications
  useEffect(() => {
    if (debts.length === 0) return;

    const today = new Date();
    debts.forEach(debt => {
      // Only check active debts with reminder dates
      if (debt.reminderDate && debt.status === 'active' && !notifiedDebts.has(debt.id)) {
        const reminderDate = new Date(debt.reminderDate);
        if (reminderDate < today) {
          const isOverdue = true;
          const debtTypeLabel = debt.debtType === 'borrowed' ? 'Payment Reminder' : 'Collection Reminder';
          const message = `Reminder for ${debt.name} is overdue (due: ${reminderDate.toLocaleDateString()})`;
          
          // Add notification to notification center
          addNotification({
            type: 'debt_reminder',
            title: debtTypeLabel,
            message,
            actionUrl: '/debts',
          });

          // Show toast
          toast(message, {
            icon: '⚖️',
            duration: 5000,
          });

          // Mark as notified
          setNotifiedDebts(prev => new Set(prev).add(debt.id));
        }
      }
    });
  }, [debts, addNotification, notifiedDebts]);

  // Ensure portal renders only after mount (avoids SSR document undefined)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCatchUp = async () => {
    await catchUpDebts();
    alert("✅ Catch-up processed!");
    loadDebts();
  };

  const handleSaveReminderDate = async (debtId: string) => {
    try {
      await updateDebt(debtId, { reminderDate: editReminderDate || undefined });
      toast.success("Reminder date updated successfully");
      await loadDebts();
      setEditingReminder(null);
      setEditReminderDate('');
    } catch (err: any) {
      console.error("Failed to update reminder date", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to update reminder date";
      toast.error(errorMessage);
    }
  };

  const handleStartEditReminder = (debt: Debt) => {
    setEditingReminder(debt.id);
    setEditReminderDate(debt.reminderDate || '');
  };

  const handleCancelEditReminder = () => {
    setEditingReminder(null);
    setEditReminderDate('');
  };

  const handleSelectDebt = async (debt: Debt) => {
    setSelectedDebt(debt);
    setActiveDebt(debt);
    const res = await getDebtUpdates(debt.id);
    setUpdates(Array.isArray(res) ? res : res ?? []);
    setShowPopup(true);
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!selectedDebt) return;
    
    try {
      await deleteDebtUpdate(updateId);
      toast.success("Payment update deleted successfully");
      
      // Refresh updates and debts
      const res = await getDebtUpdates(selectedDebt.id);
      setUpdates(Array.isArray(res) ? res : res ?? []);
      await loadDebts();
    } catch (err) {
      console.error("Failed to delete update", err);
      toast.error("Failed to delete payment update");
    }
  };

  const handlepayDebtEarly = async (debt: Debt) => {
    const res = await payDebtEarly(debt.id);
    toast.success(`✅ Paid early! ${res.name}`);
    loadDebts();
  };

  const handlePayInstallment = (debt: Debt) => {
    setPaymentDebt(debt);
    setPaymentForm({
      amount: debt.installmentAmount?.toString() || '',
      createTransaction: true,
      categoryId: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!paymentDebt) return;

    // Validate amount for P2P debts
    if ((paymentDebt.debtType === 'borrowed' || paymentDebt.debtType === 'lent') && !paymentForm.amount) {
      toast.error("Please enter a payment amount");
      return;
    }

    try {
      const amount = paymentForm.amount ? parseFloat(paymentForm.amount) : undefined;
      await payInstallment(
        paymentDebt.id,
        amount,
        paymentForm.createTransaction,
        paymentForm.categoryId || undefined,
        paymentForm.notes || undefined,
      );
      toast.success("✅ Installment paid!");
      setShowPaymentModal(false);
      loadDebts();
    } catch (err) {
      console.error("Payment failed", err);
      toast.error("Payment failed. Please try again.");
    }
  };

  const getDebtTypeLabel = (type: DebtType) => {
    switch (type) {
      case 'institutional': return 'Loan/Credit';
      case 'borrowed': return 'I Owe';
      case 'lent': return 'Owed to Me';
      default: return type;
    }
  };

  /** Aggregate stats based on ALL debts (not filtered), active only */
  const stats = useMemo(() => {
    const active = debts.filter(d => d.status !== 'completed');
    const totalOwed = active
      .filter(d => d.debtType !== 'lent')
      .reduce((sum, d) => sum + Number(d.currentBalance), 0);
    const totalLent = active
      .filter(d => d.debtType === 'lent')
      .reduce((sum, d) => sum + Number(d.currentBalance), 0);
    const overdueCount = active.filter(d =>
      d.reminderDate && new Date(d.reminderDate) < new Date()
    ).length;
    return {
      totalOwed,
      totalLent,
      net: totalLent - totalOwed,
      activeCount: active.length,
      overdueCount,
    };
  }, [debts]);

  /** Estimated payoff date for institutional debts */
  const getEstimatedPayoff = (debt: Debt): string | null => {
    if (debt.debtType !== 'institutional') return null;
    if (!debt.installmentAmount || !debt.frequency) return null;
    const balance = Number(debt.currentBalance);
    const installment = Number(debt.installmentAmount);
    if (installment <= 0 || balance <= 0) return null;

    const paymentsLeft = Math.ceil(balance / installment);
    const targetDate = new Date();
    if (debt.frequency === 'monthly') {
      targetDate.setMonth(targetDate.getMonth() + paymentsLeft);
    } else if (debt.frequency === 'biweekly') {
      targetDate.setDate(targetDate.getDate() + paymentsLeft * 14);
    } else if (debt.frequency === 'weekly') {
      targetDate.setDate(targetDate.getDate() + paymentsLeft * 7);
    }
    return targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  /** Apply sort to filtered debts */
  const sortedDebts = useMemo(() => {
    const list = [...filteredDebts];
    switch (sortBy) {
      case 'balance-desc':
        return list.sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance));
      case 'balance-asc':
        return list.sort((a, b) => Number(a.currentBalance) - Number(b.currentBalance));
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'progress-desc': {
        const prog = (d: Debt) =>
          d.principal > 0 ? ((d.principal - Number(d.currentBalance)) / d.principal) * 100 : 0;
        return list.sort((a, b) => prog(b) - prog(a));
      }
      default:
        return list;
    }
  }, [filteredDebts, sortBy]);

 return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {debts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Owed</p>
            <p className="text-base font-bold" style={{ color: "var(--color-error)" }}>{format(stats.totalOwed)}</p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Lent</p>
            <p className="text-base font-bold" style={{ color: "var(--color-success)" }}>{format(stats.totalLent)}</p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Net Position</p>
            <p className="text-base font-bold" style={{ color: stats.net >= 0 ? "var(--color-success)" : "var(--color-error)" }}>
              {stats.net >= 0 ? '+' : '-'}{format(Math.abs(stats.net))}
            </p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Active Debts</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {stats.activeCount}
              {stats.overdueCount > 0 && (
                <span className="text-xs ml-1" style={{ color: "var(--color-warning)" }}>
                  ({stats.overdueCount} overdue)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your Debts</h2>
        
        <div className="flex gap-3 items-center flex-wrap">
          {/* Debt Type Filter */}
          <select
            value={debtTypeFilter}
            onChange={(e) => setDebtTypeFilter(e.target.value as DebtType | 'all')}
            className="px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
          >
            <option value="all">All Debts</option>
            <option value="institutional">Institutional</option>
            <option value="borrowed">Borrowed</option>
            <option value="lent">Lent</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
          >
            <option value="active+overdue">Active + Overdue</option>
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
            <option value="overdue">Overdue Only</option>
            <option value="all">All Status</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
          >
            <option value="default">Sort: Default</option>
            <option value="balance-desc">Balance: High → Low</option>
            <option value="balance-asc">Balance: Low → High</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="progress-desc">Progress: Most First</option>
          </select>

          <button
            onClick={handleCatchUp}
            className="px-4 py-2 rounded transition"
            style={{ background: "var(--color-success)", color: "#fff" }}
          >
            Catch Up All Debts
          </button>
        </div>
      </div>

      {/* Debt Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedDebts.map((debt) => {
          const progress =
            debt.principal > 0
              ? ((debt.principal - debt.currentBalance) / debt.principal) * 100
              : 0;
          const isCompleted = debt.status === 'completed' || progress >= 100;
          const isOverdue = debt.reminderDate && new Date(debt.reminderDate) < new Date() && !isCompleted;
          const estimatedPayoff = !isCompleted ? getEstimatedPayoff(debt) : null;

          return (
            <div
              key={debt.id}
              className="backdrop-blur-lg rounded-lg shadow-lg p-5 flex flex-col transition hover:scale-[1.02]"
              style={{ 
                background: isCompleted ? "var(--bg-card-hover)" : "var(--bg-card)", 
                border: `2px solid ${isCompleted ? 'var(--color-success)' : isOverdue ? 'var(--color-warning)' : 'var(--border-primary)'}`,
                opacity: isCompleted ? 0.7 : 1
              }}
            >
              {/* Title + Amount */}
              <div className="mb-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    {debt.name}
                    {isCompleted && <span className="ml-2 text-xs">✅</span>}
                  </h3>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: debt.debtType === 'borrowed' ? 'var(--color-error)' : 
                                  debt.debtType === 'lent' ? 'var(--color-success)' : 
                                  'var(--color-info)',
                      color: '#fff'
                    }}
                  >
                    {getDebtTypeLabel(debt.debtType)}
                  </span>
                </div>
                {isCompleted && (
                  <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                    Completed 🎉
                  </p>
                )}
                {(debt.personName) && (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {debt.debtType === 'borrowed' ? 'Owed to: ' : 'Owed by: '}{debt.personName}
                  </p>
                )}
                {debt.installmentAmount && (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Installment: {format(debt.installmentAmount)}
                  </p>
                )}
              </div>

              {/* Debt Info */}
              <div className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                <p>
                  <strong>Principal:</strong> {format(debt.principal)}
                </p>
                <p>
                  <strong>Balance:</strong> {format(debt.currentBalance)}
                </p>
                {debt.term && (
                  <p>
                    <strong>Term:</strong> {debt.term} payments
                  </p>
                )}
                {debt.nextDueDate && debt.debtType === 'institutional' && (
                  <p>
                    <strong>Next Due:</strong>{" "}
                    {new Date(debt.nextDueDate).toLocaleDateString()}
                  </p>
                )}
                {estimatedPayoff && (
                  <p>
                    <strong>Est. Payoff:</strong>{" "}
                    <span style={{ color: "var(--color-info)" }}>{estimatedPayoff}</span>
                  </p>
                )}
                {debt.reminderDate && (debt.debtType === 'borrowed' || debt.debtType === 'lent') && !isCompleted && (
                  <div style={{ color: isOverdue ? "var(--color-warning)" : "var(--text-secondary)" }}>
                    {editingReminder === debt.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editReminderDate}
                          onChange={(e) => setEditReminderDate(e.target.value)}
                          className="px-2 py-1 rounded text-xs"
                          style={{ 
                            background: "var(--input-bg)", 
                            color: "var(--input-text)", 
                            border: "1px solid var(--input-border)" 
                          }}
                        />
                        <button
                          onClick={() => handleSaveReminderDate(debt.id)}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: "var(--color-success)", color: "#fff" }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEditReminder}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: "var(--color-error)", color: "#fff" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p className="flex items-center gap-2">
                        <strong>{isOverdue ? '⚠️ ' : ''}Reminder:</strong>{" "}
                        {new Date(debt.reminderDate).toLocaleDateString()}
                        {isOverdue && ' (Overdue)'}
                        <button
                          onClick={() => handleStartEditReminder(debt)}
                          className="text-xs px-2 py-0.5 rounded hover:opacity-80"
                          style={{ background: "var(--accent-primary)", color: "#fff" }}
                          title="Edit reminder date"
                        >
                          ✏️
                        </button>
                      </p>
                    )}
                  </div>
                )}
                {!debt.reminderDate && (debt.debtType === 'borrowed' || debt.debtType === 'lent') && !isCompleted && (
                  <div>
                    {editingReminder === debt.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editReminderDate}
                          onChange={(e) => setEditReminderDate(e.target.value)}
                          className="px-2 py-1 rounded text-xs"
                          style={{ 
                            background: "var(--input-bg)", 
                            color: "var(--input-text)", 
                            border: "1px solid var(--input-border)" 
                          }}
                        />
                        <button
                          onClick={() => handleSaveReminderDate(debt.id)}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: "var(--color-success)", color: "#fff" }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEditReminder}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: "var(--color-error)", color: "#fff" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditReminder(debt)}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ background: "var(--accent-secondary)", color: "#fff" }}
                      >
                        + Add Reminder
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--skeleton-base)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${progress}%`, background: "var(--accent-secondary)" }}
                  ></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-4 gap-2">
                {!isCompleted && (
                  <>
                    <button
                      className="px-3 py-1 rounded transition text-xs"
                      onClick={() => handleSelectDebt(debt)}
                      style={{ background: "var(--accent-secondary)", color: "#fff" }}
                    >
                      Updates
                    </button>
                    <button
                      className="px-3 py-1 rounded transition text-xs"
                      onClick={() => handlePayInstallment(debt)}
                      style={{ background: "var(--color-info)", color: "#fff" }}
                    >
                      Pay Now
                    </button>
                    {/* Pay Early only for institutional debts */}
                    {debt.debtType === 'institutional' && debt.nextDueDate && (
                      <button
                        className="px-3 py-1 rounded transition text-xs"
                        onClick={() => {
                          handlepayDebtEarly(debt)
                        }}
                        style={{ background: "var(--color-warning)", color: "#fff" }}
                      >
                        Pay Early
                      </button>
                    )}
                  </>
                )}
                {isCompleted && (
                  <button
                    className="px-3 py-1 rounded transition text-xs"
                    onClick={() => handleSelectDebt(debt)}
                    style={{ background: "var(--accent-secondary)", color: "#fff" }}
                  >
                    View History
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm(debt.id)}
                  className="transition-transform hover:scale-110"
                  title="Delete"
                  style={{ color: "var(--color-error)" }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {sortedDebts.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <p className="text-4xl mb-3">💳</p>
          <p className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No debts found</p>
          <p className="text-sm">
            {debts.length === 0
              ? "You haven't added any debts yet. Use the form above to track loans, borrowed money, or money you've lent."
              : "No debts match your current filters. Try adjusting the filters above."}
          </p>
        </div>
      )}

      {/* Popup for Updates */}
      {mounted && showPopup && selectedDebt &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] p-4"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              display: "grid",
              placeItems: "center",
              width: "100vw",
              height: "100vh",
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          >
            <div
              className="rounded-xl p-6 w-full max-w-lg shadow-2xl"
              style={{ background: "var(--bg-card)", border: "2px solid var(--accent-primary)", maxHeight: "85vh", overflowY: "auto" }}
            >
              <h3 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                {selectedDebt.name} Updates
              </h3>

              <ul className="space-y-4">
                {updates.map((u) => (
                  <li key={u.id} className="p-4 rounded-lg shadow relative" style={{ background: "var(--bg-card-hover)" }}>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteUpdate(u.id)}
                      className="absolute top-2 right-2 transition-transform hover:scale-110"
                      title="Delete payment update"
                      style={{ color: "var(--color-error)" }}
                    >
                      🗑️
                    </button>

                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      <strong>Amount:</strong> {format(u.amount)}
                      <br />
                      <strong>Status:</strong> {u.status}
                      <br />
                      <strong>Update Date:</strong> {u.updateDate}
                      <br />
                      <strong>Transaction ID:</strong> {u.transactionId || 'None'}
                      {u.notes && (
                        <>
                          <br />
                          <strong>Notes:</strong> {u.notes}
                        </>
                      )}
                    </p>

                    {u.transaction && (
                      <div className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>
                        <p>
                          <strong>Amount:</strong> {format(u.transaction.amount)}
                        </p>
                        <p>
                          <strong>Description:</strong> {u.transaction.description}
                        </p>
                        <p>
                          <strong>Type:</strong> {u.transaction.type}
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date(
                            u.transaction.transactionDate
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowPopup(false)}
                  className="px-4 py-2 rounded transition"
                  style={{ background: "var(--accent-secondary)", color: "#fff" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reusable Delete Confirmation */}
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Debt"
        description="Delete this debt? This action cannot be undone. Please make sure to delete any associated Transaction that may exist."
        confirmLabel="Delete"
        confirmColor="red-500"
        loading={false}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await deleteDebt(deleteConfirm);
            toast.success("Debt deleted.");
            await loadDebts();
          } catch (err: any) {
            console.error("Debt delete failed", err);
            // Display the actual error message from backend
            const errorMessage = err?.response?.data?.message || err?.message || "Delete failed. Please try again.";
            toast.error(errorMessage);
          } finally {
            setDeleteConfirm(null);
          }
        }}
        onClose={() => setDeleteConfirm(null)}
      />

      {/* Payment Modal */}
      {mounted && showPaymentModal && paymentDebt &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] p-4"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              display: "grid",
              placeItems: "center",
              width: "100vw",
              height: "100vh",
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          >
            <div
              className="rounded-xl p-6 w-full max-w-md shadow-2xl"
              style={{ background: "var(--bg-card)", border: "2px solid var(--accent-primary)", maxHeight: "85vh", overflowY: "auto" }}
            >
              <h3 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                {paymentDebt.debtType === 'institutional' ? 'Pay Installment' : 'Make Payment'}: {paymentDebt.name}
              </h3>
              
              <div className="space-y-4">
                {/* Amount input - editable for P2P debts, readonly for institutional */}
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    readOnly={paymentDebt.debtType === 'institutional'}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 rounded"
                    style={{ 
                      background: paymentDebt.debtType === 'institutional' ? "var(--bg-card-hover)" : "var(--input-bg)", 
                      color: "var(--input-text)", 
                      border: "1px solid var(--input-border)" 
                    }}
                  />
                  {(paymentDebt.debtType === 'borrowed' || paymentDebt.debtType === 'lent') && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Current balance: {format(paymentDebt.currentBalance)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="createTransactionPayment"
                    type="checkbox"
                    checked={paymentForm.createTransaction}
                    onChange={(e) => setPaymentForm({ ...paymentForm, createTransaction: e.target.checked })}
                    className="accent-yellow-300"
                  />
                  <label htmlFor="createTransactionPayment" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Create transaction for this payment
                  </label>
                </div>

                {paymentForm.createTransaction && (
                  <div>
                    <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                      Transaction Category
                    </label>
                    <select
                      value={paymentForm.categoryId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2 rounded"
                      style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter(c => c.type === (paymentDebt.debtType === 'lent' ? 'income' : 'expense'))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                    Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="e.g. Bank transfer ref #1234"
                    className="w-full px-3 py-2 rounded"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded transition"
                  style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  className="px-4 py-2 rounded transition"
                  style={{ background: "var(--accent-primary)", color: "var(--text-inverse)" }}
                >
                  Pay Installment
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
