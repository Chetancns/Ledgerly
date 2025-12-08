import { useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { getBudgets } from "@/services/budget";
import { getDebts } from "@/services/debts";
import { getRecurringTransactions } from "@/services/recurring";

/**
 * Hook to check for budget limits, debt reminders, and recurring payments
 * and trigger notifications when appropriate
 */
export function useNotificationTriggers() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const checkBudgetLimits = async () => {
      try {
        const response = await getBudgets();
        const budgets = response.data;

        if (Array.isArray(budgets)) {
          budgets.forEach((budget: any) => {
            const spent = budget.spent || 0;
            const limit = budget.amount || 0;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;

            // Notify at 90% and 100% of budget
            if (percentage >= 100) {
              addNotification({
                type: "budget_limit",
                title: "Budget Exceeded! 🚨",
                message: `Your ${budget.category?.name || "budget"} budget has been exceeded. Spent: $${spent.toFixed(2)} / $${limit.toFixed(2)}`,
                actionUrl: "/budgets",
              });
            } else if (percentage >= 90) {
              addNotification({
                type: "warning",
                title: "Budget Warning ⚠️",
                message: `You've used ${percentage.toFixed(0)}% of your ${budget.category?.name || "budget"} budget. Spent: $${spent.toFixed(2)} / $${limit.toFixed(2)}`,
                actionUrl: "/budgets",
              });
            }
          });
        }
      } catch (error) {
        console.error("Error checking budget limits:", error);
      }
    };

    const checkDebtReminders = async () => {
      try {
        const response = await getDebts();
        const debts = response.data;

        if (Array.isArray(debts)) {
          debts.forEach((debt: any) => {
            // Check if debt is not paid off and has a due date
            if (debt.status !== "Paid Off" && debt.dueDate) {
              const dueDate = new Date(debt.dueDate);
              const today = new Date();
              const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              // Notify 7 days before due date
              if (daysUntilDue <= 7 && daysUntilDue > 0) {
                addNotification({
                  type: "debt_reminder",
                  title: "Debt Payment Reminder ⚖️",
                  message: `${debt.name} payment is due in ${daysUntilDue} days. Amount: $${debt.amount?.toFixed(2) || 0}`,
                  actionUrl: "/debts",
                });
              } else if (daysUntilDue <= 0 && daysUntilDue > -1) {
                addNotification({
                  type: "debt_reminder",
                  title: "Debt Payment Due Today! 🚨",
                  message: `${debt.name} payment is due today. Amount: $${debt.amount?.toFixed(2) || 0}`,
                  actionUrl: "/debts",
                });
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
        const response = await getRecurringTransactions();
        const recurring = response.data;

        if (Array.isArray(recurring)) {
          recurring.forEach((transaction: any) => {
            if (transaction.isActive && transaction.nextDate) {
              const nextDate = new Date(transaction.nextDate);
              const today = new Date();
              const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              // Notify 2 days before next occurrence
              if (daysUntilNext <= 2 && daysUntilNext > 0) {
                addNotification({
                  type: "recurring_payment",
                  title: "Upcoming Recurring Payment 🔁",
                  message: `${transaction.description} is scheduled for ${nextDate.toLocaleDateString()}. Amount: $${transaction.amount?.toFixed(2) || 0}`,
                  actionUrl: "/recurring",
                });
              } else if (daysUntilNext === 0) {
                addNotification({
                  type: "recurring_payment",
                  title: "Recurring Payment Today! 🔁",
                  message: `${transaction.description} is scheduled today. Amount: $${transaction.amount?.toFixed(2) || 0}`,
                  actionUrl: "/recurring",
                });
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
    const interval = setInterval(runChecks, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [addNotification]);
}
