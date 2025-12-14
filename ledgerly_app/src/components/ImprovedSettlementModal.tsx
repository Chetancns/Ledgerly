"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModernButton from "./NeumorphicButton";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { createSettlement, listReimbursables } from "@/services/transactions";
import { Transaction } from "@/models/Transaction";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import toast from "react-hot-toast";
import NeumorphicInput from "./NeumorphicInput";
import NeumorphicSelect from "./NeumorphicSelect";

interface SettlementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImprovedSettlementModal({
  open,
  onClose,
  onSuccess,
}: SettlementModalProps) {
  const { format } = useCurrencyFormatter();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [theme] = useState<"dark" | "light">("dark");
  
  // Filter states
  const [selectedCounterparty, setSelectedCounterparty] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  
  // Dropdown options
  const [counterpartyOptions, setCounterpartyOptions] = useState<string[]>([]);
  const [groupIdOptions, setGroupIdOptions] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadAllReimbursables();
    }
  }, [open]);

  useEffect(() => {
    filterTransactions();
  }, [selectedCounterparty, selectedGroupId, allTransactions]);

  const loadAllReimbursables = async () => {
    try {
      setLoading(true);
      const res = await listReimbursables({});
      const txs = res.data || [];
      setAllTransactions(txs);
      
      // Extract unique counterparties and settlement groups
      const counterparties = new Set<string>();
      const groups = new Set<string>();
      
      txs.forEach((tx: Transaction) => {
        if (tx.counterpartyName) counterparties.add(tx.counterpartyName);
        if (tx.settlementGroupId) groups.add(tx.settlementGroupId);
      });
      
      setCounterpartyOptions(Array.from(counterparties).sort());
      setGroupIdOptions(Array.from(groups).sort());
    } catch (err) {
      console.error("Failed to load reimbursable transactions", err);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = allTransactions;
    
    if (selectedCounterparty) {
      filtered = filtered.filter(tx => tx.counterpartyName === selectedCounterparty);
    }
    
    if (selectedGroupId) {
      filtered = filtered.filter(tx => tx.settlementGroupId === selectedGroupId);
    }
    
    setFilteredTransactions(filtered);
  };

  const calculateTotalPending = () => {
    return filteredTransactions.reduce((sum, tx) => {
      const txAmount = Number(tx.amount);
      const reimbursed = Number(tx.reimbursedAmount || 0);
      return sum + (txAmount - reimbursed);
    }, 0);
  };

  const groupTransactionsByGroup = () => {
    const grouped = new Map<string, Transaction[]>();
    
    filteredTransactions.forEach(tx => {
      const key = tx.settlementGroupId || "No Group";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(tx);
    });
    
    return grouped;
  };

  const handleSubmit = async () => {
    if (!selectedGroupId) {
      toast.error("Please select a settlement group");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalPending = calculateTotalPending();
    if (Number(amount) > totalPending) {
      toast.error(`Amount exceeds total pending (${format(totalPending)})`);
      return;
    }

    try {
      await toast.promise(
        createSettlement({
          settlementGroupId: selectedGroupId,
          amount,
          date,
          notes,
        }),
        {
          loading: "Recording settlement...",
          success: "✅ Settlement recorded successfully!",
          error: "Failed to record settlement",
        }
      );

      onSuccess();
      onClose();
      // Reset form
      setAmount("");
      setNotes("");
      setSelectedCounterparty("");
      setSelectedGroupId("");
    } catch (err) {
      console.error("Settlement error:", err);
    }
  };

  const groupedTransactions = groupTransactionsByGroup();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settlement-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-3xl bg-white/6 backdrop-blur-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">💰 Record Settlement</h3>
                <p className="text-sm text-white/60 mt-1">
                  Record when someone pays you back for reimbursable expenses
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Filter Section */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-medium text-white/80 mb-3">Filter Transactions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Counterparty Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Who paid you back?
                    </label>
                    <NeumorphicSelect
                      options={[
                        { value: "", label: "All people" },
                        ...counterpartyOptions.map(name => ({
                          value: name,
                          label: name
                        }))
                      ]}
                      value={selectedCounterparty}
                      onChange={(val) => setSelectedCounterparty(val)}
                      placeholder="Select person"
                      theme={theme}
                    />
                  </div>

                  {/* Settlement Group Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Settlement Group
                    </label>
                    <NeumorphicSelect
                      options={[
                        { value: "", label: "All groups" },
                        ...groupIdOptions.map(group => ({
                          value: group,
                          label: group
                        }))
                      ]}
                      value={selectedGroupId}
                      onChange={(val) => setSelectedGroupId(val)}
                      placeholder="Select group"
                      theme={theme}
                    />
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              {filteredTransactions.length > 0 ? (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-sm font-medium text-white/80 mb-3">
                    Pending Reimbursements ({filteredTransactions.length})
                  </h4>
                  
                  {/* Grouped Display */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Array.from(groupedTransactions.entries()).map(([groupKey, txs]) => {
                      const groupTotal = txs.reduce((sum, tx) => {
                        const pending = Number(tx.amount) - Number(tx.reimbursedAmount || 0);
                        return sum + pending;
                      }, 0);
                      
                      return (
                        <div key={groupKey} className="bg-white/5 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium text-white">
                              {groupKey === "No Group" ? "🔹 Ungrouped" : `📁 ${groupKey}`}
                            </div>
                            <div className="text-white font-semibold">
                              {format(groupTotal)} pending
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {txs.map((tx) => {
                              const pending = Number(tx.amount) - Number(tx.reimbursedAmount || 0);
                              return (
                                <div
                                  key={tx.id}
                                  className="flex justify-between items-start text-sm bg-white/5 rounded p-2"
                                >
                                  <div className="flex-1">
                                    <div className="text-white">
                                      {tx.description || "No description"}
                                    </div>
                                    <div className="text-white/60 text-xs mt-1">
                                      {tx.counterpartyName} • {new Date(tx.transactionDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="text-right ml-3">
                                    <div className="text-white font-medium">{format(tx.amount)}</div>
                                    <div className="text-white/60 text-xs">
                                      Pending: {format(pending)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-white font-semibold text-lg">
                    <span>Total Pending:</span>
                    <span>{format(calculateTotalPending())}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center">
                  <p className="text-white/60">
                    {selectedCounterparty || selectedGroupId
                      ? "No reimbursable transactions found for selected filters"
                      : "No reimbursable transactions found. Mark transactions as reimbursable first."}
                  </p>
                </div>
              )}

              {/* Settlement Details */}
              {filteredTransactions.length > 0 && (
                <>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-sm font-medium text-white/80 mb-3">Settlement Details</h4>
                    
                    <div className="space-y-3">
                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Amount Received *
                        </label>
                        <NeumorphicInput
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(val) => setAmount(val)}
                          theme={theme}
                        />
                        <div className="text-xs text-white/60 mt-1">
                          Will be distributed proportionally across selected transactions
                        </div>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Settlement Date *
                        </label>
                        <NeumorphicInput
                          type="date"
                          value={date}
                          onChange={(val) => setDate(val)}
                          theme={theme}
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Notes (optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g., Paid via Venmo, Cash reimbursement..."
                          rows={2}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <ModernButton
                onClick={onClose}
                variant="ghost"
                color="gray-400"
                disabled={loading}
              >
                Cancel
              </ModernButton>
              <ModernButton
                onClick={handleSubmit}
                color="green-500"
                disabled={loading || !selectedGroupId || !amount || filteredTransactions.length === 0}
              >
                Record Settlement
              </ModernButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
