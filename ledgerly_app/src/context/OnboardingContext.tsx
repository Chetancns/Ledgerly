"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetPath?: string;
}

interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  isComplete: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = "ledgerly-onboarding-complete";
const ONBOARDING_START_DELAY = 1000; // 1 second delay before auto-starting

const defaultSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Ledgerly! 💰",
    description: "Your personal finance companion. Let's take a quick tour to help you get started.",
  },
  {
    id: "dashboard",
    title: "Dashboard Overview 📊",
    description: "Your financial snapshot at a glance. View your total balance, recent transactions, and spending trends.",
    targetPath: "/",
  },
  {
    id: "transactions",
    title: "Track Transactions ↔️",
    description: "Add transactions manually, scan receipts with AI, or record voice notes. Keep all your financial activity organized.",
    targetPath: "/transactions",
  },
  {
    id: "accounts",
    title: "Manage Accounts 💳",
    description: "Set up your bank accounts, credit cards, and cash to track your money across different sources.",
    targetPath: "/accounts",
  },
  {
    id: "budgets",
    title: "Create Budgets 💰",
    description: "Set spending limits for different categories and get notified when you're close to your limit.",
    targetPath: "/budgets",
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "You're ready to take control of your finances. Remember, you can always access Help from the menu.",
  },
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isComplete, setIsComplete] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem(STORAGE_KEY);
      setIsComplete(completed === "true");
      
      // Auto-start onboarding for new users
      if (!completed) {
        // Small delay to ensure the app is loaded
        setTimeout(() => {
          setIsOnboarding(true);
        }, ONBOARDING_START_DELAY);
      }
    }
  }, []);

  const startOnboarding = () => {
    setIsOnboarding(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < defaultSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setIsOnboarding(false);
    setIsComplete(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        currentStep,
        steps: defaultSteps,
        startOnboarding,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        isComplete,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
