// components/DebtList.tsx
import { useEffect, useState } from "react";
import { Debt, DebtUpdate } from "@/models/debt";
import { getUserDebts, deleteDebt, catchUpDebts, getDebtUpdates, payDebtEarly } from "@/services/debts";

export default function DebtList() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [updates, setUpdates] = useState<DebtUpdate[]>([]);
  const [showPopup, setShowPopup] = useState(false);
const [activeDebt, setActiveDebt] = useState<Debt | null>(null);
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
        <h2 className="text-xl font-bold">Your Debts</h2>
        <button
          onClick={handleCatchUp}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
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
              className="bg-white/90 backdrop-blur-lg rounded-lg shadow-lg border border-gray-200 p-5 flex flex-col transition hover:scale-[1.02]"
            >
              {/* Title + Amount */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{debt.name}</h3>
                <p className="text-sm text-gray-500">
                  Installment: ${debt.installmentAmount}
                </p>
              </div>

              {/* Debt Info */}
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <strong>Principal:</strong> ${debt.principal}
                </p>
                <p>
                  <strong>Balance:</strong> ${debt.currentBalance}
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
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-4">
                <button
                  className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
                  onClick={() => handleSelectDebt(debt)}
                >
                  View Updates
                </button>
                <button
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                  onClick={ () => {
                    handlepayDebtEarly(debt) // service call
                    
                  }}
                >
                  Pay Early
                </button>
                <button
                  onClick={() => deleteDebt(debt.id).then(loadDebts)}
                  className="text-red-600 hover:text-red-800 transition-transform hover:scale-110"
                  title="Delete"
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
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {selectedDebt.name} Updates
            </h3>

            <ul className="space-y-4">
              {updates.map((u) => (
                <li key={u.id} className="p-4 bg-gray-100 rounded-lg shadow">
                  <p className="text-sm text-gray-700">
                    <strong>Status:</strong> {u.status}
                    <br />
                    <strong>Update Date:</strong> {u.updateDate}
                    <br />
                    <strong>Transaction ID:</strong> {u.transactionId}
                  </p>

                  {u.transaction && (
                    <div className="mt-2 text-sm text-gray-800">
                      <p>
                        <strong>Amount:</strong> ${u.transaction.amount}
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
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
