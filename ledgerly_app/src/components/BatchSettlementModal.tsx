"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModernButton from "./NeumorphicButton";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { batchRepayment } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Debt } from "@/models/debt";
import toast from "react-hot-toast";
import NeumorphicInput from "./NeumorphicInput";
import NeumorphicSelect from "./NeumorphicSelect";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface BatchSettlementModalProps {
  open: boolean;
  debts: Debt[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchSettlementModal({
  open,
  debts,
  onClose,
  onSuccess,
}: BatchSettlementModalProps) {
  const { format } = useCurrencyFormatter();
  const [amount, setAmount] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAccounts();
      // Auto-calculate total remaining amount
      const total = debts.reduce((sum, debt) => {
        return sum + (debt.remaining ? Number(debt.remaining) : 0);
      }, 0);
      setAmount(total.toFixed(2));
    }
  }, [open, debts]);

  const loadAccounts = async () => {
    try {
      const res = await getUserAccount();
      setAccounts(res);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  };

  const totalRemaining = debts.reduce((sum, debt) => {
    return sum + (debt.remaining ? Number(debt.remaining) : 0);
  }, 0);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (debts.length === 0) {
      toast.error("No debts selected");
      return;
    }

    try {
      setLoading(true);
      const result = await toast.promise(
        batchRepayment({
          debtIds: debts.map(d => d.id),
          amount,
          adjustmentAmount: adjustmentAmount || undefined,
          date,
          notes,
          accountId: accountId || undefined,
        }),
        {
          loading: "Processing batch settlement...",
          success: (res) => `✅ ${debts.length} debts settled successfully!`,
          error: "Failed to process batch settlement",
        }
      );

      onSuccess();
      onClose();
      // Reset form
      setAmount("");
      setAdjustmentAmount("");
      setNotes("");
      setAccountId("");
    } catch (err) {
      console.error("Batch settlement error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && debts.length > 0 && (
        <motion.div
          key="batch-settlement-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
              maxHeight: "90vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Batch Settlement
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
              {/* Selected Debts Summary */}
              <div 
                className="mb-6 p-4 rounded-lg"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Selected Debts:
                </p>
                <div className="space-y-2">
                  {debts.map((debt) => (
                    <div key={debt.id} className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                        • {debt.name} {debt.counterpartyName && `- ${debt.counterpartyName}`}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {format(Number(debt.remaining || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <div 
                  className="mt-3 pt-3 border-t flex justify-between items-center"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Total Amount:
                  </span>
                  <span className="text-lg font-bold" style={{ color: "var(--text-accent)" }}>
                    {format(totalRemaining)}
                  </span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <NeumorphicInput
                  label="Payment Amount *"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  step="0.01"
                  theme="dark"
                />

                <NeumorphicInput
                  label="Adjustment Amount (optional)"
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Extra amount (tip, fees, etc.)"
                  step="0.01"
                  theme="dark"
                  helpText="Any additional amount (tip, fees, etc.)"
                />

                <NeumorphicInput
                  label="Date *"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  theme="dark"
                />

                <NeumorphicSelect
                  label="Account (optional)"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  theme="dark"
                  helpText="Select account to create a transaction"
                >
                  <option value="">No Account (Debt Only)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </NeumorphicSelect>

                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      background: "var(--input-bg)",
                      color: "var(--input-text)",
                      border: "1px solid var(--input-border)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex gap-3 p-6 border-t"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <ModernButton onClick={onClose} variant="secondary" theme="dark" fullWidth>
                Cancel
              </ModernButton>
              <ModernButton
                onClick={handleSubmit}
                variant="primary"
                theme="dark"
                fullWidth
                disabled={loading}
              >
                {loading ? "Processing..." : `Settle ${debts.length} Debt${debts.length > 1 ? 's' : ''}`}
              </ModernButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
