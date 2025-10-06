import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  FaTachometerAlt,
  FaExchangeAlt,
  FaWallet,
  FaListAlt,
  FaPiggyBank,
  FaBalanceScale,
  FaQuestionCircle,
  FaSignOutAlt,
  FaPlus,
} from "react-icons/fa";
import TransactionForm from "@/components/TransactionForm";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name?: string }>({});
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse user:", err);
      }
    }
  }, []);

  const logout = () => {
    localStorage.clear();
    setUser({});
    router.push("/login");
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: <FaTachometerAlt /> },
    { href: "/transactions", label: "Transactions", icon: <FaExchangeAlt /> },
    { href: "/accounts", label: "Accounts", icon: <FaWallet /> },
    { href: "/categories", label: "Categories", icon: <FaListAlt /> },
    { href: "/budgets", label: "Budget", icon: <FaPiggyBank /> },
    { href: "/debts", label: "Debts", icon: <FaBalanceScale /> },
    { href: "/help", label: "Help", icon: <FaQuestionCircle /> },
  ];

  return (
    <>
      <Head>
        <title>💰 Ledgerly - Budget with Style</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white overflow-x-hidden pb-20 md:pb-0">
        {/* Desktop Navbar */}
        <nav
          className="sticky top-0 z-50 hidden md:flex items-center px-6 py-3 backdrop-blur-md"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}
        >
          <span className="text-lg md:text-2xl font-extrabold tracking-wide text-white drop-shadow-md mr-6">
            💰 Ledgerly
          </span>

          <div className="flex gap-4 flex-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition ${
                    isActive
                      ? "bg-white/20 text-yellow-300"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="font-semibold text-sm md:text-base text-white/90">
              {user.name || "Guest"}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-sm md:text-base font-semibold shadow-md transition"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </nav>

        {/* Mobile Top Header */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden bg-black/40 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
          <span className="text-lg font-extrabold">💰 Ledgerly</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{user.name || "Guest"}</span>
            <button
              onClick={logout}
              className="bg-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-2 py-2 bg-black/40 backdrop-blur-md border-t border-white/20 md:hidden">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition ${
                  isActive ? "text-yellow-300" : "text-white/80 hover:text-white"
                }`}
              >
                <div className="text-lg">{item.icon}</div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Floating Add Transaction (Desktop + Mobile) */}
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-20 md:bottom-6 right-5 z-50 bg-yellow-400 text-indigo-900 rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:bg-yellow-300 transition"
        >
          <FaPlus className="text-2xl" />
        </button>

        {/* Content */}
        <main className="p-4 md:p-6">{children}</main>

        {/* Transaction Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-indigo-900/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-2xl relative shadow-xl border border-white/20">
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-3 right-3 text-white hover:text-yellow-300 text-xl"
              >
                ✖
              </button>
              <TransactionForm
                onCreated={() => {
                  setShowForm(false);
                  router.push("/transactions");
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
