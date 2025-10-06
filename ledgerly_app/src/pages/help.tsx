import Layout from "@/components/Layout";
import React from "react";
import {
  FaUserPlus,
  FaSignInAlt,
  FaListAlt,
  FaWallet,
  FaExchangeAlt,
  FaChartPie,
  FaLightbulb,
  FaEnvelope,
} from "react-icons/fa";

const sections = [
  {
    icon: <FaUserPlus className="text-blue-300 w-6 h-6" />,
    title: "1. Getting Started",
    content: (
      <div>
        <h3 className="font-semibold mt-2">1.1. Create an Account</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li>Open the app and click <b>Sign Up</b>.</li>
          <li>Enter your <b>email</b>, <b>password</b>, and <b>name</b>.</li>
          <li>Submit the form to create your Ledgerly account.</li>
        </ul>
        <h3 className="font-semibold mt-4">1.2. Log In</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li>After registering, log in with your email and password.</li>
          <li>Once logged in, you’ll be taken to your dashboard.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaListAlt className="text-green-300 w-6 h-6" />,
    title: "2. Setting Up Your Finances",
    content: (
      <div>
        <h3 className="font-semibold mt-2">2.1. Create Categories</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li>Go to the <b>Categories</b> page.</li>
          <li>Click <b>Add Category</b>.</li>
          <li>Enter a <b>name</b> and select a <b>type</b>:
            <ul className="list-disc ml-6">
              <li><b>Expense</b>: For spending (e.g., Groceries, Rent)</li>
              <li><b>Income</b>: For earnings (e.g., Salary, Freelance)</li>
              <li><b>Savings</b>: For money set aside (e.g., Emergency Fund)</li>
            </ul>
          </li>
          <li>Save your category.</li>
        </ul>
        <h3 className="font-semibold mt-4">2.2. Add Accounts</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li>Go to the <b>Accounts</b> page.</li>
          <li>Click <b>Add New Account</b>.</li>
          <li>Enter the <b>account name</b>, select the <b>type</b> (Bank, Cash, Credit Card, Wallet, Savings), and set the <b>starting balance</b>.</li>
          <li>Save your account.</li>
        </ul>
      </div>
    ),
  },{
    icon: <FaExchangeAlt className="text-yellow-300 w-6 h-6" />,
    title: "3. Recording Transactions",
    content: (
      <div>
        <h3 className="font-semibold mt-2">5.1. Transaction Types</h3>
        <p>
          When adding a transaction, you must select a <b>type</b>:
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>
            <b>Normal</b>: Money spent/received from an account.
          </li>
          <li>
            <b>Savings</b>: Move money to a savings account.
          </li>
          <li>
            <b>Transfer</b>: Move money between two accounts (e.g credit_card payments, Money withdrawal).
          </li>
        </ul>
        <p className="mt-2 text-sm text-white/80">
          <b>Note:</b> For normal transactions, the <b>type</b> is automatically determined from the selected category type (Expense, Income, or Savings). You only need to select the type manually for <b>Transfer</b> transactions.
        </p>
        <h3 className="font-semibold mt-4">5.2. Creating a Transaction</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li>Go to the <b>Transactions</b> page.</li>
          <li>Click <b>Add Transaction</b>.</li>
          <li>
            Fill in the form and select <b>category</b> and <b>account</b>.
            <ul className="list-disc ml-6">
              <li>
                For <b>Savings</b> and <b>Transfer</b>, choose the destination account.
              </li>
            </ul>
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaChartPie className="text-yellow-300 w-6 h-6" />,
    title: "4. Budgets",
    content: (
      <div>
        <ul className="list-disc ml-6 space-y-1">
          <li>Go to the <b>Budgets</b> page.</li>
          <li>Click <b>Add Budget</b> to set a spending limit for a category and period (monthly, weekly, yearly, etc.).</li>
          <li>Choose a <b>category</b>, enter the <b>amount</b>, and select the <b>period</b> and date range.</li>
          <li>Monitor your budget utilization and carry over unspent amounts to the next period if needed.</li>
          <li>You can edit or delete budgets at any time.</li>
        </ul>
        <div className="mt-2 ml-2">
          <span className="font-semibold">How to create a budget:</span>
          <ol className="list-decimal ml-6 space-y-1">
            <li>Click <b>Add Budget</b> on the Budgets page.</li>
            <li>Select a <b>category</b> you want to budget for.</li>
            <li>Enter the <b>amount</b> you want to allocate.</li>
            <li>Choose the <b>period</b> (monthly, weekly, etc.).</li>
            <li>Pick the <b>start date</b>; the end date will auto-fill based on the period.</li>
            <li>(Optional) Enable <b>Carry Over Unused</b> to roll over unspent budget.</li>
            <li>Click <b>Save Budget</b> to add it.</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    icon: <FaWallet className="text-pink-300 w-6 h-6" />,
    title: "5. Debts",
    content: (
      <div>
        <ul className="list-disc ml-6 space-y-1">
          <li>Go to the <b>Debts</b> page to track loans, credit cards, or other debts.</li>
          <li>Click <b>Add Debt</b> and fill in details: <b>name</b>, <b>account</b>, <b>principal</b>, <b>installment amount</b>, <b>frequency</b> (monthly, weekly, etc.), and <b>start date</b>.</li>
          <li>Ledgerly will automatically track payments, update balances, and show your progress.</li>
          <li>You can pay early, view payment history, or edit/delete debts as needed.</li>
        </ul>
        <div className="mt-2 ml-2">
          <span className="font-semibold">How to create a debt:</span>
          <ol className="list-decimal ml-6 space-y-1">
            <li>Click <b>Add Debt</b> on the Debts page.</li>
            <li>Enter the <b>debt name</b> (e.g., Car Loan).</li>
            <li>Select the <b>account</b> the debt is tied to.</li>
            <li>Enter the <b>principal</b> (original loan amount).</li>
            <li>(Optional) Enter the <b>current balance</b> (defaults to principal).</li>
            <li>(Optional) Enter the <b>term</b> in months.</li>
            <li>Choose the <b>payment frequency</b> (monthly, biweekly, weekly).</li>
            <li>Enter the <b>installment amount</b> (auto-calculated if term is set and auto-calc is enabled).</li>
            <li>Set the <b>start date</b> and <b>next due date</b>.</li>
            <li>Click <b>Add Debt</b> to save.</li>
          </ol>
        </div>
      </div>
    ),
  },
  
  {
    icon: <FaChartPie className="text-purple-300 w-6 h-6" />,
    title: "6. How Ledgerly Helps You",
    content: (
      <ul className="list-disc ml-6 space-y-1">
        <li><b>Track Spending</b>: See where your money goes.</li>
        <li><b>Visualize Trends</b>: Dashboard charts show income & expenses.</li>
        <li><b>Budgeting</b>: Set budgets and monitor usage.</li>
        <li><b>Balances</b>: Always know account balances.</li>
        <li><b>Debt Tracking</b>: Monitor your debt payments and progress.</li>
        <li><b>Secure</b>: Your data stays protected.</li>
      </ul>
    ),
  },
  {
    icon: <FaLightbulb className="text-pink-300 w-6 h-6" />,
    title: "7. Tips",
    content: (
  <ul className="list-disc ml-6 space-y-1">
    <li><b>Create categories and accounts first</b> — it's the only way to enable transaction creation.</li>
    <li><b>Use transfers</b> to move money between accounts.</li>
    <li><b>Use savings</b> to plan and track future goals.</li>
    <li><b>Edit or delete</b> accounts, categories and transactions anytime. Just note: deleting accounts or categories will also remove all associated transactions.</li>
  </ul>
)
,
  },
];

export default function HelpPage() {
  const [open, setOpen] = React.useState<number | null>(null);

  return (
    <Layout><div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white px-4 sm:px-6 py-10">
      <div
        className="mx-auto rounded-2xl p-8"
        style={{
          backdropFilter: "blur(14px)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h1 className="text-3xl font-bold text-center mb-2 flex items-center justify-center gap-2">
          <FaLightbulb className="text-yellow-300" /> Ledgerly User Guide
        </h1>
        <p className="text-center text-white/80 mb-8">
          Welcome to <b>Ledgerly</b> – your all-in-one budgeting and personal finance tracker!  
          Click a section to expand and learn more.
        </p>

        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div
              key={section.title}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: open === idx ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <button
                className="flex items-center w-full px-4 py-3 focus:outline-none hover:bg-white/10 transition"
                onClick={() => setOpen(open === idx ? null : idx)}
                aria-expanded={open === idx}
              >
                <span className="mr-3">{section.icon}</span>
                <span className="font-semibold flex-1 text-left">{section.title}</span>
                <span className="ml-2 text-sm text-white/60">{open === idx ? "▲" : "▼"}</span>
              </button>
              {open === idx && (
                <div className="px-6 pb-4 pt-2 text-white/90 animate-fade-in">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 text-lg font-semibold text-pink-200">
            <FaEnvelope className="w-5 h-5" />
            Need more help? Contact us at{" "}
            <a
              href="mailto:support@ledgerly.app"
              className="underline hover:text-white"
            >
              support@ledgerly.app
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.35s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div></Layout>
  );
}
