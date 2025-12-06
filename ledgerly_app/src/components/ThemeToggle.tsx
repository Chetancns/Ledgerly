"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center gap-2 p-2 rounded-lg
        transition-all duration-300 ease-in-out
        hover:bg-[var(--bg-card-hover)]
        focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]
        min-h-[44px] min-w-[44px]
        ${className}
      `}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div
        className="relative w-14 h-8 rounded-full p-1 transition-colors duration-300"
        style={{
          backgroundColor: isDark ? "rgba(139, 92, 246, 0.3)" : "rgba(251, 191, 36, 0.3)",
          border: `2px solid ${isDark ? "rgba(139, 92, 246, 0.5)" : "rgba(251, 191, 36, 0.5)"}`,
        }}
      >
        {/* Sun icon */}
        <motion.div
          className="absolute left-1.5 top-1/2 -translate-y-1/2"
          animate={{
            opacity: isDark ? 0.3 : 1,
            scale: isDark ? 0.8 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="w-4 h-4 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>

        {/* Moon icon */}
        <motion.div
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          animate={{
            opacity: isDark ? 1 : 0.3,
            scale: isDark ? 1 : 0.8,
          }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="w-4 h-4 text-purple-300"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </motion.div>

        {/* Toggle circle */}
        <motion.div
          className="w-5 h-5 rounded-full shadow-md"
          style={{
            backgroundColor: isDark ? "#8b5cf6" : "#fbbf24",
          }}
          animate={{
            x: isDark ? 22 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      </div>

      {showLabel && (
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}
