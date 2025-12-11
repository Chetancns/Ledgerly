import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

type NeumorphicInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "email" | "number" | "date" | "datetime-local" | "month" | "week" | "time" | "tel" | "url" | "search";
  disabled?: boolean;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  maxLength?: number;
  readOnly?: boolean;
  "aria-label"?: string;
};

export default function NeumorphicInput({
  value,
  onChange,
  placeholder = "",
  type = "text",
  disabled = false,
  required = false,
  min,
  max,
  step,
  maxLength,
  readOnly = false,
  "aria-label": ariaLabel,
}: NeumorphicInputProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const inputBg = isDark
    ? "bg-slate-800/80 backdrop-blur-lg border-slate-700/60"
    : "bg-slate-50/95 backdrop-blur-lg border-slate-300/80";

  const inputText = isDark ? "text-white" : "text-slate-900";
  const placeholderColor = isDark ? "placeholder:text-slate-400" : "placeholder:text-slate-500";

  const focusStyle = isDark
    ? "focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 focus:shadow-lg focus:shadow-blue-500/20"
    : "focus:border-blue-400/80 focus:ring-1 focus:ring-blue-400/50 focus:shadow-lg focus:shadow-blue-400/20";

  const disabledStyle = disabled
    ? isDark
      ? "bg-slate-700/40 text-slate-400 cursor-not-allowed"
      : "bg-slate-200/50 text-slate-400 cursor-not-allowed"
    : "";

  return (
    <motion.div
      initial={false}
      className="w-full"
    >
      <motion.input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        aria-label={ariaLabel}
        className={`
          w-full px-4 py-3 rounded-xl outline-none border-2 font-medium
          transition-all duration-200
          ${inputBg} ${inputText} ${placeholderColor} ${focusStyle} ${disabledStyle}
          shadow-md
        `}
        whileFocus={{ scale: 1.01 }}
      />
    </motion.div>
  );
}
