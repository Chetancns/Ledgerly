import { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

// ------------------------------------------------------
// ModernButton — Full File (Copy/Paste Ready)
// Supports:
// • Unlimited colors with gradient support
// • Variants: solid | outline | ghost | glass
// • Sizes: sm | md | lg | xl
// • Auto theme detection (light/dark)
// • Optional Left/Right Icons
// • Loading state support
// • Modern glassmorphic effects
// • Smooth animations & hover states
// ------------------------------------------------------

type Variant = "solid" | "outline" | "ghost" | "glass";
type Size = "sm" | "md" | "lg" | "xl";

type ModernButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  color?: string; // any Tailwind color (e.g., "indigo-600", "blue-500")
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  fullWidth?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

const colorMap = {
  "indigo-600": { light: "#4f46e5", dark: "#6366f1", gradient: "from-indigo-500 to-indigo-600" },
  "blue-600": { light: "#2563eb", dark: "#3b82f6", gradient: "from-blue-500 to-blue-600" },
  "green-600": { light: "#16a34a", dark: "#22c55e", gradient: "from-green-500 to-green-600" },
  "emerald-600": { light: "#059669", dark: "#10b981", gradient: "from-emerald-500 to-emerald-600" },
  "red-600": { light: "#dc2626", dark: "#ef4444", gradient: "from-red-500 to-red-600" },
  "pink-600": { light: "#db2777", dark: "#ec4899", gradient: "from-pink-500 to-pink-600" },
  "purple-600": { light: "#9333ea", dark: "#a855f7", gradient: "from-purple-500 to-purple-600" },
  "orange-600": { light: "#ea580c", dark: "#f97316", gradient: "from-orange-500 to-orange-600" },
  "cyan-600": { light: "#0891b2", dark: "#06b6d4", gradient: "from-cyan-500 to-cyan-600" },
  "teal-600": { light: "#0d9488", dark: "#14b8a6", gradient: "from-teal-500 to-teal-600" },
};

const roundedMap = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  full: "rounded-full",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-base gap-2",
  lg: "px-6 py-3 text-lg gap-2.5",
  xl: "px-8 py-4 text-lg gap-3",
};

export default function ModernButton({
  children,
  onClick,
  type = "button",
  color = "indigo-600",
  variant = "solid",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  fullWidth = false,
  rounded = "md",
}: ModernButtonProps) {
  const { theme } = useTheme();
  const colorConfig = (colorMap as any)[color] || colorMap["indigo-600"];
  const themeColor = theme === "dark" ? colorConfig.dark : colorConfig.light;
  
  const variantClasses = {
    solid: `bg-gradient-to-br ${colorConfig.gradient} text-white hover:shadow-lg hover:shadow-[${themeColor}]/40 active:shadow-md`,
    outline: `border-2 border-current text-[${themeColor}] hover:bg-[${themeColor}]/10 active:bg-[${themeColor}]/20`,
    ghost: `text-[${themeColor}] hover:bg-[${themeColor}]/10 active:bg-[${themeColor}]/20`,
    glass: `bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/20 text-white hover:from-white/20 hover:to-white/10 hover:border-white/30`,
  };

  const baseClasses = clsx(
    "flex items-center justify-center font-semibold transition-all duration-200 select-none",
    "relative overflow-hidden group",
    sizeClasses[size],
    roundedMap[rounded],
    fullWidth && "w-full",
    disabled || loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
    variant === "glass" ? variantClasses.glass : variantClasses[variant as keyof typeof variantClasses],
    className
  );

  // Inline styles for dynamic colors (Tailwind limitation workaround)
  const dynamicStyles = {
    outline: {
      color: themeColor,
      borderColor: themeColor,
    },
    ghost: {
      color: themeColor,
    },
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98, y: 0 } : {}}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={baseClasses}
      style={variant !== "solid" && variant !== "glass" ? dynamicStyles[variant as keyof typeof dynamicStyles] : {}}
    >
      {/* Background glow effect for solid buttons */}
      {variant === "solid" && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, ${colorConfig.light}, transparent)`,
          }}
        />
      )}

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, white, transparent)`,
          transform: "translateX(-100%)",
          animation: "shimmer 2s infinite",
        }}
      />

      {/* Content wrapper */}
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            {/* Loading spinner icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>
        ) : (
          <>
            {leftIcon && (
              <motion.span
                className="flex items-center justify-center text-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {leftIcon}
              </motion.span>
            )}
            {children}
            {rightIcon && (
              <motion.span
                className="flex items-center justify-center text-lg"
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {rightIcon}
              </motion.span>
            )}
          </>
        )}
      </span>

      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </motion.button>
  );
}

