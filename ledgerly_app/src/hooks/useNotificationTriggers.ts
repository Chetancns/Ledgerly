import { useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { getBudgets } from "@/services/budget";
import { getUserDebts } from "@/services/debts";
import { getRecurringTransactions } from "@/services/recurring";

// Check interval: every 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Track what we've already notified about in this session
const NOTIFIED_BUDGETS_KEY = "ledgerly-notified-budgets";
const NOTIFIED_DEBTS_KEY = "ledgerly-notified-debts";
const NOTIFIED_RECURRING_KEY = "ledgerly-notified-recurring";

/**
 * Hook to check for budget limits, debt reminders, and recurring payments
 * and trigger notifications when appropriate.
 * 
 * Now uses local notifications only (not persisted to backend) to avoid
 * duplicates with auto-posted transaction notifications from backend.
 */
export function useNotificationTriggers() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Load what we've already notified about
    const getNotifiedSet = (key: string): Set<string> => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            return new Set(JSON.parse(stored));
          } catch (e) {
            return new Set();
          }
        }
      }
      return new Set();
    };

    const saveNotifiedSet = (key: string, set: Set<string>) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
      }
    };

    const notifiedBudgets = getNotifiedSet(NOTIFIED_BUDGETS_KEY);
    const notifiedDebts = getNotifiedSet(NOTIFIED_DEBTS_KEY);
    const notifiedRecurring = getNotifiedSet(NOTIFIED_RECURRING_KEY);

    const checkBudgetLimits = async () => {
      try {
        // Get current month budgets
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        
        const budgets = await getBudgets(startDate, endDate, "monthly");

        if (Array.isArray(budgets)) {
          budgets.forEach((budget: any) => {
            const spent = budget.spent || 0;
            const limit = budget.amount || 0;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            const budgetKey = `${budget.id}-${now.getMonth()}-${now.getFullYear()}`;

            // Notify at 90% and 100% of budget (only once per budget per month)
            if (percentage >= 100 && !notifiedBudgets.has(`${budgetKey}-100`)) {
              addNotification({
                type: "budget_limit",
                title: "Budget Exceeded! 🚨",
                message: `Your ${budget.category?.name || "budget"} budget has been exceeded. Spent: $${spent.toFixed(2)} / $${limit.toFixed(2)}`,
                actionUrl: "/budgets",
              });
              notifiedBudgets.add(`${budgetKey}-100`);
              saveNotifiedSet(NOTIFIED_BUDGETS_KEY, notifiedBudgets);
            } else if (percentage >= 90 && percentage < 100 && !notifiedBudgets.has(`${budgetKey}-90`)) {
              addNotification({
                type: "warning",
                title: "Budget Warning ⚠️",
                message: `You've used ${percentage.toFixed(0)}% of your ${budget.category?.name || "budget"} budget. Spent: $${spent.toFixed(2)} / $${limit.toFixed(2)}`,
                actionUrl: "/budgets",
              });
              notifiedBudgets.add(`${budgetKey}-90`);
              saveNotifiedSet(NOTIFIED_BUDGETS_KEY, notifiedBudgets);
            }
          });
        }
      } catch (error) {
        console.error("Error checking budget limits:", error);
      }
    };

    const checkDebtReminders = async () => {
      try {
        const debts = await getUserDebts();

        if (Array.isArray(debts)) {
          debts.forEach((debt: any) => {
            // Check if debt is not paid off and has a due date
            if (debt.status !== "Paid Off" && debt.dueDate) {
              const dueDate = new Date(debt.dueDate);
              const today = new Date();
              const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const debtKey = `${debt.id}-${dueDate.toISOString().split('T')[0]}`;

              // Notify 7 days before due date (only once per debt due date)
              if (daysUntilDue <= 7 && daysUntilDue > 0 && !notifiedDebts.has(`${debtKey}-7`)) {
                addNotification({
                  type: "debt_reminder",
                  title: "Debt Payment Reminder ⚖️",
                  message: `${debt.name} payment is due in ${daysUntilDue} days. Amount: $${debt.amount?.toFixed(2) || 0}`,
                  actionUrl: "/debts",
                });
                notifiedDebts.add(`${debtKey}-7`);
                saveNotifiedSet(NOTIFIED_DEBTS_KEY, notifiedDebts);
              } else if (daysUntilDue <= 0 && daysUntilDue > -1 && !notifiedDebts.has(`${debtKey}-0`)) {
                addNotification({
                  type: "debt_reminder",
                  title: "Debt Payment Due Today! 🚨",
                  message: `${debt.name} payment is due today. Amount: $${debt.amount?.toFixed(2) || 0}`,
                  actionUrl: "/debts",
                });
                notifiedDebts.add(`${debtKey}-0`);
                saveNotifiedSet(NOTIFIED_DEBTS_KEY, notifiedDebts);
              }
            }
          });
        }
      } catch (error) {
        console.error("Error checking debt reminders:", error);
      }
    };

    const checkRecurringPayments = async () => {
      try {
        const recurring = await getRecurringTransactions();

        if (Array.isArray(recurring)) {
          recurring.forEach((transaction: any) => {
            if (transaction.isActive && transaction.nextDate) {
              const nextDate = new Date(transaction.nextDate);
              const today = new Date();
              const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const recurringKey = `${transaction.id}-${nextDate.toISOString().split('T')[0]}`;

              // Notify 2 days before next occurrence (only once per occurrence)
              if (daysUntilNext <= 2 && daysUntilNext > 0 && !notifiedRecurring.has(`${recurringKey}-2`)) {
                addNotification({
                  type: "recurring_payment",
                  title: "Upcoming Recurring Payment 🔁",
                  message: `${transaction.description} is scheduled for ${nextDate.toLocaleDateString()}. Amount: $${transaction.amount?.toFixed(2) || 0}`,
                  actionUrl: "/recurring",
                });
                notifiedRecurring.add(`${recurringKey}-2`);
                saveNotifiedSet(NOTIFIED_RECURRING_KEY, notifiedRecurring);
              } else if (daysUntilNext === 0 && !notifiedRecurring.has(`${recurringKey}-0`)) {
                addNotification({
                  type: "recurring_payment",
                  title: "Recurring Payment Today! 🔁",
                  message: `${transaction.description} is scheduled today. Amount: $${transaction.amount?.toFixed(2) || 0}`,
                  actionUrl: "/recurring",
                });
                notifiedRecurring.add(`${recurringKey}-0`);
                saveNotifiedSet(NOTIFIED_RECURRING_KEY, notifiedRecurring);
              }
            }
          });
        }
      } catch (error) {
        console.error("Error checking recurring payments:", error);
      }
    };

    // Run checks on mount and periodically
    const runChecks = () => {
      checkBudgetLimits();
      checkDebtReminders();
      checkRecurringPayments();
    };

    // Run immediately
    runChecks();

    // Run every 5 minutes
    const interval = setInterval(runChecks, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [addNotification]);
}
