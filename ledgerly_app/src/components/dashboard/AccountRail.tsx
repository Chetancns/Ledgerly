import { Account } from "@/models/account";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiBankCardLine,
  RiBankLine,
  RiEyeLine,
  RiEyeOffLine,
  RiSafe2Line,
  RiWallet3Line,
} from "react-icons/ri";
import type { IconType } from "react-icons";
import { useState } from "react";

const accountTypeMeta: Record<string, { icon: IconType; accent: string }> = {
  bank: { icon: RiBankLine, accent: "var(--color-info)" },
  cash: { icon: RiWallet3Line, accent: "var(--color-success)" },
  credit_card: { icon: RiBankCardLine, accent: "var(--color-warning)" },
  savings: { icon: RiSafe2Line, accent: "var(--color-success)" },
  wallet: { icon: RiWallet3Line, accent: "var(--accent-primary)" },
};

function formatAccountType(type?: string) {
  if (!type) return "Unknown";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AccountRail({
  accounts,
  totalBalance,
  hideBalances,
  visibleAccountIds,
  onToggleHideBalances,
  onToggleAccountVisibility,
  formatBalance,
}: {
  accounts: Account[];
  totalBalance: number;
  hideBalances: boolean;
  visibleAccountIds: string[];
  onToggleHideBalances: () => void;
  onToggleAccountVisibility: (accountId: string) => void;
  formatBalance: (value: number) => string;
}) {
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const featuredAccounts = accounts.slice(0, 5);
  const overflowAccounts = accounts.slice(5);

  return (
    <motion.section
      whileHover={{ y: -2, boxShadow: "var(--shadow-lg)" }}
      className="dashboard-surface overflow-hidden p-4 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="dashboard-section-heading">
            <h2 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">Total balances</h2>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Scan every account quickly, then drill into the ones you want to reveal.
          </p>
          <p className="mt-4 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            {hideBalances ? "••••••" : formatBalance(totalBalance)}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleHideBalances}
          className="dashboard-filter-pill inline-flex items-center justify-center gap-2 self-start"
          aria-pressed={hideBalances}
        >
          {hideBalances ? <RiEyeLine className="text-base" /> : <RiEyeOffLine className="text-base" />}
          <span>{hideBalances ? "Reveal balances" : "Mask balances"}</span>
        </button>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {featuredAccounts.map((account) => {
          const meta = accountTypeMeta[account.type || "wallet"] || accountTypeMeta.wallet;
          const Icon = meta.icon;
          const isVisible = !hideBalances || visibleAccountIds.includes(account.id);

          return (
            <div
              key={account.id}
              className="min-w-[250px] flex-1 rounded-2xl border bg-[var(--bg-card-hover)]/80 p-4 backdrop-blur-xl"
              style={{
                borderColor: "var(--border-secondary)",
                borderLeftColor: meta.accent,
                borderLeftWidth: "3px",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="text-lg" style={{ color: meta.accent }} />
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {account.name || "Untitled account"}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{formatAccountType(account.type)}</p>
                </div>
                {hideBalances && (
                  <button
                    type="button"
                    onClick={() => onToggleAccountVisibility(account.id)}
                    className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]"
                    aria-pressed={isVisible}
                    aria-label={isVisible ? `Hide ${account.name} balance` : `Show ${account.name} balance`}
                  >
                    {isVisible ? <RiEyeOffLine className="text-sm" /> : <RiEyeLine className="text-sm" />}
                  </button>
                )}
              </div>
              <p className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
                {isVisible ? formatBalance(Number(account.balance || 0)) : "••••••"}
              </p>
            </div>
          );
        })}

        {overflowAccounts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAllAccounts((current) => !current)}
            className="min-w-[160px] rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-card)]/80 p-4 text-left backdrop-blur-xl transition hover:bg-[var(--bg-card-hover)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Overflow</p>
            <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">+{overflowAccounts.length} more</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {showAllAccounts ? "Hide account drawer" : "Open detailed list"}
            </p>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showAllAccounts && overflowAccounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {overflowAccounts.map((account) => {
                const meta = accountTypeMeta[account.type || "wallet"] || accountTypeMeta.wallet;
                const Icon = meta.icon;
                const isVisible = !hideBalances || visibleAccountIds.includes(account.id);

                return (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-card-hover)]/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="text-base" style={{ color: meta.accent }} />
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {account.name || "Untitled account"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatAccountType(account.type)}</p>
                      </div>
                      {hideBalances && (
                        <button
                          type="button"
                          onClick={() => onToggleAccountVisibility(account.id)}
                          className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] p-2 text-[var(--text-secondary)]"
                        >
                          {isVisible ? <RiEyeOffLine className="text-sm" /> : <RiEyeLine className="text-sm" />}
                        </button>
                      )}
                    </div>
                    <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                      {isVisible ? formatBalance(Number(account.balance || 0)) : "••••••"}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
