"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModernButton from "./NeumorphicButton";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string; // Tailwind color like "red-500" or "green-400"
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "red-500",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-modal"
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
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {description && (
              <p className="text-white/80 mt-3 text-sm">{description}</p>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <ModernButton onClick={onClose} variant="ghost" color="gray-400" disabled={loading}>
                {cancelLabel}
              </ModernButton>
              <ModernButton onClick={onConfirm} color={confirmColor} disabled={loading}>
                {confirmLabel}
              </ModernButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
