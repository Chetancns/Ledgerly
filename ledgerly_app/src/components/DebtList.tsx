// components/DebtList.tsx
import { useEffect, useState } from "react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Debt, DebtUpdate } from "@/models/debt";
import { getUserDebts, deleteDebt, catchUpDebts, getDebtUpdates, payDebtEarly } from "@/services/debts";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function DebtList() {
  const { format } = useCurrencyFormatter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [updates, setUpdates] = useState<DebtUpdate[]>([]);
  const [showPopup, setShowPopup] = useState(false);
const [activeDebt, setActiveDebt] = useState<Debt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const loadDebts = async () => {
    const res = await getUserDebts();
    setDebts(res);
  };

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
  const handlepayDebtEarly = async (debt:Debt)=>{
    const res = await payDebtEarly(debt.id);
    alert("✅ Paid early!"+res.name);
    loadDebts();
  }

  useEffect(() => {
    loadDebts();
  }, []);

 return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your Debts</h2>
        <button
          onClick={handleCatchUp}
          className="px-4 py-2 rounded transition"
          style={{ background: "var(--color-success)", color: "#fff" }}
        >
          Catch Up All Debts
        </button>
      </div>

      {/* Debt Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {debts.map((debt) => {
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
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{debt.name}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Installment: {format(debt.installmentAmount)}
                </p>
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
                <p>
                  <strong>Next Due:</strong>{" "}
                  {new Date(debt.nextDueDate).toLocaleDateString()}
                </p>
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
              <div className="flex justify-between items-center mt-4">
                <button
                  className="px-3 py-1 rounded transition"
                  onClick={() => handleSelectDebt(debt)}
                  style={{ background: "var(--accent-secondary)", color: "#fff" }}
                >
                  View Updates
                </button>
                <button
                  className="px-3 py-1 rounded transition"
                  onClick={ () => {
                    handlepayDebtEarly(debt) // service call
                    
                  }}
                  style={{ background: "var(--color-warning)", color: "#fff" }}
                >
                  Pay Early
                </button>
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
      {showPopup && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <h3 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              {selectedDebt.name} Updates
            </h3>

            <ul className="space-y-4">
              {updates.map((u) => (
                <li key={u.id} className="p-4 rounded-lg shadow" style={{ background: "var(--bg-card-hover)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    <strong>Status:</strong> {u.status}
                    <br />
                    <strong>Update Date:</strong> {u.updateDate}
                    <br />
                    <strong>Transaction ID:</strong> {u.transactionId}
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
        </div>
      )}

      {/* Reusable Delete Confirmation */}
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Debt"
        description="Delete this debt? This action cannot be undone."
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
    </div>
  );
}
