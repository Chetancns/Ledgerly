import { useEffect, useRef, useState } from "react";
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
import type { IconType } from "react-icons";
import {
  RiDashboardLine,
  RiExchangeDollarLine,
  RiWallet3Line,
  RiFolderLine,
  RiPriceTag3Line,
  RiMoneyDollarCircleLine,
  RiScalesLine,
  RiCalendarLine,
  RiLineChartLine,
  RiRobot2Line,
  RiBarChartGroupedLine,
  RiUserLine,
  RiRepeatLine,
  RiQuestionLine,
  RiAppsLine,
} from "react-icons/ri";
import { DevWarningBanner } from "./DevWarningBanner";
import { uploadReceiptImage, uploadAudioFile } from "../services/ai";
import toast from "react-hot-toast";
import TransactionForm from "./TransactionForm";
import UploadReceipt from "./UploadReceipt";
import UploadAudio from "./UploadAudio";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationTriggers } from "@/hooks/useNotificationTriggers";
import { useNotifications } from "@/context/NotificationContext";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import NotificationCenter from "./NotificationCenter";
import OnboardingModal, { useOnboardingKeyboard } from "./OnboardingModal";
import SkipLink from "./SkipLink";

type NavSection = "Finances" | "Insights & AI" | "Settings";
type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  section: NavSection;
};
const NAV_SECTIONS: NavSection[] = ["Finances", "Insights & AI", "Settings"];
const SWIPE_DISMISS_THRESHOLD = 40;

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
  const [showMoreMenu, setShowMoreMenu] = useState(false); // mobile "More"
  const [showDesktopMoreMenu, setShowDesktopMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuFirstActionRef = useRef<HTMLAnchorElement | null>(null);

  const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: RiDashboardLine, section: "Finances" },
    { href: "/transactions", label: "Transactions", icon: RiExchangeDollarLine, section: "Finances" },
    { href: "/accounts", label: "Accounts", icon: RiWallet3Line, section: "Finances" },
    { href: "/categories", label: "Categories", icon: RiFolderLine, section: "Finances" },
    { href: "/tags", label: "Tags", icon: RiPriceTag3Line, section: "Finances" },
    { href: "/budgets", label: "Budgets", icon: RiMoneyDollarCircleLine, section: "Finances" },
    { href: "/debts", label: "Debts", icon: RiScalesLine, section: "Finances" },
    { href: "/calendar", label: "Calendar", icon: RiCalendarLine, section: "Finances" },
    { href: "/insights", label: "Insights", icon: RiLineChartLine, section: "Insights & AI" },
    { href: "/ai-chat", label: "AI Chat", icon: RiRobot2Line, section: "Insights & AI" },
    { href: "/tag-insights", label: "Tag Insights", icon: RiBarChartGroupedLine, section: "Insights & AI" },
    { href: "/profile", label: "Profile", icon: RiUserLine, section: "Settings" },
    { href: "/recurring", label: "Recurring", icon: RiRepeatLine, section: "Finances" },
    { href: "/help", label: "Help", icon: RiQuestionLine, section: "Settings" },
  ];

  // Primary items to keep visible on desktop; rest go under More
  const primaryNavHrefs = new Set([
    "/",
    "/transactions",
    "/accounts",
    "/categories",
    "/recurring",
    "/budgets",
    "/calendar",
    "/insights",
    "/debts",
  ]);
  const primaryNavItems = navItems.filter((item) => primaryNavHrefs.has(item.href));
  const secondaryNavItems = navItems.filter((item) => !primaryNavHrefs.has(item.href));
  const mobileBottomNavHrefs = new Set(["/", "/transactions", "/accounts", "/budgets"]);
  const mobileMoreItems = navItems.filter((item) => !mobileBottomNavHrefs.has(item.href));
  const dashboardItem = navItems.find((item) => item.href === "/");
  const transactionsItem = navItems.find((item) => item.href === "/transactions");
  const accountsItem = navItems.find((item) => item.href === "/accounts");
  const budgetItem = navItems.find((item) => item.href === "/budgets");
  const { user, loading, logoutapi } = useAuth();
  const { clearAll } = useNotifications();
  useAuthRedirect(user, loading);
  
  // Only enable notification triggers once auth is confirmed to prevent
  // API calls (and resulting toasts) before the user is authenticated.
  useNotificationTriggers(!!user && !loading);
  
  // Enable keyboard navigation for onboarding
  useOnboardingKeyboard();
 //console.log("Layout user:", user);
  const logout = async () => {
    clearAll(); // Clear notification state and localStorage before logging out
    await logoutapi();
    router.push("/login");
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "U";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return initials || "U";
  };

  const userInitials = getUserInitials(user?.name);
  const fallbackPageLabel =
    router.pathname === "/"
      ? "Dashboard"
      : (router.pathname
          .split("/")
          .filter(Boolean)
          .pop()
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (match) => match.toUpperCase()) || "Overview");
  const currentPageLabel = navItems.find((item) => item.href === router.pathname)?.label || fallbackPageLabel;
  const filteredMobileMoreItems = mobileMoreItems.filter((item) =>
    item.label.toLowerCase().includes(navSearch.toLowerCase().trim())
  );
  const groupedMoreItems: { section: NavSection; items: NavItem[] }[] = NAV_SECTIONS.map(
    (section) => ({
      section,
      items: filteredMobileMoreItems.filter((item) => item.section === section),
    })
  );
  const userEmail = user?.email || "No email available";

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktopMore = target instanceof Element && !!target.closest('[data-desktop-more-root="true"]');
      const clickedProfileMenu = target instanceof Element && !!target.closest('[data-profile-menu-root="true"]');

      if (!clickedDesktopMore) {
        setShowDesktopMoreMenu(false);
      }
      if (!clickedProfileMenu) {
        setShowProfileMenu(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDesktopMoreMenu(false);
        setShowProfileMenu(false);
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (showProfileMenu) {
      profileMenuFirstActionRef.current?.focus();
    }
  }, [showProfileMenu]);

  useEffect(() => {
    if (!showProfileMenu || !profileMenuRef.current) return;

    const menu = profileMenuRef.current;
    const focusable = menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [showProfileMenu]);

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
          className="sticky top-0 z-50 hidden md:flex items-center px-4 lg:px-6 py-3.5 backdrop-blur-xl"
          role="navigation"
          aria-label="Main navigation"
          style={{
            background: "var(--nav-bg)",
            borderBottom: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <Link
            href="/"
            className="group mr-4 lg:mr-6 flex items-center gap-2.5 rounded-xl px-2 py-1 transition-all duration-200 ease-out hover:bg-[var(--bg-card)]"
            aria-label="Navigate to Dashboard"
          >
            <span className="ledgerly-logo-badge" role="img" aria-label="Ledgerly logo">💰</span>
            <span className="ledgerly-logo-text">Ledgerly</span>
          </Link>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1 rounded-full border border-[var(--border-secondary)] bg-[var(--bg-card)]/80 px-2 py-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={`Navigate to ${item.label}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ease-out ${
                      isActive ? "bg-[var(--accent-soft)] text-[var(--nav-active)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    <Icon className="text-base" aria-hidden="true" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {isActive && <span className="nav-indicator-pill" aria-hidden="true" />}
                  </Link>
                );
              })}

              <div className="relative flex items-center" data-desktop-more-root="true">
                <button
                  onClick={() => setShowDesktopMoreMenu((open) => !open)}
                  aria-label="Open more navigation"
                  aria-expanded={showDesktopMoreMenu}
                  className={`flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ease-out ${
                    showDesktopMoreMenu ? "bg-[var(--accent-soft)] text-[var(--nav-active)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <RiAppsLine className="text-base" aria-hidden="true" />
                  <span className="hidden lg:inline">More</span>
                  <FaChevronDown className={`text-xs transition-transform duration-200 ${showDesktopMoreMenu ? "rotate-180" : ""}`} />
                </button>

                {showDesktopMoreMenu && (
                  <div
                    className="absolute left-0 top-full z-30 mt-2 min-w-[260px] rounded-2xl border border-[var(--border-primary)] bg-[var(--nav-bg)] p-2 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out desktop-more-dropdown"
                    role="menu"
                  >
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = router.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowDesktopMoreMenu(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 ease-out ${
                            isActive ? "bg-[var(--accent-soft)] text-[var(--nav-active)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                          }`}
                        >
                          <Icon className="text-base" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-2">
            <div className="nav-icon-shell">
              <NotificationCenter />
            </div>
            <div className="relative" data-profile-menu-root="true">
              <button
                onClick={() => setShowProfileMenu((open) => !open)}
                className="avatar-chip"
                aria-label="Open account menu"
                aria-expanded={showProfileMenu}
              >
                <span className="avatar-chip__text">{userInitials}</span>
              </button>
              {showProfileMenu && (
                <div
                  ref={profileMenuRef}
                  className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-[var(--border-primary)] bg-[var(--nav-bg)] p-3 shadow-2xl backdrop-blur-xl"
                  role="dialog"
                  aria-label="Account menu"
                >
                  <div className="mb-3 border-b border-[var(--border-secondary)] pb-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || "Guest User"}</p>
                    <p className="text-xs text-[var(--text-muted)]">{userEmail}</p>
                  </div>
                  <Link
                    ref={profileMenuFirstActionRef}
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="mb-2 flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--bg-card-hover)]"
                  >
                    <RiUserLine aria-hidden="true" />
                    View Profile
                  </Link>
                  <div className="mb-2 flex min-h-[40px] items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)]">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-error)] transition-all duration-200 ease-out hover:bg-[var(--color-error-bg)]"
                  >
                    <FaSignOutAlt aria-hidden="true" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
        <div className="hidden h-1 bg-gradient-to-b from-[var(--border-primary)] to-transparent md:block" aria-hidden="true" />

        {/* Mobile Top Header */}
        <div
          className="sticky top-0 z-50 flex items-center justify-between px-3 py-3 md:hidden backdrop-blur-xl"
          style={{
            background: "var(--nav-bg)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="Navigate to Dashboard">
            <span className="ledgerly-logo-badge ledgerly-logo-badge--sm" role="img" aria-label="Ledgerly logo">💰</span>
          </Link>
          <span className="text-sm font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
            {currentPageLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="nav-icon-shell nav-icon-shell--mobile">
              <NotificationCenter />
            </div>
            <div className="relative" data-profile-menu-root="true">
              <button
                onClick={() => setShowProfileMenu((open) => !open)}
                className="avatar-chip avatar-chip--mobile"
                aria-label="Open account menu"
                aria-expanded={showProfileMenu}
              >
                <span className="avatar-chip__text">{userInitials}</span>
              </button>
              {showProfileMenu && (
                <div
                  ref={profileMenuRef}
                  className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-[var(--border-primary)] bg-[var(--nav-bg)] p-3 shadow-2xl backdrop-blur-xl"
                  role="dialog"
                  aria-label="Account menu"
                >
                  <div className="mb-3 border-b border-[var(--border-secondary)] pb-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || "Guest User"}</p>
                    <p className="text-xs text-[var(--text-muted)]">{userEmail}</p>
                  </div>
                  <Link
                    ref={profileMenuFirstActionRef}
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="mb-2 flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[var(--bg-card-hover)]"
                  >
                    <RiUserLine aria-hidden="true" />
                    View Profile
                  </Link>
                  <div className="mb-2 flex min-h-[40px] items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)]">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="flex min-h-[40px] w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-error)] transition-all duration-200 ease-out hover:bg-[var(--color-error-bg)]"
                  >
                    <FaSignOutAlt aria-hidden="true" />
                    Logout
                  </button>
                </div>
              )}
            </div>
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
          role="navigation"
          aria-label="Bottom navigation"
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2 backdrop-blur-xl md:hidden bottom-nav safe-area-padding"
          style={{
            background: "var(--nav-bg)",
            borderTop: "1px solid var(--border-primary)",
          }}
        >
          {[dashboardItem, transactionsItem, accountsItem, budgetItem].map((item) => {
            if (!item) return null;
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? "page" : undefined}
                className="group relative flex min-h-[48px] min-w-[50px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all duration-200 ease-out active:scale-95 tap-target"
                style={{ color: isActive ? "var(--nav-active)" : "var(--text-secondary)" }}
              >
                {isActive && <span className="nav-indicator-pill nav-indicator-pill--mobile" aria-hidden="true" />}
                <div
                  className={`rounded-lg p-1.5 transition-all duration-200 ease-out ${
                    isActive ? "bg-[var(--bg-card-hover)]" : "group-hover:bg-[var(--bg-card)]"
                  }`}
                >
                  <Icon className="text-lg" aria-hidden="true" />
                </div>
                <span className="text-center leading-tight whitespace-nowrap">{item.href === "/transactions" ? "Txns" : item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMoreMenu(true)}
            aria-label="Open more menu"
            className="flex min-h-[48px] min-w-[50px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-all duration-200 ease-out active:scale-95 tap-target"
          >
            <div className="rounded-lg p-1.5">
              <RiAppsLine className="text-lg" aria-hidden="true" />
            </div>
            <span className="text-center leading-tight whitespace-nowrap">More</span>
          </button>
        </nav>

        {/* More Menu Modal */}
        {showMoreMenu && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/70 md:items-center md:justify-center animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMoreMenu(false);
            }}
          >
            <div
              className="max-h-[82vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border-primary)] p-5 shadow-2xl backdrop-blur-xl md:max-w-md md:rounded-3xl animate-slideUp"
              style={{
                background:
                  theme === "dark"
                    ? "linear-gradient(160deg, rgba(6, 25, 55, 0.98), rgba(2, 15, 40, 0.98))"
                    : "linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(224, 242, 251, 0.98))",
              }}
            >
              <div
                className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--border-primary)]"
                onTouchStart={(event) => setTouchStartY(event.touches[0].clientY)}
                onTouchEnd={(event) => {
                  if (
                    touchStartY !== null &&
                    event.changedTouches[0].clientY - touchStartY > SWIPE_DISMISS_THRESHOLD
                  ) {
                    setShowMoreMenu(false);
                  }
                  setTouchStartY(null);
                }}
                aria-hidden="true"
              />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  More Navigation
                </h2>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-all duration-200 ease-out hover:rotate-90"
                  style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
                  aria-label="Close more menu"
                >
                  ✖
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={navSearch}
                  onChange={(event) => setNavSearch(event.target.value)}
                  placeholder="Search navigation..."
                  className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-[var(--accent-primary)]"
                  style={{ color: "var(--text-primary)" }}
                  aria-label="Search navigation items"
                />
              </div>

              {groupedMoreItems.map((group) =>
                group.items.length ? (
                  <section key={group.section} className="mb-4">
                    <h3 className="mb-2 px-1 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                      {group.section}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = router.pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowMoreMenu(false)}
                            className="flex min-h-[90px] transform flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                            style={{
                              background: isActive ? "var(--accent-primary)" : "var(--bg-card)",
                              borderColor: isActive ? "var(--accent-primary)" : "var(--border-primary)",
                              color: isActive ? "var(--text-inverse)" : "var(--text-primary)",
                              boxShadow: isActive ? "0 8px 24px rgba(56, 189, 248, 0.28)" : "none",
                            }}
                          >
                            <Icon className="text-2xl" aria-hidden="true" />
                            <span className="text-center text-xs font-bold leading-tight">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-4 h-px bg-[var(--border-primary)]" />
                  </section>
                ) : null
              )}

              {filteredMobileMoreItems.length === 0 && (
                <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No pages found for {navSearch}.
                </p>
              )}
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
                  ? "rgba(6, 20, 50, 0.97)"
                  : "rgba(255, 255, 255, 0.97)",
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-indigo-900/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-2xl relative shadow-xl border border-white/20 my-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-3 right-3 text-white hover:text-yellow-300 text-xl z-10"
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
