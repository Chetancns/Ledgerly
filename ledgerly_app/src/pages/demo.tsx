import { useState } from "react";
import Head from "next/head";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider, useNotifications } from "@/context/NotificationContext";
import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";
import NotificationCenter from "@/components/NotificationCenter";
import OnboardingModal from "@/components/OnboardingModal";
import ThemeToggle from "@/components/ThemeToggle";
import Tooltip, { InfoTooltip } from "@/components/Tooltip";
import SkipLink from "@/components/SkipLink";
import AccessibleInput from "@/components/AccessibleInput";
import AccessibleSelect from "@/components/AccessibleSelect";
import { useTheme } from "@/context/ThemeContext";

function DemoContent() {
  const { addNotification, notifications, unreadCount } = useNotifications();
  const { startOnboarding, isComplete } = useOnboarding();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");

  const triggerNotifications = () => {
    addNotification({
      type: "budget_limit",
      title: "Budget Warning",
      message: "You've reached 95% of your groceries budget for this month.",
      actionUrl: "/budgets",
    });

    setTimeout(() => {
      addNotification({
        type: "debt_reminder",
        title: "Payment Due Soon",
        message: "Credit card payment is due in 3 days.",
        actionUrl: "/debts",
      });
    }, 1000);

    setTimeout(() => {
      addNotification({
        type: "recurring_payment",
        title: "Upcoming Payment",
        message: "Netflix subscription will be charged tomorrow.",
        actionUrl: "/recurring",
      });
    }, 2000);
  };

  return (
    <>
      <Head>
        <title>Ledgerly - Feature Demo</title>
      </Head>

      <SkipLink />

      <div
        className="min-h-screen"
        style={{
          background: "var(--ledgerly-grad)",
          color: "var(--text-primary)",
        }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-50 backdrop-blur-md"
          style={{
            background: "var(--nav-bg)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
            <h1 className="text-2xl font-bold">💰 Ledgerly Demo</h1>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main id="main-content" className="container mx-auto px-4 py-8" role="main">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Welcome Section */}
            <section
              className="p-6 rounded-2xl"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Welcome to Ledgerly Feature Demo! 🎉
              </h2>
              <p className="text-lg mb-4" style={{ color: "var(--text-secondary)" }}>
                This demo showcases the new accessibility, notification, and onboarding features.
              </p>
            </section>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Notifications Demo */}
              <section
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Notifications System 🔔
                  </h3>
                  <InfoTooltip content="Smart notifications for budgets, debts, and recurring payments" />
                </div>
                <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                  Get alerts when you reach budget limits, have upcoming debt payments, or recurring charges.
                </p>
                <div className="space-y-2 mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
                  <p>• Unread notifications: {unreadCount}</p>
                  <p>• Total notifications: {notifications.length}</p>
                </div>
                <button
                  onClick={triggerNotifications}
                  className="w-full px-4 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    backgroundColor: "var(--accent-primary)",
                    color: "var(--text-inverse)",
                  }}
                  aria-label="Trigger demo notifications"
                >
                  Trigger Demo Notifications
                </button>
              </section>

              {/* Onboarding Demo */}
              <section
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    User Onboarding 👋
                  </h3>
                  <InfoTooltip content="Interactive tour for new users with keyboard navigation" />
                </div>
                <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                  New users get a guided tour of key features with skip and keyboard navigation support.
                </p>
                <div className="space-y-2 mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
                  <p>• Status: {isComplete ? "Completed ✓" : "Not started"}</p>
                  <p>• Keyboard: ESC to skip, ← → to navigate</p>
                </div>
                <button
                  onClick={startOnboarding}
                  className="w-full px-4 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    backgroundColor: "var(--accent-primary)",
                    color: "var(--text-inverse)",
                  }}
                  aria-label="Start onboarding tour"
                >
                  Start Onboarding Tour
                </button>
              </section>

              {/* Accessibility Demo */}
              <section
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Accessibility Features ♿
                  </h3>
                  <InfoTooltip content="WCAG AA compliant with full keyboard navigation" />
                </div>
                <ul className="space-y-2 mb-4" style={{ color: "var(--text-secondary)" }}>
                  <li>✓ ARIA labels and roles</li>
                  <li>✓ Keyboard navigation (Tab, Enter, ESC)</li>
                  <li>✓ Focus indicators (3px outlines)</li>
                  <li>✓ Screen reader support</li>
                  <li>✓ Skip to main content link</li>
                  <li>✓ WCAG AA color contrast</li>
                </ul>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Try pressing Tab to navigate through the page!
                </p>
              </section>

              {/* Tooltips Demo */}
              <section
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Contextual Tooltips 💡
                  </h3>
                  <InfoTooltip content="Hover or focus on elements to see helpful tips" />
                </div>
                <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                  Tooltips provide contextual help throughout the application.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <Tooltip content="This is a tooltip on top!" position="top">
                    <button
                      className="px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: "var(--bg-card-hover)",
                        border: "1px solid var(--border-primary)",
                      }}
                    >
                      Hover me (top)
                    </button>
                  </Tooltip>
                  <Tooltip content="This tooltip appears on the right!" position="right">
                    <button
                      className="px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: "var(--bg-card-hover)",
                        border: "1px solid var(--border-primary)",
                      }}
                    >
                      Hover me (right)
                    </button>
                  </Tooltip>
                </div>
              </section>
            </div>

            {/* Accessible Form Demo */}
            <section
              className="p-6 rounded-2xl"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Accessible Form Components 📝
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <AccessibleInput
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  hint="We'll never share your email"
                  required
                  placeholder="your@email.com"
                />
                <AccessibleSelect
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: "food", label: "Food & Dining" },
                    { value: "transport", label: "Transportation" },
                    { value: "utilities", label: "Utilities" },
                  ]}
                  required
                  hint="Select a spending category"
                />
              </div>
            </section>

            {/* Mobile Responsiveness Note */}
            <section
              className="p-6 rounded-2xl"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Mobile Responsive Design 📱
              </h3>
              <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                All components are optimized for mobile devices:
              </p>
              <ul className="space-y-2" style={{ color: "var(--text-secondary)" }}>
                <li>✓ Touch-friendly tap targets (min 44x44px)</li>
                <li>✓ Responsive layouts for 320px, 375px, 768px, 1024px</li>
                <li>✓ Mobile-first navigation</li>
                <li>✓ Optimized for touch interactions</li>
              </ul>
            </section>
          </div>
        </main>

        {/* Onboarding Modal */}
        <OnboardingModal />
      </div>
    </>
  );
}

export default function Demo() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <OnboardingProvider>
          <DemoContent />
        </OnboardingProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
