// components/DebtList.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Debt, DebtUpdate, DEBT_TYPES, DebtType } from "@/models/debt";
import { getUserDebts, deleteDebt, catchUpDebts, getDebtUpdates, payDebtEarly, payInstallment, deleteDebtUpdate } from "@/services/debts";
import { getCategories } from "@/services/category";
import { Category } from "@/models/category";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function DebtList() {
  const { format } = useCurrencyFormatter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [updates, setUpdates] = useState<DebtUpdate[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [activeDebt, setActiveDebt] = useState<Debt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [debtTypeFilter, setDebtTypeFilter] = useState<DebtType | 'all'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    createTransaction: true,
    categoryId: '',
  });
  const [mounted, setMounted] = useState(false);

  const loadDebts = async () => {
    const res = await getUserDebts();
    setDebts(res);
  };

  useEffect(() => {
    const filtered = debtTypeFilter === 'all' 
      ? debts 
      : debts.filter(d => d.debtType === debtTypeFilter);
    setFilteredDebts(filtered);
  }, [debts, debtTypeFilter]);

  useEffect(() => {
    const fetchData = async () => {
      await loadDebts();
      const cats = await getCategories();
      setCategories(cats);
    };
    fetchData();
  }, []);

  // Ensure portal renders only after mount (avoids SSR document undefined)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCatchUp = async () => {
    await catchUpDebts();
    alert("✅ Catch-up processed!");
    loadDebts();
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
        paymentForm.categoryId || undefined
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

 return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your Debts</h2>
        
        <div className="flex gap-3 items-center flex-wrap">
          {/* Filter */}
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
        {filteredDebts.map((debt) => {
          const progress =
            debt.principal > 0
              ? ((debt.principal - debt.currentBalance) / debt.principal) * 100
              : 0;

          return (
            <div
              key={debt.id}
              className="backdrop-blur-lg rounded-lg shadow-lg p-5 flex flex-col transition hover:scale-[1.02]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
            >
              {/* Title + Amount */}
              <div className="mb-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    {debt.name}
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
                {debt.nextDueDate && (
                  <p>
                    <strong>Next Due:</strong>{" "}
                    {new Date(debt.nextDueDate).toLocaleDateString()}
                  </p>
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
          } catch (err) {
            console.error("Debt delete failed", err);
            toast.error("Delete failed. Please try again.");
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
