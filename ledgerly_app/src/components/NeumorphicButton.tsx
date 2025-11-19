import { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

// ------------------------------------------------------
// ModernButton — Full File (Copy/Paste Ready)
// Supports:
// • Unlimited colors
// • Variants: solid | outline | ghost
// • Sizes: sm | md | lg
// • Themes: light | dark
// • Optional Left/Right Icons
// ------------------------------------------------------

type Variant = "solid" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";
type Theme = "light" | "dark";

type ModernButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  color?: string; // any Tailwind color
  variant?: Variant;
  size?: Size;
  theme?: Theme;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
};

export default function ModernButton({
  children,
  onClick,
  type = "button",
  color = "indigo-600",
  variant = "solid",
  size = "md",
  theme = "light",
  disabled = false,
  leftIcon,
  rightIcon,
  className,
}: ModernButtonProps) {
  const baseColors = {
    solid: `bg-${color} text-white hover:bg-${color.replace("600", "700")}`,
    outline: `border border-${color} text-${color} hover:bg-${color}/10`,
    ghost: `text-${color} hover:bg-${color}/15`,
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-3 text-lg",
  };

  const themeClasses = {
    light: "shadow-[4px_4px_12px_#d1d5db,_-4px_-4px_12px_#ffffff]",
    dark: "shadow-[4px_4px_12px_#0b0b0b,_-4px_-4px_12px_#1e1e1e]",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center gap-2 rounded-xl font-medium transition-all select-none",
        sizeClasses[size],
        baseColors[variant],
        themeClasses[theme],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {leftIcon && <span className="text-xl flex items-center">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="text-xl flex items-center">{rightIcon}</span>}
    </motion.button>
  );
}

