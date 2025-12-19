// components/EnhancedDebtList.tsx
import { useEffect, useState } from "react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Debt, DebtUpdate, Repayment } from "@/models/debt";
import { getUserDebts, deleteDebt, catchUpDebts, getDebtUpdates, payDebtEarly, getRepayments } from "@/services/debts";
import ConfirmModal from "@/components/ConfirmModal";
import RepaymentModal from "@/components/RepaymentModal";
import BatchSettlementModal from "@/components/BatchSettlementModal";
import toast from "react-hot-toast";

export default function EnhancedDebtList() {
  const { format } = useCurrencyFormatter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [updates, setUpdates] = useState<DebtUpdate[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [activeDebt, setActiveDebt] = useState<Debt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<"all" | "lent" | "borrowed" | "institutional" | "settlement-groups">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "settled" | "overdue">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"amount" | "dueDate" | "created" | "status">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [settlementGroups, setSettlementGroups] = useState<string[]>([]);
  const [selectedSettlementGroup, setSelectedSettlementGroup] = useState<string | null>(null);
  
  // Batch settlement state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedDebtsForBatch, setSelectedDebtsForBatch] = useState<Set<string>>(new Set());
  const [showBatchSettlementModal, setShowBatchSettlementModal] = useState(false);

  const loadDebts = async () => {
    const res = await getUserDebts();
    setDebts(res);
    
    // Extract unique settlement groups
    const groups = res
      .filter((d) => d.settlementGroupId)
      .map((d) => d.settlementGroupId!)
      .filter((v, i, a) => a.indexOf(v) === i);
    setSettlementGroups(groups);
  };

  const handleCatchUp = async () => {
    try {
      await toast.promise(catchUpDebts(), {
        loading: "Processing catch-up...",
        success: "✅ Catch-up completed!",
        error: "Catch-up failed",
      });
      loadDebts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (debtId: string) => {
    try {
      await toast.promise(deleteDebt(debtId), {
        loading: "Deleting debt...",
        success: "✅ Debt deleted successfully!",
        error: "Failed to delete debt",
      });
      loadDebts();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDebt = async (debt: Debt) => {
    setSelectedDebt(debt);
    setActiveDebt(debt);

    if (debt.role === "institutional") {
      const res = await getDebtUpdates(debt.id);
      setUpdates(Array.isArray(res) ? res : res ?? []);
      setRepayments([]);
    } else {
      const res = await getRepayments(debt.id);
      setRepayments(Array.isArray(res) ? res : res ?? []);
      setUpdates([]);
    }

    setShowPopup(true);
  };

  const handlePayDebtEarly = async (debt: Debt) => {
    try {
      await toast.promise(payDebtEarly(debt.id), {
        loading: "Processing early payment...",
        success: `✅ ${debt.name} paid early!`,
        error: "Early payment failed",
      });
      loadDebts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRepayment = (debt: Debt) => {
    setActiveDebt(debt);
    setShowRepaymentModal(true);
  };

  useEffect(() => {
    loadDebts();
  }, []);

  // Advanced filtering
  const filteredDebts = debts.filter((debt) => {
    // Role filter
    if (filterRole !== "all") {
      if (filterRole === "settlement-groups") {
        if (!selectedSettlementGroup) {
          if (!debt.settlementGroupId) return false;
        } else if (debt.settlementGroupId !== selectedSettlementGroup) {
          return false;
        }
      } else if (debt.role !== filterRole) {
        return false;
      }
    }
    
    // Status filter
    if (filterStatus !== "all" && debt.status !== filterStatus) {
      return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = debt.name.toLowerCase().includes(query);
      const matchesCounterparty = debt.counterpartyName?.toLowerCase().includes(query);
      if (!matchesName && !matchesCounterparty) return false;
    }
    
    return true;
  });
  
  // Sorting
  const sortedDebts = [...filteredDebts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "amount":
        comparison = Number(a.remaining || 0) - Number(b.remaining || 0);
        break;
      case "dueDate":
        const dateA = a.dueDate || a.nextDueDate || "";
        const dateB = b.dueDate || b.nextDueDate || "";
        comparison = dateA.localeCompare(dateB);
        break;
      case "created":
        comparison = (a.createdAt || "").localeCompare(b.createdAt || "");
        break;
      case "status":
        comparison = (a.status || "").localeCompare(b.status || "");
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const lentDebts = debts.filter((d) => d.role === "lent");
  const borrowedDebts = debts.filter((d) => d.role === "borrowed");
  const institutionalDebts = debts.filter((d) => d.role === "institutional");

  const toggleDebtSelection = (debtId: string) => {
    const newSet = new Set(selectedDebtsForBatch);
    if (newSet.has(debtId)) {
      newSet.delete(debtId);
    } else {
      newSet.add(debtId);
    }
    setSelectedDebtsForBatch(newSet);
  };

  const handleBatchSettlement = () => {
    const selectedDebts = debts.filter(d => selectedDebtsForBatch.has(d.id));
    if (selectedDebts.length === 0) {
      toast.error("Please select at least one debt to settle");
      return;
    }
    setShowBatchSettlementModal(true);
  };

  const renderDebtCard = (debt: Debt) => {
    const remaining = debt.remaining ? Number(debt.remaining) : 0;
    const progress = debt.progress ? Number(debt.progress) : 0;

    const getStatusColor = () => {
      if (debt.status === "settled") return "var(--color-success)";
      if (debt.status === "overdue") return "var(--color-error)";
      return "var(--accent-secondary)";
    };

    const isPersonal = debt.role === "lent" || debt.role === "borrowed";
    const isSelected = selectedDebtsForBatch.has(debt.id);

    return (
      <div
        key={debt.id}
        className="backdrop-blur-lg rounded-lg shadow-lg p-5 flex flex-col transition hover:scale-[1.02]"
        style={{ 
          background: "var(--bg-card)", 
          border: `2px solid ${isSelected ? "var(--color-success)" : "var(--border-primary)"}` 
        }}
      >
        {/* Batch Mode Checkbox */}
        {batchMode && filterRole === "settlement-groups" && (
          <div className="mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleDebtSelection(debt.id)}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Select for batch settlement
              </span>
            </label>
          </div>
        )}
        
        {/* Title + Role Badge */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {debt.name}
            </h3>
            {isPersonal && debt.counterpartyName && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {debt.role === "lent" ? "Lent to:" : "Borrowed from:"} {debt.counterpartyName}
              </p>
            )}
            {debt.settlementGroupId && (
              <p className="text-xs mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--skeleton-base)" }}>
                📁 {debt.settlementGroupId}
              </p>
            )}
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: debt.role === "lent" ? "var(--color-success)" : debt.role === "borrowed" ? "var(--color-error)" : "var(--accent-secondary)",
              color: "#fff",
            }}
          >
            {debt.role === "lent" ? "💰 Lent" : debt.role === "borrowed" ? "💸 Borrowed" : "🏦 Institutional"}
          </span>
        </div>

        {/* Debt Info */}
        <div className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            <strong>Principal:</strong> {format(debt.principal)}
          </p>
          <p>
            <strong>Remaining:</strong> {format(remaining)}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span style={{ color: getStatusColor(), fontWeight: "bold" }}>
              {debt.status}
            </span>
          </p>
          {!isPersonal && debt.installmentAmount && (
            <p>
              <strong>Installment:</strong> {format(debt.installmentAmount)}
            </p>
          )}
          {!isPersonal && debt.term && (
            <p>
              <strong>Term:</strong> {debt.term} payments
            </p>
          )}
          {!isPersonal && debt.nextDueDate && (
            <p>
              <strong>Next Due:</strong> {new Date(debt.nextDueDate).toLocaleDateString()}
            </p>
          )}
          {isPersonal && debt.dueDate && (
            <p>
              <strong>Due:</strong> {new Date(debt.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <span>Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div
            className="w-full rounded-full h-2 overflow-hidden"
            style={{ background: "var(--skeleton-base)" }}
          >
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progress}%`, background: getStatusColor() }}
            ></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-4 gap-2">
          <button
            className="px-3 py-1 rounded transition text-sm"
            onClick={() => handleSelectDebt(debt)}
            style={{ background: "var(--accent-secondary)", color: "#fff" }}
          >
            {isPersonal ? "View Repayments" : "View Updates"}
          </button>

          {isPersonal ? (
            <button
              className="px-3 py-1 rounded transition text-sm"
              onClick={() => handleAddRepayment(debt)}
              style={{ background: "var(--color-success)", color: "#fff" }}
            >
              Add Repayment
            </button>
          ) : (
            <button
              className="px-3 py-1 rounded transition text-sm"
              onClick={() => handlePayDebtEarly(debt)}
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
  };

  return (
    <div className="space-y-6">
      {/* Header with Search & Sort */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Your Debts
          </h2>
          
          {/* Search & Sort Controls */}
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="text"
              placeholder="Search debts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm w-64"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            >
              <option value="dueDate">Sort: Due Date</option>
              <option value="amount">Sort: Amount</option>
              <option value="created">Sort: Created</option>
              <option value="status">Sort: Status</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 rounded-lg transition-all text-sm font-medium"
              style={{
                background: "var(--accent-secondary)",
                color: "#fff",
              }}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        
        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          {["open", "settled", "overdue", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filterStatus === status
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {status === "open" && "🟢 Open"}
              {status === "settled" && "✅ Settled"}
              {status === "overdue" && "🔴 Overdue"}
              {status === "all" && "All Status"}
            </button>
          ))}
        </div>

        {/* Role Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "lent", "borrowed", "institutional", "settlement-groups"].map((role) => (
            <button
              key={role}
              onClick={() => {
                setFilterRole(role as any);
                if (role !== "settlement-groups") setSelectedSettlementGroup(null);
              }}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filterRole === role
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {role === "all" && "All Types"}
              {role === "lent" && `💰 Lent (${lentDebts.length})`}
              {role === "borrowed" && `💸 Borrowed (${borrowedDebts.length})`}
              {role === "institutional" && `🏦 Institutional (${institutionalDebts.length})`}
              {role === "settlement-groups" && `📁 Groups (${settlementGroups.length})`}
            </button>
          ))}

          {institutionalDebts.length > 0 && (
            <button
              onClick={handleCatchUp}
              className="px-4 py-2 rounded transition"
              style={{ background: "var(--color-success)", color: "#fff" }}
            >
              Catch Up All
            </button>
          )}
        </div>
      </div>

      {/* Settlement Group Selector */}
      {filterRole === "settlement-groups" && settlementGroups.length > 0 && (
        <div className="backdrop-blur-lg rounded-lg shadow-lg p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-secondary)" }}>
                Filter by Settlement Group:
              </label>
              <select
                value={selectedSettlementGroup || ""}
                onChange={(e) => setSelectedSettlementGroup(e.target.value || null)}
                className="w-full md:w-64 px-3 py-2 rounded"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              >
                <option value="">All Groups</option>
                {settlementGroups.map((group) => {
                  const groupDebts = debts.filter((d) => d.settlementGroupId === group);
                  const totalAmount = groupDebts.reduce((sum, d) => sum + Number(d.remaining || 0), 0);
                  return (
                    <option key={group} value={group}>
                      {group} ({groupDebts.length} debts, {format(totalAmount)} remaining)
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBatchMode(!batchMode);
                  setSelectedDebtsForBatch(new Set());
                }}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  batchMode
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {batchMode ? "✓ Batch Mode" : "Enable Batch Settlement"}
              </button>
              
              {batchMode && (
                <>
                  <button
                    onClick={() => {
                      const groupDebts = sortedDebts.filter(d => d.settlementGroupId === selectedSettlementGroup);
                      setSelectedDebtsForBatch(new Set(groupDebts.map(d => d.id)));
                    }}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--accent-secondary)", color: "#fff" }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedDebtsForBatch(new Set())}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-error)", color: "#fff" }}
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>
          
          {batchMode && (
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-card-hover)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Selected: {selectedDebtsForBatch.size} debts
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Total: {format(debts.filter(d => selectedDebtsForBatch.has(d.id)).reduce((sum, d) => sum + Number(d.remaining || 0), 0))}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDebtsForBatch(new Set())}
                  className="px-3 py-1 rounded text-sm"
                  style={{ background: "var(--color-error)", color: "#fff" }}
                  disabled={selectedDebtsForBatch.size === 0}
                >
                  Clear
                </button>
                <button
                  onClick={handleBatchSettlement}
                  className="px-4 py-1 rounded text-sm font-medium"
                  style={{ background: "var(--color-success)", color: "#fff" }}
                  disabled={selectedDebtsForBatch.size === 0}
                >
                  Settle Up ({selectedDebtsForBatch.size})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debt Cards */}
      {sortedDebts.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <div className="mb-4 text-4xl">
            {searchQuery ? "🔍" : filterStatus === "settled" ? "✅" : filterStatus === "overdue" ? "🔴" : "📊"}
          </div>
          <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            {searchQuery
              ? "No debts match your search"
              : filterStatus === "open"
              ? "No open debts"
              : filterStatus === "settled"
              ? "No settled debts yet"
              : filterStatus === "overdue"
              ? "No overdue debts"
              : filterRole === "all"
              ? "No debts yet"
              : `No ${filterRole} debts found`}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {searchQuery
              ? "Try a different search term"
              : filterStatus === "open"
              ? "Great! You're all caught up."
              : filterStatus === "settled"
              ? "Settled debts will appear here once you make payments."
              : "Add a debt using the form above to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedDebts.map((debt) => renderDebtCard(debt))}
        </div>
      )}

      {/* Details Popup (Updates or Repayments) */}
      {showPopup && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              {selectedDebt.name} - {selectedDebt.role === "institutional" ? "Updates" : "Repayments"}
            </h3>

            {/* Repayments (for personal debts) */}
            {repayments.length > 0 && (
              <ul className="space-y-4">
                {repayments.map((r) => (
                  <li key={r.id} className="p-4 rounded-lg shadow" style={{ background: "var(--bg-card-hover)" }}>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      <strong>Amount:</strong> {format(r.amount)}
                      <br />
                      {Number(r.adjustmentAmount) > 0 && (
                        <>
                          <strong>Adjustment:</strong> {format(r.adjustmentAmount)}
                          <br />
                        </>
                      )}
                      <strong>Date:</strong> {new Date(r.date).toLocaleDateString()}
                      <br />
                      {r.notes && (
                        <>
                          <strong>Notes:</strong> {r.notes}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* Updates (for institutional debts) */}
            {updates.length > 0 && (
              <ul className="space-y-4">
                {updates.map((u) => (
                  <li key={u.id} className="p-4 rounded-lg shadow" style={{ background: "var(--bg-card-hover)" }}>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      <strong>Status:</strong> {u.status}
                      <br />
                      <strong>Update Date:</strong> {u.updateDate}
                      <br />
                      {u.transaction && (
                        <>
                          <strong>Amount:</strong> {format(u.transaction.amount)}
                          <br />
                          <strong>Description:</strong> {u.transaction.description}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {repayments.length === 0 && updates.length === 0 && (
              <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                No {selectedDebt.role === "institutional" ? "updates" : "repayments"} yet.
              </p>
            )}

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

      {/* Repayment Modal */}
      <RepaymentModal
        open={showRepaymentModal}
        debt={activeDebt}
        onClose={() => setShowRepaymentModal(false)}
        onSuccess={() => {
          loadDebts();
          setShowRepaymentModal(false);
        }}
      />

      {/* Batch Settlement Modal */}
      <BatchSettlementModal
        open={showBatchSettlementModal}
        debts={debts.filter(d => selectedDebtsForBatch.has(d.id))}
        onClose={() => setShowBatchSettlementModal(false)}
        onSuccess={() => {
          loadDebts();
          setShowBatchSettlementModal(false);
          setSelectedDebtsForBatch(new Set());
          setBatchMode(false);
        }}
      />

      {/* Delete Confirmation */}
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
