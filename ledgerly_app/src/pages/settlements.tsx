// pages/settlements.tsx
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { 
  createSettlement, 
  getUserSettlements, 
  deleteSettlement,
  getCounterparties,
  getSettlementGroups,
  Settlement 
} from "@/services/settlements";
import { listReimbursables } from "@/services/transactions";
import { Transaction } from "@/models/Transaction";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function SettlementsPage() {
  const { format } = useCurrencyFormatter();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedCounterparty, setSelectedCounterparty] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  
  // Filter state
  const [filterCounterparty, setFilterCounterparty] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  
  // Options
  const [counterpartyOptions, setCounterpartyOptions] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterCounterparty, filterGroup]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settlementsRes, counterparties, groups] = await Promise.all([
        getUserSettlements({
          counterpartyName: filterCounterparty || undefined,
          settlementGroupId: filterGroup || undefined,
        }),
        getCounterparties(),
        getSettlementGroups(),
      ]);
      
      setSettlements(settlementsRes);
      setCounterpartyOptions(counterparties);
      setGroupOptions(groups);
      
      // Load pending transactions if creating settlement
      if (showForm) {
        const txRes = await listReimbursables({
          counterpartyName: selectedCounterparty || undefined,
          settlementGroupId: selectedGroup || undefined,
        });
        // Filter out fully reimbursed transactions
        const pending = (txRes.data || []).filter((tx: Transaction) => {
          const txAmount = Number(tx.amount);
          const reimbursed = Number(tx.reimbursedAmount || 0);
          return txAmount > reimbursed;
        });
        setPendingTransactions(pending);
      }
    } catch (err) {
      console.error('Failed to load data', err);
      toast.error('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPending = () => {
    return pendingTransactions.reduce((sum, tx) => {
      const txAmount = Number(tx.amount);
      const reimbursed = Number(tx.reimbursedAmount || 0);
      return sum + (txAmount - reimbursed);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroup && !selectedCounterparty) {
      toast.error("Please select a counterparty or settlement group");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await toast.promise(
        createSettlement({
          counterpartyName: selectedCounterparty || undefined,
          settlementGroupId: selectedGroup || undefined,
          amount,
          settlementDate: date,
          notes,
        }),
        {
          loading: "Recording settlement...",
          success: "✅ Settlement recorded successfully!",
          error: "Failed to record settlement",
        }
      );

      // Reset form
      setAmount("");
      setNotes("");
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error("Settlement error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSettlement(id);
      toast.success("Settlement deleted");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete settlement");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const groupedTransactions = () => {
    const grouped = new Map<string, Transaction[]>();
    
    pendingTransactions.forEach(tx => {
      const key = tx.settlementGroupId || "No Group";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(tx);
    });
    
    return grouped;
  };

  return (
    <Layout>
      <div className="mx-auto backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Settlements
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 rounded-lg font-semibold transition-all"
            style={{ background: "var(--color-success)", color: "#fff" }}
          >
            {showForm ? "Cancel" : "➕ Record Settlement"}
          </button>
        </div>

        {/* Create Settlement Form */}
        {showForm && (
          <div className="mb-8 p-6 rounded-xl border" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Record New Settlement
            </h2>

            {/* Filter Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Counterparty
                </label>
                <select
                  value={selectedCounterparty}
                  onChange={(e) => {
                    setSelectedCounterparty(e.target.value);
                    loadData();
                  }}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                >
                  <option value="">All</option>
                  {counterpartyOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Settlement Group
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    loadData();
                  }}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                >
                  <option value="">All</option>
                  {groupOptions.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pending Transactions */}
            {pendingTransactions.length > 0 ? (
              <div className="mb-4 p-4 rounded-lg" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                  Pending Transactions ({pendingTransactions.length})
                </h3>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Array.from(groupedTransactions().entries()).map(([groupKey, txs]) => {
                    const groupTotal = txs.reduce((sum, tx) => {
                      const pending = Number(tx.amount) - Number(tx.reimbursedAmount || 0);
                      return sum + pending;
                    }, 0);
                    
                    return (
                      <div key={groupKey} className="p-3 rounded-lg" style={{ background: "var(--bg-card-hover)" }}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {groupKey === "No Group" ? "🔹 Ungrouped" : `📁 ${groupKey}`}
                          </div>
                          <div className="font-semibold" style={{ color: "var(--color-success)" }}>
                            {format(groupTotal)} pending
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {txs.map((tx) => {
                            const pending = Number(tx.amount) - Number(tx.reimbursedAmount || 0);
                            return (
                              <div key={tx.id} className="flex justify-between text-sm px-2 py-1">
                                <div style={{ color: "var(--text-secondary)" }}>
                                  {tx.description || "No description"}
                                </div>
                                <div style={{ color: "var(--text-primary)" }}>
                                  {format(pending)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-3 pt-3 border-t flex justify-between font-bold text-lg" style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
                  <span>Total Pending:</span>
                  <span>{format(calculateTotalPending())}</span>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-8 rounded-lg text-center" style={{ background: "var(--bg-card)" }}>
                <p style={{ color: "var(--text-muted)" }}>
                  No pending reimbursable transactions found for selected filters
                </p>
              </div>
            )}

            {/* Settlement Form */}
            {pendingTransactions.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                      Amount Received *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                      Settlement Date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
                    placeholder="e.g., Paid via Venmo..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg font-semibold transition-all"
                  style={{ background: "var(--color-success)", color: "#fff" }}
                >
                  Record Settlement
                </button>
              </form>
            )}
          </div>
        )}

        {/* Settlement History */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Settlement History
            </h2>
            
            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={filterCounterparty}
                onChange={(e) => setFilterCounterparty(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="">All People</option>
                {counterpartyOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
              >
                <option value="">All Groups</option>
                {groupOptions.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ background: "var(--bg-card-hover)" }}>
              <p style={{ color: "var(--text-muted)" }}>
                No settlements recorded yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="p-4 rounded-lg flex justify-between items-start"
                  style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-primary)" }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {settlement.counterpartyName && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "var(--accent-secondary)", color: "#fff" }}>
                          👤 {settlement.counterpartyName}
                        </span>
                      )}
                      {settlement.settlementGroupId && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "var(--accent-primary)", color: "#fff" }}>
                          📁 {settlement.settlementGroupId}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
                      <div>
                        <strong>Amount:</strong> {format(parseFloat(settlement.amount))}
                      </div>
                      <div>
                        <strong>Date:</strong> {new Date(settlement.settlementDate).toLocaleDateString()}
                      </div>
                      {settlement.notes && (
                        <div>
                          <strong>Notes:</strong> {settlement.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteConfirm(settlement.id)}
                    className="text-red-500 hover:text-red-600 transition-colors ml-4"
                    title="Delete settlement"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Settlement"
        description="Delete this settlement? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="red-500"
        loading={false}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
      />
    </Layout>
  );
}
