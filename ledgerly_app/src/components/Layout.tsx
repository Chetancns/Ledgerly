import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  FaSignOutAlt,
  FaPlus,
  FaCamera,
  FaEdit,
  FaChevronDown,
} from "react-icons/fa";
import { DevWarningBanner } from "./DevWarningBanner";
import { uploadReceiptImage, uploadAudioFile } from "../services/ai";
import toast from "react-hot-toast";
import TransactionForm from "./TransactionForm";
import UploadReceipt from "./UploadReceipt";
import UploadAudio from "./UploadAudio";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationTriggers } from "@/hooks/useNotificationTriggers";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import NotificationCenter from "./NotificationCenter";
import OnboardingModal, { useOnboardingKeyboard } from "./OnboardingModal";
import SkipLink from "./SkipLink";
export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { theme } = useTheme();
  //const [user, setUser] = useState<{ name?: string }>({});
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);  
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTransactionMenu, setShowTransactionMenu] = useState(false);
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/accounts", label: "Accounts", icon: "💳" },
    { href: "/categories", label: "Categories", icon: "📂" },
    { href: "/budgets", label: "Budget", icon: "💰" },
    { href: "/debts", label: "Debts", icon: "⚖️" },
    { href: "/calendar", label: "Calendar", icon: "📅" },
    { href: "/insights", label: "Insights", icon: "💡" },
    { href: "/profile", label: "Profile", icon: "👤" },
    { href: "/help", label: "Help", icon: "❓" },
  ];

  // Transactions item (positioned separately after Dashboard)
  const transactionItem = { href: "/transactions", label: "Transactions", icon: "↔️" };

  // Submenu for Transactions
  const transactionSubmenu = [
    { href: "/transactions", label: "Transactions", icon: "↔️" },
    { href: "/recurring", label: "Recurring", icon: "🔁" },
  ];
  const { user, loading, logoutapi } = useAuth();
  useAuthRedirect(user, loading);
  
  // Enable notification triggers for budgets, debts, and recurring payments
  useNotificationTriggers();
  
  // Enable keyboard navigation for onboarding
  useOnboardingKeyboard();
 //console.log("Layout user:", user);
  const logout = async () => {
    await logoutapi();
    router.push("/login");
  };

  const handleImageUpload = (file: File) => {
  setSelectedImageFile(file); // ✅ keep the file reference
  const reader = new FileReader();
  reader.onload = () => setPreviewImage(reader.result as string);
  reader.readAsDataURL(file);
};


  const confirmImageUpload = async () => {
  if (!selectedImageFile) {
    toast.error("Please select an image before confirming.");
    return;
  }

  const uploadPromise = uploadReceiptImage(selectedImageFile);

  toast.promise(uploadPromise, {
    loading: "Receipt received! Summoning the AI for analysis… (Free-tier backend stretching its legs—this may take a moment.).... ⏳",
    success: "✅ Transaction saved! AI isn’t flawless — take a moment to verify it in your Transactions.",
    error: "❌ Upload or parsing failed. Please try again.",
  });

  try {
    setUploading(true);
    const response = await uploadPromise;

    console.log("✅ AI response:", response.data);

    // If your backend saves the transaction automatically,
    // you can navigate or refresh the Transactions page:
    // router.push("/transactions");

  } catch (err) {
    console.error("❌ Image upload or AI processing failed:", err);
  } finally {
    setUploading(false);
    setShowModal(false);
    setPreviewImage(null);
    setSelectedImageFile(null);
  }
};


const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setPreviewAudio(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  } catch (err) {
    console.error("Audio recording failed:", err);
    alert("Could not start recording. Please allow microphone access.");
  }
};

const stopRecording = () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    setRecording(false);
  }
};
  const confirmAudioUpload = async () => {
  if (!previewAudio) {
    alert("Please record audio before confirming.");
    return;
  }

  try {
    setUploading(true);

    // Convert the preview URL back into a Blob
    const responseBlob = await fetch(previewAudio).then((res) => res.blob());
    const uploadPromise = uploadAudioFile(responseBlob);

    toast.promise(uploadPromise, {
      loading: "Listening in… AI is gearing up to analyze your voice note. Free-tier backend stretching its legs—hang tight!... 🎤",
      success:
        "✅ Transaction saved! AI isn’t flawless — take a moment to verify it in your Transactions.",
      error: "❌ Audio upload or parsing failed. Please try again.",
    });

    const response = await uploadPromise;
    console.log("🎧 Audio upload response:", response.data);

    // Optionally navigate or refresh after success
    // router.push("/transactions");

  } catch (err) {
    console.error("❌ Audio upload failed:", err);
  } finally {
    setUploading(false);
    setShowModal(false);
    setPreviewAudio(null);
  }
};

  return (
    <>
      <Head>
        <title>💰 Ledgerly - Budget with Style</title>
      </Head>

      {/* Skip Link for Accessibility */}
      <SkipLink />

      {/* Main wrapper - covers full mobile viewport */}
      <div 
        className="app-fullheight overflow-x-hidden transition-colors duration-300"
        style={{
          background: "var(--ledgerly-grad)",
          color: "var(--text-primary)",
        }}
      >

        {/* Desktop Navbar */}
        <nav
          className="sticky top-0 z-50 hidden md:flex items-center px-4 lg:px-6 py-3 backdrop-blur-md"
          aria-label="Main navigation"
          style={{
            background: "var(--nav-bg)",
            borderBottom: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <span 
            className="text-lg md:text-2xl font-extrabold tracking-wide drop-shadow-md mr-4 lg:mr-6"
            style={{ color: "var(--text-primary)" }}
          >
            <a href="/">💰 Ledgerly</a>
          </span>

          <div className="flex gap-2 lg:gap-4 flex-1 flex-wrap">
            {navItems.slice(0, 1).map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg font-semibold transition min-h-[44px] ${
                    isActive
                      ? "bg-[var(--bg-card-hover)]"
                      : "hover:bg-[var(--bg-card)]"
                  }`}
                  style={{
                    color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
                  }}
                >
                  <span className="text-base lg:text-lg">{item.icon}</span>
                  <span className="hidden lg:inline text-sm">{item.label}</span>
                </Link>
              );
            })}

            {/* Transactions with Dropdown Arrow */}
            <div className="relative flex items-center">
              <Link
                href={transactionItem.href}
                aria-label="Navigate to Transactions"
                aria-current={router.pathname === transactionItem.href ? 'page' : undefined}
                className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg font-semibold transition min-h-[44px] ${
                  router.pathname === transactionItem.href
                    ? "bg-[var(--bg-card-hover)]"
                    : "hover:bg-[var(--bg-card)]"
                }`}
                style={{
                  color: router.pathname === transactionItem.href ? "var(--nav-active)" : "var(--text-secondary)",
                }}
              >
                <span className="text-base lg:text-lg">{transactionItem.icon}</span>
                <span className="hidden lg:inline text-sm">{transactionItem.label}</span>
              </Link>

              {/* Chevron Button to Toggle Recurring */}
              <button
                onClick={() => setShowTransactionMenu(!showTransactionMenu)}
                aria-label="Toggle recurring transactions"
                aria-expanded={showTransactionMenu}
                className="px-2 py-1.5 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{
                  color: showTransactionMenu ? "var(--nav-active)" : "var(--text-secondary)",
                }}
              >
                <FaChevronDown 
                  className={`text-xs transition-transform ${showTransactionMenu ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu - Recurring */}
              {showTransactionMenu && (
                <div 
                  className="absolute top-full left-0 mt-1 rounded-lg shadow-lg backdrop-blur-md min-w-[150px] z-10 animate-fadeIn"
                  style={{
                    background: "var(--nav-bg)",
                    border: "1px solid var(--border-primary)",
                  }}
                  onClick={() => setShowTransactionMenu(false)}
                >
                  <Link
                    href="/recurring"
                    className={`block px-4 py-3 text-sm font-semibold transition rounded-lg ${
                      router.pathname === "/recurring"
                        ? "bg-[var(--bg-card-hover)]"
                        : "hover:bg-[var(--bg-card)]"
                    }`}
                    style={{
                      color: router.pathname === "/recurring" ? "var(--nav-active)" : "var(--text-secondary)",
                    }}
                  >
                    <span className="mr-2">🔁</span>
                    Recurring
                  </Link>
                </div>
              )}
            </div>

            {/* Rest of nav items */}
            {navItems.slice(1).map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg font-semibold transition min-h-[44px] ${
                    isActive
                      ? "bg-[var(--bg-card-hover)]"
                      : "hover:bg-[var(--bg-card)]"
                  }`}
                  style={{
                    color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
                  }}
                >
                  <span className="text-base lg:text-lg">{item.icon}</span>
                  <span className="hidden lg:inline text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            <NotificationCenter />
            <ThemeToggle />
            <span 
              className="font-semibold text-sm md:text-base hidden sm:inline"
              style={{ color: "var(--text-secondary)" }}
            >
              {user?.name || "Guest"}
            </span>
            <button
              onClick={logout}
              aria-label="Log out of your account"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm md:text-base font-semibold shadow-md transition min-h-[44px]"
              style={{
                backgroundColor: "var(--color-error)",
                color: "var(--text-inverse)",
              }}
            >
              <FaSignOutAlt /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </nav>

        {/* Mobile Top Header */}
        <div 
          className="flex items-center justify-between px-3 py-3 md:hidden backdrop-blur-md sticky top-0 z-50"
          style={{
            background: "var(--nav-bg)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <span className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
            💰 Ledgerly
          </span>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
            <span 
              className="font-semibold text-xs truncate max-w-[80px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {user?.name || "Guest"}
            </span>
            <button
              onClick={logout}
              aria-label="Log out"
              className="px-2 py-2 rounded-lg text-xs font-semibold transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{
                backgroundColor: "var(--color-error)",
                color: "var(--text-inverse)",
              }}
            >
              <FaSignOutAlt />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 pb-24 md:pb-4" role="main" aria-label="Main content" id="main-content">
          {/* Dev Warning Banner */}
          <DevWarningBanner />
          {children}
          <SpeedInsights />
        </main>

        {/* Mobile Bottom Nav - Dashboard, Transactions, Accounts, Budgets, More */}
        <nav 
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-between items-center px-3 py-2 backdrop-blur-md md:hidden bottom-nav safe-area-padding"
          style={{
            background: "var(--nav-bg)",
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          {/* Dashboard */}
          {navItems.slice(0, 1).map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 text-[10px] font-semibold transition min-w-[50px] min-h-[48px] justify-center tap-target rounded-lg px-2 py-1"
                style={{
                  color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
                  background: isActive ? "var(--bg-card)" : "transparent",
                }}
              >
                <div className="text-lg">{item.icon}</div>
                <span className="text-center leading-tight whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}

          {/* Transactions with Dropdown */}
          <div className="relative flex flex-col items-center">
            <Link
              href={transactionItem.href}
              aria-label="Navigate to Transactions"
              aria-current={router.pathname === transactionItem.href ? 'page' : undefined}
              className="flex flex-col items-center gap-1 text-[10px] font-semibold transition min-w-[50px] min-h-[48px] justify-center tap-target rounded-lg px-2 py-1"
              style={{
                color: router.pathname === transactionItem.href ? "var(--nav-active)" : "var(--text-secondary)",
                background: router.pathname === transactionItem.href ? "var(--bg-card)" : "transparent",
              }}
            >
              <div className="text-lg">{transactionItem.icon}</div>
              <span className="text-center leading-tight whitespace-nowrap">Txns</span>
            </Link>

            {/* Chevron for dropdown - positioned as overlay */}
            <button
              onClick={() => setShowTransactionMenu(!showTransactionMenu)}
              aria-label="Toggle recurring menu"
              aria-expanded={showTransactionMenu}
              className="absolute bottom-0 right-0 text-xs transition min-h-[18px] min-w-[18px] flex items-center justify-center"
              style={{
                color: showTransactionMenu ? "var(--nav-active)" : "var(--text-secondary)",
              }}
            >
              <FaChevronDown 
                className={`transition-transform text-[10px] ${showTransactionMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showTransactionMenu && (
              <div 
                className="absolute bottom-full mb-2 rounded-xl shadow-lg backdrop-blur-md min-w-[140px] z-10 animate-fadeIn"
                style={{
                  background: "var(--nav-bg)",
                  border: "1px solid var(--border-primary)",
                }}
                onClick={() => setShowTransactionMenu(false)}
              >
                <Link
                  href="/recurring"
                  className={`block px-3 py-2 text-xs font-semibold transition rounded-xl ${
                    router.pathname === "/recurring"
                      ? "bg-[var(--bg-card-hover)]"
                      : "hover:bg-[var(--bg-card)]"
                  }`}
                  style={{
                    color: router.pathname === "/recurring" ? "var(--nav-active)" : "var(--text-secondary)",
                  }}
                >
                  <span className="mr-1">🔁</span>
                  Recurring
                </Link>
              </div>
            )}
          </div>

          {/* Accounts */}
          {navItems.slice(1, 2).map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 text-[10px] font-semibold transition min-w-[50px] min-h-[48px] justify-center tap-target rounded-lg px-2 py-1"
                style={{
                  color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
                  background: isActive ? "var(--bg-card)" : "transparent",
                }}
              >
                <div className="text-lg">{item.icon}</div>
                <span className="text-center leading-tight whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}

          {/* Budget */}
          {navItems.slice(3, 4).map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 text-[10px] font-semibold transition min-w-[50px] min-h-[48px] justify-center tap-target rounded-lg px-2 py-1"
                style={{
                  color: isActive ? "var(--nav-active)" : "var(--text-secondary)",
                  background: isActive ? "var(--bg-card)" : "transparent",
                }}
              >
                <div className="text-lg">{item.icon}</div>
                <span className="text-center leading-tight whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu */}
          <button
            onClick={() => setShowMoreMenu(true)}
            aria-label="More menu"
            className="flex flex-col items-center gap-1 text-[10px] font-semibold transition min-w-[50px] min-h-[48px] justify-center tap-target rounded-lg px-2 py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <div className="text-lg">⋯</div>
            <span className="text-center leading-tight whitespace-nowrap">More</span>
          </button>
        </nav>

        {/* More Menu Modal */}
        {showMoreMenu && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-end md:items-center md:justify-center z-50 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMoreMenu(false);
            }}
          >
            <div 
              className="backdrop-blur-xl rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-md shadow-2xl animate-slideUp max-h-[80vh] overflow-y-auto"
              style={{
                background: theme === 'dark' 
                  ? "linear-gradient(135deg, rgba(49, 46, 129, 0.98), rgba(88, 28, 135, 0.98))"
                  : "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.98))",
                border: "1px solid var(--border-primary)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 
                  className="text-2xl font-bold flex items-center gap-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span className="text-3xl">⋯</span>
                  More Navigation
                </h2>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="hover:rotate-90 transition-all text-2xl w-10 h-10 flex items-center justify-center rounded-full min-h-[44px] min-w-[44px]"
                  style={{ 
                    color: "var(--text-muted)",
                    background: "var(--bg-card)",
                  }}
                  aria-label="Close more menu"
                >
                  ✖
                </button>
              </div>

              {/* Grid layout for navigation items */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {navItems.slice(2).map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMoreMenu(false)}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 min-h-[90px]"
                      style={{
                        background: isActive ? "var(--accent-primary)" : "var(--bg-card)",
                        border: `2px solid ${isActive ? "var(--accent-primary)" : "var(--border-primary)"}`,
                        color: isActive ? "var(--text-inverse)" : "var(--text-primary)",
                        boxShadow: isActive ? "0 8px 24px rgba(59, 130, 246, 0.3)" : "none",
                      }}
                    >
                      <div className="text-4xl">{item.icon}</div>
                      <span className="text-xs font-bold text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div 
                className="my-4 h-px"
                style={{ background: "var(--border-primary)" }}
              />

              {/* Recurring option in More menu */}
              <div className="mb-2">
                <h3 
                  className="text-sm font-semibold px-2 py-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Financial Management
                </h3>
                <Link
                  href="/recurring"
                  onClick={() => setShowMoreMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    router.pathname === "/recurring"
                      ? "bg-[var(--accent-primary)]"
                      : "hover:bg-[var(--bg-card)]"
                  }`}
                  style={{
                    color: router.pathname === "/recurring" ? "var(--text-inverse)" : "var(--text-primary)",
                  }}
                >
                  <span className="text-2xl">🔁</span>
                  <div>
                    <div className="font-semibold text-sm">Recurring</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Manage recurring payments</div>
                  </div>
                </Link>
              </div>

              <div 
                className="mt-4 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Tap outside to close
              </div>
            </div>
          </div>
        )}

        {/* Floating Expandable FAB */}
      {/* 🚀 Expandable Floating Action Button - Positioned for mobile nav */}
<div className="fixed bottom-28 right-4 md:bottom-10 flex flex-col items-center gap-3 z-50">
  {expanded && (
    <div className="flex flex-col items-center gap-3 mb-2 transition-all duration-300">
      {/* 📸 Upload Receipt */}
      <UploadReceipt />

      {/* 🎤 Record Audio */}
      <UploadAudio />

      {/* ✏️ Manual Entry */}
      <button
        onClick={() => setShowForm(true)}
        aria-label="Add transaction manually"
        className="rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition min-h-[48px] min-w-[48px]"
        style={{
          backgroundColor: "var(--bg-card)",
          color: "var(--accent-primary)",
        }}
        title="Add Manually"
      >
        <FaEdit className="text-lg" />
      </button>
    </div>
  )}

  {/* ➕ Main Expand Button */}
  <button
    onClick={() => setExpanded((prev) => !prev)}
    aria-label={expanded ? "Close add transaction menu" : "Open add transaction menu"}
    aria-expanded={expanded}
    className="rounded-full w-14 h-14 flex items-center justify-center shadow-2xl transition min-h-[56px] min-w-[56px]"
    style={{
      backgroundColor: "var(--accent-primary)",
      color: "var(--text-inverse)",
    }}
  >
    <FaPlus
      className={`text-xl transform transition-transform ${
        expanded ? "rotate-45" : ""
      }`}
    />
  </button>
</div>

      

        {/* ===== Modal: Add Transaction Options ===== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div
              className="backdrop-blur-xl rounded-2xl p-6 w-full max-w-md relative shadow-xl flex flex-col gap-6"
              style={{
                background: theme === 'dark' 
                  ? "rgba(49, 46, 129, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                border: "1px solid var(--border-primary)",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  handleImageUpload(file);
                } else {
                  alert("Please drop a valid image file.");
                }
              }}
            >
              <button
                onClick={() => {
                  setShowModal(false);
                  setPreviewImage(null);
                  setPreviewAudio(null);
                }}
                className="absolute top-3 right-3 text-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ color: "var(--text-muted)" }}
              >
                ✖
              </button>

              <h2 
                className="text-xl font-bold text-center mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Add Transaction
              </h2>

              {previewImage && (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-h-48 rounded-lg shadow-md border border-white/20"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="bg-gray-500 px-4 py-2 rounded-lg"
                    >
                      Retake
                    </button>
                    <button
                      onClick={confirmImageUpload}
                      className="bg-green-500 px-4 py-2 rounded-lg"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {previewAudio && (
                <div className="flex flex-col items-center gap-3">
                  <audio controls src={previewAudio} className="w-full" />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPreviewAudio(null)}
                      className="bg-gray-500 px-4 py-2 rounded-lg"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={confirmAudioUpload}
                      className="bg-green-500 px-4 py-2 rounded-lg"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {!previewImage && !previewAudio && (
                <>
                  <div
                    className="border-2 border-dashed border-white/30 rounded-xl p-6 text-center hover:border-yellow-400 transition cursor-pointer"
                    onClick={() =>
                      document.getElementById("imageInput")?.click()
                    }
                  >
                    <p className="text-white/70 text-sm mb-1">
                      Drag & drop a receipt image here or click to upload
                    </p>
                    <FaCamera className="mx-auto text-3xl text-yellow-300" />
                  </div>

                  <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleImageUpload(e.target.files[0])
                    }
                  />

                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`${
                      recording
                        ? "bg-red-500 animate-pulse"
                        : "bg-blue-500 hover:bg-blue-400"
                    } text-white px-4 py-3 rounded-lg font-semibold w-full`}
                  >
                    {recording ? "⏹ Stop Recording" : "🎤 Record Audio"}
                  </button>

                  <button
                    onClick={() => {
                      setShowModal(false);
                      setShowForm(true);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 px-4 py-3 rounded-lg font-semibold w-full flex items-center justify-center gap-2"
                  >
                    <FaEdit /> Add Manually
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {/* ✅ Transaction Form Modal */}
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
        
        {/* Onboarding Modal */}
        <OnboardingModal />
      </div>
    </>
  );
}
