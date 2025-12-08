"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  maxWidth?: string;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  maxWidth = "200px",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Adjust tooltip position if it goes off-screen
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let newPosition = position;

      // Check if tooltip goes off-screen and adjust
      if (position === "top" && tooltipRect.top < 0) {
        newPosition = "bottom";
      } else if (position === "bottom" && tooltipRect.bottom > viewport.height) {
        newPosition = "top";
      } else if (position === "left" && tooltipRect.left < 0) {
        newPosition = "right";
      } else if (position === "right" && tooltipRect.right > viewport.width) {
        newPosition = "left";
      }

      setAdjustedPosition(newPosition);
    }
  }, [isVisible, position]);

  const getPositionStyles = () => {
    switch (adjustedPosition) {
      case "top":
        return { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "8px" };
      case "bottom":
        return { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px" };
      case "left":
        return { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: "8px" };
      case "right":
        return { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: "8px" };
    }
  };

  const getArrowStyles = () => {
    const arrowSize = "6px";
    const baseStyle = {
      content: '""',
      position: "absolute" as const,
      width: 0,
      height: 0,
      borderStyle: "solid",
    };

    const borderColor = theme === "dark" ? "rgba(49, 46, 129, 0.95)" : "rgba(30, 41, 59, 0.95)";

    switch (adjustedPosition) {
      case "top":
        return {
          ...baseStyle,
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          borderWidth: `${arrowSize} ${arrowSize} 0 ${arrowSize}`,
          borderColor: `${borderColor} transparent transparent transparent`,
        };
      case "bottom":
        return {
          ...baseStyle,
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          borderWidth: `0 ${arrowSize} ${arrowSize} ${arrowSize}`,
          borderColor: `transparent transparent ${borderColor} transparent`,
        };
      case "left":
        return {
          ...baseStyle,
          left: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: `${arrowSize} 0 ${arrowSize} ${arrowSize}`,
          borderColor: `transparent transparent transparent ${borderColor}`,
        };
      case "right":
        return {
          ...baseStyle,
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: `${arrowSize} ${arrowSize} ${arrowSize} 0`,
          borderColor: `transparent ${borderColor} transparent transparent`,
        };
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      ref={triggerRef}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[200] px-3 py-2 rounded-lg text-xs font-medium shadow-lg pointer-events-none"
            style={{
              ...getPositionStyles(),
              maxWidth,
              backgroundColor: theme === "dark" ? "rgba(49, 46, 129, 0.95)" : "rgba(30, 41, 59, 0.95)",
              color: "#ffffff",
              backdropFilter: "blur(8px)",
            }}
            role="tooltip"
            aria-hidden={!isVisible}
          >
            {content}
            <div style={getArrowStyles()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component for consistent info icon with tooltip
export function InfoTooltip({ content, className = "" }: { content: string | ReactNode; className?: string }) {
  return (
    <Tooltip content={content}>
      <button
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs transition-colors ${className}`}
        style={{
          backgroundColor: "var(--bg-card)",
          color: "var(--text-muted)",
        }}
        aria-label="More information"
        type="button"
      >
        ℹ️
      </button>
    </Tooltip>
  );
}
