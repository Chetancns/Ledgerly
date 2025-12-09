"use client";

import React, { useEffect } from "react";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";

export default function OnboardingModal() {
  const { isOnboarding, currentStep, steps, nextStep, previousStep, skipOnboarding } = useOnboarding();
  const { theme } = useTheme();
  const router = useRouter();

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Navigate to target path when step changes
  useEffect(() => {
    if (isOnboarding && currentStepData?.targetPath && currentStepData.targetPath !== router.pathname) {
      router.push(currentStepData.targetPath);
    }
  }, [currentStep, currentStepData, isOnboarding, router]);

  if (!isOnboarding) {
    return null;
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="backdrop-blur-xl rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl"
          style={{
            background:
              theme === "dark"
                ? "linear-gradient(to bottom right, rgba(49, 46, 129, 0.95), rgba(88, 28, 135, 0.95))"
                : "linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.95))",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Progress Bar */}
          <div className="mb-6">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--bg-card)" }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "var(--accent-primary)" }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <motion.h2
              key={currentStepData.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
              id="onboarding-title"
            >
              {currentStepData.title}
            </motion.h2>
            <motion.p
              key={`${currentStepData.id}-desc`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {currentStepData.description}
            </motion.p>
          </div>

          {/* Illustration/Icon */}
          <div className="flex justify-center mb-8">
            <motion.div
              key={currentStepData.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-7xl md:text-8xl"
              aria-hidden="true"
            >
              {getStepIcon(currentStepData.id)}
            </motion.div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <button
              onClick={skipOnboarding}
              className="order-2 sm:order-1 text-sm px-4 py-2 rounded-lg transition min-h-[44px]"
              style={{
                color: "var(--text-muted)",
                backgroundColor: "transparent",
              }}
              aria-label="Skip onboarding tour"
            >
              Skip Tour
            </button>

            <div className="flex gap-3 order-1 sm:order-2 w-full sm:w-auto">
              {!isFirstStep && (
                <button
                  onClick={previousStep}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all min-h-[44px]"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-primary)",
                  }}
                  aria-label="Go to previous step"
                >
                  ← Previous
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all min-h-[44px]"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: theme === "dark" ? "var(--text-inverse)" : "var(--text-inverse)",
                }}
                aria-label={isLastStep ? "Complete onboarding" : "Go to next step"}
              >
                {isLastStep ? "Get Started! 🚀" : "Next →"}
              </button>
            </div>
          </div>

          {/* Keyboard Hints */}
          <div
            className="text-center text-xs mt-4"
            style={{ color: "var(--text-muted)" }}
            role="note"
          >
            <kbd className="px-2 py-1 rounded" style={{ backgroundColor: "var(--bg-card)" }}>
              ESC
            </kbd>{" "}
            to skip •{" "}
            <kbd className="px-2 py-1 rounded" style={{ backgroundColor: "var(--bg-card)" }}>
              →
            </kbd>{" "}
            next •{" "}
            <kbd className="px-2 py-1 rounded" style={{ backgroundColor: "var(--bg-card)" }}>
              ←
            </kbd>{" "}
            previous
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function getStepIcon(stepId: string): string {
  const icons: { [key: string]: string } = {
    welcome: "👋",
    dashboard: "📊",
    transactions: "↔️",
    accounts: "💳",
    budgets: "💰",
    complete: "🎉",
  };
  return icons[stepId] || "ℹ️";
}

// Keyboard navigation hook
export function useOnboardingKeyboard() {
  const { isOnboarding, nextStep, previousStep, skipOnboarding } = useOnboarding();

  useEffect(() => {
    if (!isOnboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          skipOnboarding();
          break;
        case "ArrowRight":
          nextStep();
          break;
        case "ArrowLeft":
          previousStep();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOnboarding, nextStep, previousStep, skipOnboarding]);
}
