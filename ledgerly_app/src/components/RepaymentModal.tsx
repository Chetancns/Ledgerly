"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModernButton from "./NeumorphicButton";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { addRepayment } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { Debt } from "@/models/debt";
import toast from "react-hot-toast";
import NeumorphicInput from "./NeumorphicInput";
import NeumorphicSelect from "./NeumorphicSelect";

interface RepaymentModalProps {
  open: boolean;
  debt: Debt | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RepaymentModal({
  open,
  debt,
  onClose,
  onSuccess,
}: RepaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [theme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (open) {
      loadAccounts();
    }
  }, [open]);

  const loadAccounts = async () => {
    try {
      const res = await getUserAccount();
      setAccounts(res);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  };

  const handleSubmit = async () => {
    if (!debt) return;

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      await toast.promise(
        addRepayment(debt.id, {
          amount,
          adjustmentAmount: adjustmentAmount || undefined,
          date,
          notes,
          accountId: accountId || undefined,
        }),
        {
          loading: "Recording repayment...",
          success: "✅ Repayment recorded successfully!",
          error: "Failed to record repayment",
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
      console.error("Repayment error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  const remaining = debt.remaining ? Number(debt.remaining) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="repayment-modal"
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
            className="w-full max-w-md bg-white/6 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">💵 Add Repayment</h3>
                <p className="text-sm text-white/60 mt-1">{debt.name}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Debt Info */}
            <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-white/60">Principal</div>
                  <div className="text-white font-medium">${debt.principal}</div>
                </div>
                <div>
                  <div className="text-white/60">Remaining</div>
                  <div className="text-white font-medium">
                    ${remaining.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-white/60">Counterparty</div>
                  <div className="text-white font-medium">{debt.counterpartyName || "N/A"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Repayment Amount *
                </label>
                <NeumorphicInput
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  theme={theme}
                />
                <div className="text-xs text-white/60 mt-1">
                  Principal payment amount
                </div>
              </div>

              {/* Account Selector */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Account (optional)
                </label>
                <NeumorphicSelect
                  options={[
                    { value: "", label: "No transaction" },
                    ...accounts.map(acc => ({
                      value: acc.id,
                      label: `${acc.name} (${acc.type})`
                    }))
                  ]}
                  value={accountId}
                  onChange={(val) => setAccountId(val)}
                  placeholder="Select account"
                  theme={theme}
                />
                <div className="text-xs text-white/60 mt-1">
                  Select an account to automatically create a transaction
                </div>
              </div>

              {/* Adjustment Amount */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Adjustment Amount (optional)
                </label>
                <NeumorphicInput
                  type="number"
                  placeholder="0.00"
                  value={adjustmentAmount}
                  onChange={(val) => setAdjustmentAmount(val)}
                  theme={theme}
                />
                <div className="text-xs text-white/60 mt-1">
                  Extra amount (tip, interest, etc.) - adds to total owed
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Repayment Date *
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
                  placeholder="e.g., Partial payment via cash..."
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
                disabled={loading || !amount}
              >
                Record Repayment
              </ModernButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
