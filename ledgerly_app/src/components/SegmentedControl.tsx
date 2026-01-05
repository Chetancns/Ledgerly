import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
  size = "md",
}: SegmentedControlProps) {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: "px-2 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-base",
  };

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const segmentWidth = 100 / options.length;

  return (
    <div
      className={`relative flex items-center gap-1 p-1 rounded-xl backdrop-blur-xl transition-all ${className}`}
      style={{
        background: theme === "dark" 
          ? "rgba(255, 255, 255, 0.05)" 
          : "rgba(0, 0, 0, 0.05)",
        border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
      }}
      role="tablist"
      aria-label="Segmented control"
    >
      {/* Animated sliding background */}
      <motion.div
        className="absolute rounded-lg shadow-lg z-0"
        style={{
          background: theme === "dark"
            ? "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))"
            : "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))",
          border: `1px solid ${theme === "dark" ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.3)"}`,
          top: "4px",
          bottom: "4px",
          width: `calc(${segmentWidth}% - 8px)`,
        }}
        animate={{
          left: `calc(${selectedIndex * segmentWidth}% + 4px)`,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      />

      {/* Options */}
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              relative z-10 flex-1 flex items-center justify-center gap-1
              ${sizeClasses[size]}
              font-semibold rounded-lg transition-all duration-200 min-w-0
              ${isSelected
                ? theme === "dark"
                  ? "text-white"
                  : "text-gray-900"
                : theme === "dark"
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-600 hover:text-gray-800"
              }
            `}
            role="tab"
            aria-selected={isSelected}
            aria-label={option.label}
          >
            {option.icon && <span className="text-base shrink-0">{option.icon}</span>}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
