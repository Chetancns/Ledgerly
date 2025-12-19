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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  useEffect(() => {
    if (open) {
      loadAccounts();
      // Auto-select first account if available
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [open]);

  useEffect(() => {
    // Auto-select first account when accounts load
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

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

  // Determine transaction type based on first debt's role
  const transactionType = debts.length > 0 && debts[0].role === "lent" ? "income" : "expense";
  const transactionLabel = transactionType === "income" ? "income" : "expense";

  const handleConfirm = async () => {
    if (debts.length === 0) {
      toast.error("No debts selected");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select an account to create a transaction and update the balance.");
      return;
    }

    try {
      setLoading(true);
      const currentDate = new Date().toISOString().split("T")[0];

      const result = await toast.promise(
        batchRepayment({
          debtIds: debts.map(d => d.id),
          amount: totalRemaining.toFixed(2),
          date: currentDate,
          accountId: selectedAccountId,
        }),
        {
          loading: "Settling debts...",
          success: `✅ ${debts.length} debt${debts.length > 1 ? 's' : ''} settled successfully!`,
          error: "Failed to settle debts",
        }
      );

      onSuccess();
      onClose();
      setSelectedAccountId(""); // Reset for next use
    } catch (err) {
      console.error("Batch settlement error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
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
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Settle Multiple Debts
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Selected Debts Summary */}
              <div 
                className="mb-6 p-4 rounded-lg"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                  You are about to settle:
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
                    Total:
                  </span>
                  <span className="text-lg font-bold" style={{ color: "var(--text-accent)" }}>
                    {format(totalRemaining)}
                  </span>
                </div>
              </div>

              {/* What Will Happen */}
              <div 
                className="mb-6 p-4 rounded-lg"
                style={{ background: "var(--bg-info)", border: "1px solid var(--border-info)" }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-info)" }}>
                  ℹ️ This will:
                </p>
                <ul className="text-sm space-y-1" style={{ color: "var(--text-info)" }}>
                  <li>• Create {transactionType === "income" ? "an income" : "an expense"} transaction for {format(totalRemaining)}</li>
                  <li>• Mark all {debts.length} debt{debts.length > 1 ? 's' : ''} as settled</li>
                  <li>• Update your account balance</li>
                </ul>
              </div>

              {/* Account Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Select Account to Update Balance *
                </label>
                {accounts.length > 0 ? (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-primary)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="">Choose an account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div 
                    className="p-3 rounded-lg text-sm"
                    style={{ background: "var(--bg-error)", border: "1px solid var(--border-error)", color: "var(--text-error)" }}
                  >
                    ⚠️ No accounts found. Please create an account first.
                  </div>
                )}
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  A transaction will be created to update this account's balance
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
                onClick={handleConfirm}
                variant="primary"
                theme="dark"
                fullWidth
                disabled={loading || !selectedAccountId}
              >
                {loading ? "Processing..." : "Confirm Settlement"}
              </ModernButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
