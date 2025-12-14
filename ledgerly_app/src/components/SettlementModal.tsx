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

interface SettlementModalProps {
  open: boolean;
  settlementGroupId?: string;
  counterpartyName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SettlementModal({
  open,
  settlementGroupId,
  counterpartyName,
  onClose,
  onSuccess,
}: SettlementModalProps) {
  const { format } = useCurrencyFormatter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState(settlementGroupId || "");
  const [theme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, settlementGroupId, counterpartyName]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await listReimbursables({
        settlementGroupId: settlementGroupId || groupId,
        counterpartyName,
      });
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to load reimbursable transactions", err);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPending = () => {
    return transactions.reduce((sum, tx) => {
      const txAmount = Number(tx.amount);
      const reimbursed = Number(tx.reimbursedAmount || 0);
      return sum + (txAmount - reimbursed);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!groupId) {
      toast.error("Please enter a settlement group ID");
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
          settlementGroupId: groupId,
          amount,
          date,
          notes,
        }),
        {
          loading: "Creating settlement...",
          success: "✅ Settlement created successfully!",
          error: "Failed to create settlement",
        }
      );

      onSuccess();
      onClose();
      // Reset form
      setAmount("");
      setNotes("");
      setGroupId("");
    } catch (err) {
      console.error("Settlement error:", err);
    }
  };

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
            className="w-full max-w-2xl bg-white/6 backdrop-blur-lg rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">💰 Create Settlement</h3>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Settlement Group ID */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Settlement Group ID *
                </label>
                <NeumorphicInput
                  type="text"
                  placeholder="e.g., weekend-trip, dinner-dec"
                  value={groupId}
                  onChange={(val) => setGroupId(val)}
                  theme={theme}
                />
                {groupId && (
                  <button
                    type="button"
                    onClick={loadTransactions}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    🔄 Refresh transactions
                  </button>
                )}
              </div>

              {/* Show reimbursable transactions */}
              {transactions.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-sm font-medium text-white/80 mb-3">
                    Reimbursable Transactions ({transactions.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {transactions.map((tx) => {
                      const pending = Number(tx.amount) - Number(tx.reimbursedAmount || 0);
                      return (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center text-sm bg-white/5 rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <div className="text-white font-medium">
                              {tx.description || "No description"}
                            </div>
                            <div className="text-white/60 text-xs">
                              {tx.counterpartyName} • {new Date(tx.transactionDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{format(tx.amount)}</div>
                            <div className="text-white/60 text-xs">
                              Pending: {format(pending)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-white font-semibold">
                    <span>Total Pending:</span>
                    <span>{format(calculateTotalPending())}</span>
                  </div>
                </div>
              )}

              {/* Settlement Amount */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Settlement Amount *
                </label>
                <NeumorphicInput
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  theme={theme}
                />
                <div className="text-xs text-white/60 mt-1">
                  Will be distributed proportionally across transactions
                </div>
              </div>

              {/* Settlement Date */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
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
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Paid via Venmo, Cash reimbursement..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                disabled={loading || !groupId || !amount}
              >
                Create Settlement
              </ModernButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
