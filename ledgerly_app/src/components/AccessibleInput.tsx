import { InputHTMLAttributes, forwardRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  showLabel?: boolean;
}

const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, error, hint, showLabel = true, id, required, ...props }, ref) => {
    const { theme } = useTheme();
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {showLabel && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
            {required && (
              <span className="ml-1" style={{ color: "var(--color-error)" }} aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {hint && (
          <p
            id={hintId}
            className="text-xs mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            {hint}
          </p>
        )}

        <motion.input
          ref={ref}
          id={inputId}
          aria-label={!showLabel ? label : undefined}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={
            [hint ? hintId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 min-h-[44px]"
          style={{
            backgroundColor: "var(--input-bg)",
            color: "var(--input-text)",
            borderColor: error ? "var(--color-error)" : "var(--input-border)",
          }}
          whileFocus={{ scale: 1.01 }}
          {...props}
        />

        {error && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs mt-1 flex items-center gap-1"
            style={{ color: "var(--color-error)" }}
            role="alert"
          >
            <span aria-hidden="true">⚠️</span>
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = "AccessibleInput";

export default AccessibleInput;
