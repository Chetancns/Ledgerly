import Layout from "@/components/Layout";
import React from "react";
import {
  FaUserPlus,
  FaListAlt,
  FaWallet,
  FaExchangeAlt,
  FaChartPie,
  FaLightbulb,
  FaEnvelope,
  FaRobot,
  FaCamera,
  FaMicrophone,
  FaRedo,
  FaChartLine,
  FaQuestionCircle,
  FaShieldAlt,
  FaCreditCard,
  FaDollarSign,
  FaBell,
} from "react-icons/fa";

interface HelpSection {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

const sections: HelpSection[] = [
  {
    icon: <FaUserPlus className="text-blue-300 w-6 h-6" />,
    title: "1. Getting Started",
    badge: "Essential",
    content: (
      <div>
        <h3 className="font-semibold mt-2 text-blue-200">1.1. Create an Account</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Open the app and click <b className="text-yellow-300">Sign Up</b>.</li>
          <li>Enter your <b>email</b>, <b>password</b>, and <b>name</b>.</li>
          <li>Submit the form to create your Ledgerly account.</li>
        </ul>
        <h3 className="font-semibold mt-4 text-blue-200">1.2. Log In</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>After registering, log in with your email and password.</li>
          <li>Once logged in, you'll be taken to your <b>Dashboard</b> with financial insights.</li>
        </ul>
        <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
          <p className="text-sm flex items-start gap-2">
            <FaShieldAlt className="text-blue-300 mt-0.5 flex-shrink-0" />
            <span><b>Security:</b> Your data is secured with JWT authentication and stays protected.</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <FaListAlt className="text-green-300 w-6 h-6" />,
    title: "2. Setting Up Your Finances",
    badge: "Required",
    content: (
      <div>
        <h3 className="font-semibold mt-2 text-green-200">2.1. Create Categories</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Go to the <b>Categories</b> page.</li>
          <li>Click <b className="text-yellow-300">Add Category</b>.</li>
          <li>Enter a <b>name</b> and select a <b>type</b>:
            <ul className="list-disc ml-6 mt-1.5">
              <li><b className="text-red-300">Expense</b>: For spending (e.g., Groceries, Rent, Entertainment)</li>
              <li><b className="text-green-300">Income</b>: For earnings (e.g., Salary, Freelance, Bonus)</li>
              <li><b className="text-blue-300">Savings</b>: For money set aside (e.g., Emergency Fund, Vacation)</li>
            </ul>
          </li>
          <li>Save your category to start tracking transactions.</li>
        </ul>
        <h3 className="font-semibold mt-4 text-green-200">2.2. Add Accounts</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Go to the <b>Accounts</b> page.</li>
          <li>Click <b className="text-yellow-300">Add New Account</b>.</li>
          <li>Enter the <b>account name</b>, select the <b>type</b>:
            <ul className="list-disc ml-6 mt-1.5">
              <li><b>Bank</b>: Checking accounts</li>
              <li><b>Cash</b>: Physical cash</li>
              <li><b>Credit Card</b>: Credit card accounts</li>
              <li><b>Wallet</b>: Digital wallets</li>
              <li><b>Savings</b>: Savings accounts</li>
            </ul>
          </li>
          <li>Set the <b>starting balance</b> and save your account.</li>
        </ul>
        <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
          <p className="text-sm flex items-start gap-2">
            <FaLightbulb className="text-yellow-300 mt-0.5 flex-shrink-0" />
            <span><b>Important:</b> You must create at least one category and one account before you can add transactions!</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <FaExchangeAlt className="text-yellow-300 w-6 h-6" />,
    title: "3. Recording Transactions",
    badge: "Core Feature",
    content: (
      <div>
        <h3 className="font-semibold mt-2 text-yellow-200">3.1. Transaction Types</h3>
        <p className="text-white/90 mb-2">
          When adding a transaction, you can select from different types:
        </p>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>
            <b className="text-red-300">Expense</b>: Money spent from an account (e.g., groceries, bills).
          </li>
          <li>
            <b className="text-green-300">Income</b>: Money received into an account (e.g., salary, bonus).
          </li>
          <li>
            <b className="text-blue-300">Savings</b>: Move money to a savings account or goal.
          </li>
          <li>
            <b className="text-purple-300">Transfer</b>: Move money between accounts (e.g., credit card payments, withdrawals).
          </li>
        </ul>
        <div className="mt-3 p-3 bg-purple-500/20 rounded-lg border border-purple-400/30">
          <p className="text-sm">
            <b>Note:</b> For normal transactions, the type is automatically determined from the selected category. 
            You only need to select the type manually for <b>Transfer</b> transactions.
          </p>
        </div>
        
        <h3 className="font-semibold mt-4 text-yellow-200">3.2. Creating a Transaction</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Go to the <b>Transactions</b> page.</li>
          <li>Click <b className="text-yellow-300">Add Transaction</b> button (+ icon).</li>
          <li>Fill in the form with:
            <ul className="list-disc ml-6 mt-1.5">
              <li><b>Amount</b>: Transaction value</li>
              <li><b>Category</b>: What this transaction is for</li>
              <li><b>Account</b>: Which account to use</li>
              <li><b>Date</b>: When the transaction occurred</li>
              <li><b>Description</b>: Optional notes</li>
            </ul>
          </li>
          <li>For <b>Savings</b> and <b>Transfer</b>, choose the destination account.</li>
          <li>Save to record the transaction.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaRobot className="text-cyan-300 w-6 h-6" />,
    title: "4. AI-Powered Features",
    badge: "Smart",
    content: (
      <div>
        <p className="text-white/90 mb-3">
          Ledgerly uses AI to make transaction entry faster and easier. No need to type everything manually!
        </p>
        
        <h3 className="font-semibold mt-3 text-cyan-200 flex items-center gap-2">
          <FaCamera /> 4.1. Receipt Scanning
        </h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Click the <b className="text-yellow-300">+ floating button</b> in the bottom-right corner.</li>
          <li>Select the <b className="text-cyan-300">📸 Upload Receipt</b> option.</li>
          <li>Take a photo or upload an image of your receipt.</li>
          <li>AI will extract the amount, merchant, date, and create a transaction automatically.</li>
          <li>Review and edit the transaction if needed in your Transactions page.</li>
        </ul>
        
        <h3 className="font-semibold mt-4 text-cyan-200 flex items-center gap-2">
          <FaMicrophone /> 4.2. Voice Transaction Entry
        </h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Click the <b className="text-yellow-300">+ floating button</b> in the bottom-right corner.</li>
          <li>Select the <b className="text-cyan-300">🎤 Record Audio</b> option.</li>
          <li>Speak your transaction (e.g., "Spent 50 dollars on groceries at Walmart").</li>
          <li>AI will parse your voice note and create the transaction.</li>
          <li>Always verify AI-created transactions for accuracy.</li>
        </ul>
        
        <div className="mt-4 p-3 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
          <p className="text-sm flex items-start gap-2">
            <FaRobot className="text-cyan-300 mt-0.5 flex-shrink-0" />
            <span><b>AI Note:</b> AI processing may take a moment on free-tier backends. Always review AI-generated transactions as AI isn't perfect!</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <FaDollarSign className="text-pink-300 w-6 h-6" />,
    title: "5. Budgeting",
    badge: "Financial Planning",
    content: (
      <div>
        <p className="text-white/90 mb-3">
          Set spending limits for categories and track your budget utilization to stay on target.
        </p>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Go to the <b>Budgets</b> page.</li>
          <li>Click <b className="text-yellow-300">Add Budget</b> to set a spending limit.</li>
          <li>Choose a <b>category</b> (e.g., Groceries, Entertainment).</li>
          <li>Enter the <b>amount</b> you want to allocate.</li>
          <li>Select the <b>period</b>: monthly, weekly, bi-weekly, or yearly.</li>
          <li>Pick the <b>start date</b>; the end date will auto-fill based on the period.</li>
          <li>(Optional) Enable <b className="text-green-300">Carry Over Unused</b> to roll over unspent budget to the next period.</li>
          <li>Monitor your budget utilization on the Dashboard and Budgets page.</li>
        </ul>
        
        <div className="mt-4 p-3 bg-pink-500/20 rounded-lg border border-pink-400/30">
          <p className="text-sm">
            <b>Budget Status:</b> Budgets show as <span className="text-green-300">green</span> when within limit, 
            <span className="text-yellow-300"> yellow</span> when near limit, and <span className="text-red-300">red</span> when overspent.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <FaCreditCard className="text-orange-300 w-6 h-6" />,
    title: "6. Debt Management",
    badge: "Financial Freedom",
    content: (
      <div>
        <p className="text-white/90 mb-3">
          Track loans, credit cards, and other debts. Monitor payments and see your progress toward being debt-free.
        </p>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Go to the <b>Debts</b> page to manage your debts.</li>
          <li>Click <b className="text-yellow-300">Add Debt</b> and fill in details:
            <ul className="list-disc ml-6 mt-1.5">
              <li><b>Name</b>: e.g., Car Loan, Credit Card</li>
              <li><b>Account</b>: Which account the debt is tied to</li>
              <li><b>Principal</b>: Original loan amount</li>
              <li><b>Current Balance</b>: Current amount owed (defaults to principal)</li>
              <li><b>Term</b>: Loan duration in months (optional)</li>
              <li><b>Payment Frequency</b>: monthly, biweekly, or weekly</li>
              <li><b>Installment Amount</b>: Payment amount (auto-calculated if term is set)</li>
              <li><b>Start Date</b> and <b>Next Due Date</b></li>
            </ul>
          </li>
          <li>Ledgerly automatically tracks payments, updates balances, and shows progress.</li>
          <li>You can pay early, view payment history, or edit/delete debts as needed.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaRedo className="text-indigo-300 w-6 h-6" />,
    title: "7. Recurring Transactions",
    badge: "Automation",
    content: (
      <div>
        <p className="text-white/90 mb-3">
          Automate regular transactions like rent, subscriptions, or salary that happen on a fixed schedule.
        </p>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Go to the <b>Recurring</b> page.</li>
          <li>Click <b className="text-yellow-300">Add Recurring Transaction</b>.</li>
          <li>Fill in the transaction details:
            <ul className="list-disc ml-6 mt-1.5">
              <li><b>Account</b>: Which account to use</li>
              <li><b>Category</b>: Transaction category</li>
              <li><b>Amount</b>: Transaction value</li>
              <li><b>Frequency</b>: daily, weekly, monthly, or yearly</li>
              <li><b>Next Occurrence</b>: When it should happen next</li>
              <li><b>Description</b>: Optional notes</li>
            </ul>
          </li>
          <li>Ledgerly will automatically create transactions based on the schedule.</li>
          <li>You can pause, edit, or delete recurring transactions anytime.</li>
        </ul>
        
        <div className="mt-4 p-3 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
          <p className="text-sm flex items-start gap-2">
            <FaBell className="text-indigo-300 mt-0.5 flex-shrink-0" />
            <span><b>Automation:</b> Recurring transactions help you never forget regular bills and income!</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <FaChartLine className="text-purple-300 w-6 h-6" />,
    title: "8. Reports & Analytics",
    badge: "Insights",
    content: (
      <div>
        <p className="text-white/90 mb-3">
          Get powerful insights into your finances with interactive charts and reports on the Dashboard.
        </p>
        
        <h3 className="font-semibold mt-3 text-purple-200">8.1. Dashboard Charts</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li><b className="text-yellow-300">Spending Breakdown</b>: Pie chart showing expenses by category</li>
          <li><b className="text-green-300">Daily Flow</b>: Line chart of income vs expenses over time</li>
          <li><b className="text-blue-300">Budget Utilization</b>: Progress bars showing budget usage</li>
          <li><b className="text-pink-300">Budget vs Actual</b>: Compare planned vs actual spending</li>
          <li><b className="text-cyan-300">Cash Flow Timeline</b>: Track your cash flow over time</li>
          <li><b className="text-orange-300">Category Heatmap</b>: Visual spending patterns by category</li>
        </ul>
        
        <h3 className="font-semibold mt-4 text-purple-200">8.2. Filters</h3>
        <ul className="list-disc ml-6 space-y-1.5 text-white/90">
          <li>Filter by <b>month</b> and <b>year</b> to analyze different time periods.</li>
          <li>Filter by <b>account</b> to see data for specific accounts.</li>
          <li>View budget status: All, Within Budget, Overspent, or Unbudgeted.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaChartPie className="text-teal-300 w-6 h-6" />,
    title: "9. How Ledgerly Helps You",
    badge: "Benefits",
    content: (
      <div>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <b className="text-teal-200">Track Spending:</b>
              <p className="text-white/80 text-sm mt-0.5">See exactly where your money goes with detailed transaction history and categorization.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <b className="text-teal-200">Visualize Trends:</b>
              <p className="text-white/80 text-sm mt-0.5">Dashboard charts show income, expenses, and spending patterns at a glance.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <b className="text-teal-200">Smart Budgeting:</b>
              <p className="text-white/80 text-sm mt-0.5">Set budgets by category and get visual feedback on your spending habits.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <b className="text-teal-200">Multi-Account Support:</b>
              <p className="text-white/80 text-sm mt-0.5">Manage all your accounts (bank, cash, credit cards, wallets) in one place.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <b className="text-teal-200">Debt Freedom:</b>
              <p className="text-white/80 text-sm mt-0.5">Track debt payments and monitor progress toward being debt-free.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <b className="text-teal-200">AI Assistance:</b>
              <p className="text-white/80 text-sm mt-0.5">Use receipt scanning and voice entry to add transactions effortlessly.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <b className="text-teal-200">Secure & Private:</b>
              <p className="text-white/80 text-sm mt-0.5">Your financial data stays protected with industry-standard security.</p>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaLightbulb className="text-yellow-300 w-6 h-6" />,
    title: "10. Tips & Best Practices",
    badge: "Pro Tips",
    content: (
      <div>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <b className="text-yellow-200">Setup First:</b>
              <p className="text-white/80 text-sm mt-0.5">Create categories and accounts before adding transactions—they're required!</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <b className="text-yellow-200">Use Transfers Wisely:</b>
              <p className="text-white/80 text-sm mt-0.5">When paying credit card bills or moving money between accounts, use Transfer transactions.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <b className="text-yellow-200">Plan with Savings:</b>
              <p className="text-white/80 text-sm mt-0.5">Use savings transactions to track progress toward financial goals.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">🔄</span>
            <div>
              <b className="text-yellow-200">Automate Recurring Bills:</b>
              <p className="text-white/80 text-sm mt-0.5">Set up recurring transactions for subscriptions, rent, and salary to save time.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">📊</span>
            <div>
              <b className="text-yellow-200">Review Dashboard Regularly:</b>
              <p className="text-white/80 text-sm mt-0.5">Check your dashboard weekly to stay on top of your finances and budgets.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">🤖</span>
            <div>
              <b className="text-yellow-200">Verify AI Transactions:</b>
              <p className="text-white/80 text-sm mt-0.5">Always double-check transactions created by AI to ensure accuracy.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <b className="text-yellow-200">Delete with Caution:</b>
              <p className="text-white/80 text-sm mt-0.5">Deleting accounts or categories will cause inconsistencies in your reports. Use with caution!</p>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <FaQuestionCircle className="text-pink-300 w-6 h-6" />,
    title: "11. Frequently Asked Questions",
    badge: "FAQ",
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-pink-200 mb-1">Q: What's the difference between Expense and Transfer?</h4>
          <p className="text-white/80 text-sm ml-4">
            <b>Expense</b> reduces your account balance for spending (e.g., buying groceries). 
            <b> Transfer</b> moves money between your accounts without changing your total wealth (e.g., paying a credit card from your bank account).
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-pink-200 mb-1">Q: Can I edit transactions after adding them?</h4>
          <p className="text-white/80 text-sm ml-4">
            Yes! Go to the Transactions page, find the transaction, and click edit. You can also delete transactions if needed.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-pink-200 mb-1">Q: How accurate is the AI receipt scanning?</h4>
          <p className="text-white/80 text-sm ml-4">
            AI is quite good but not perfect but it may not pick up correct account or Category if some details are unclear. It may take longer on free-tier backends. Always review AI-created transactions for accuracy.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-pink-200 mb-1">Q: What happens if I delete a category?</h4>
          <p className="text-white/80 text-sm ml-4">
            <span className="text-red-300">⚠️ Warning:</span> Deleting a category will make sure they don't show up in your reports. Use with caution!
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-pink-200 mb-1">Q: Can I use Ledgerly on mobile?</h4>
          <p className="text-white/80 text-sm ml-4">
            Yes! Ledgerly has a responsive design that works great on mobile devices. All features are accessible on both desktop and mobile.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-pink-200 mb-1">Q: Is my financial data secure?</h4>
          <p className="text-white/80 text-sm ml-4">
            Absolutely! Your data is protected with JWT authentication and industry-standard security practices. Your information stays private and secure.
          </p>
        </div>
      </div>
    ),
  },
];

export default function HelpPage() {
  const [open, setOpen] = React.useState<number | null>(0); // First section open by default

  return (
    <Layout>
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white px-4 sm:px-6 py-10">
        <div
          className="max-w-5xl mx-auto rounded-2xl p-8"
          style={{
            backdropFilter: "blur(14px)",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-3">
              <FaLightbulb className="text-yellow-300 animate-pulse" /> 
              <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Ledgerly User Guide
              </span>
            </h1>
            <p className="text-lg text-white/90 mb-2">
              Your Complete Guide to Mastering Personal Finance
            </p>
            <p className="text-white/70 text-sm max-w-2xl mx-auto">
              Welcome to <b>Ledgerly</b> – your all-in-one budgeting and personal finance tracker 
              with AI-powered features! Click any section below to explore.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl mb-1">💰</div>
              <div className="text-sm text-white/70">Track Spending</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl mb-1">🤖</div>
              <div className="text-sm text-white/70">AI Features</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl mb-1">📊</div>
              <div className="text-sm text-white/70">Visual Reports</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl mb-1">🔒</div>
              <div className="text-sm text-white/70">Secure Data</div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div
                key={section.title}
                className="rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  background: open === idx ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <button
                  className="flex items-center w-full px-5 py-4 focus:outline-none hover:bg-white/10 transition-all"
                  onClick={() => setOpen(open === idx ? null : idx)}
                  aria-expanded={open === idx}
                >
                  <span className="mr-3">{section.icon}</span>
                  <span className="font-semibold text-lg flex-1 text-left">{section.title}</span>
                  {section.badge && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-400/20 text-yellow-200 border border-yellow-300/30 mr-3">
                      {section.badge}
                    </span>
                  )}
                  <span className="ml-2 text-white/60 font-bold text-xl">
                    {open === idx ? "−" : "+"}
                  </span>
                </button>
                {open === idx && (
                  <div className="px-6 pb-5 pt-2 text-white/90 animate-fade-in">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-10 p-6 rounded-xl text-center" style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}>
            <h3 className="text-xl font-bold mb-3 flex items-center justify-center gap-2">
              <FaEnvelope className="text-pink-300" />
              Need More Help?
            </h3>
            <p className="text-white/80 mb-3">
              Can't find what you're looking for? We're here to help!
            </p>
            <a
              href="mailto:support@ledgerly.app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              <FaEnvelope />
              Contact Support: chetan.1rn16is027@gmail.com
            </a>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center text-sm text-white/60">
            <p>💡 Pro Tip: Bookmark this page for quick reference while using Ledgerly!</p>
          </div>
        </div>

        <style jsx>{`
          .animate-fade-in {
            animation: fadeIn 0.3s ease-in-out;
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}
