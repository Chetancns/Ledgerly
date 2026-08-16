import SegmentedControl from "@/components/SegmentedControl";
import { Account } from "@/models/account";
import { useMemo, useState } from "react";
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine, RiCalendarLine, RiFilter3Line } from "react-icons/ri";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function FilterToolbar({
  selectedMonth,
  selectedYear,
  selectedAccount,
  accounts,
  onMonthChange,
  onYearChange,
  onAccountChange,
}: {
  selectedMonth: number;
  selectedYear: number;
  selectedAccount: string;
  accounts: Account[];
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onAccountChange: (accountId: string) => void;
}) {
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [periodYear, setPeriodYear] = useState(selectedYear);

  const accountOptions = useMemo(
    () => [{ value: "all", label: "All accounts" }, ...accounts.map((account) => ({
      value: account.id,
      label: account.name || "Untitled account",
    }))],
    [accounts]
  );

  const selectedAccountLabel =
    accountOptions.find((option) => option.value === selectedAccount)?.label || "All accounts";

  const useSegmentedAccountPicker = accountOptions.length <= 4;

  return (
    <div className="dashboard-surface sticky top-20 z-20 p-3 sm:top-24 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Filters</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Change the period or narrow the dashboard to a single account.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPeriodYear(selectedYear);
                setShowPeriodPicker((current) => !current);
                setShowAccountPicker(false);
              }}
              className="dashboard-filter-pill inline-flex w-full items-center justify-between gap-2 lg:w-auto"
            >
              <span className="inline-flex items-center gap-2">
                <RiCalendarLine className="text-base" />
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
              <RiArrowDownSLine className="text-lg" />
            </button>

            {showPeriodPicker && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[280px] rounded-3xl border border-[var(--border-primary)] bg-[var(--nav-bg)] p-4 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPeriodYear((year) => year - 1)}
                    className="rounded-full border border-[var(--border-primary)] p-2 text-[var(--text-secondary)]"
                  >
                    <RiArrowLeftSLine className="text-lg" />
                  </button>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{periodYear}</p>
                  <button
                    type="button"
                    onClick={() => setPeriodYear((year) => year + 1)}
                    className="rounded-full border border-[var(--border-primary)] p-2 text-[var(--text-secondary)]"
                  >
                    <RiArrowRightSLine className="text-lg" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((monthLabel, index) => {
                    const isSelected = selectedMonth === index + 1 && selectedYear === periodYear;
                    return (
                      <button
                        key={monthLabel}
                        type="button"
                        onClick={() => {
                          onMonthChange(index + 1);
                          onYearChange(periodYear);
                          setShowPeriodPicker(false);
                        }}
                        className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                          isSelected
                            ? "bg-[var(--accent-soft)] text-[var(--nav-active)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        {monthLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {useSegmentedAccountPicker ? (
            <SegmentedControl
              options={accountOptions}
              value={selectedAccount}
              onChange={onAccountChange}
              size="sm"
              className="min-w-[260px]"
            />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAccountPicker((current) => !current);
                  setShowPeriodPicker(false);
                }}
                className="dashboard-filter-pill inline-flex w-full items-center justify-between gap-2 lg:min-w-[220px]"
              >
                <span className="inline-flex items-center gap-2">
                  <RiFilter3Line className="text-base" />
                  {selectedAccountLabel}
                </span>
                <RiArrowDownSLine className="text-lg" />
              </button>

              {showAccountPicker && (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[280px] rounded-3xl border border-[var(--border-primary)] bg-[var(--nav-bg)] p-3 shadow-2xl backdrop-blur-xl">
                  <div className="space-y-1">
                    {accountOptions.map((option) => {
                      const isSelected = option.value === selectedAccount;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onAccountChange(option.value);
                            setShowAccountPicker(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? "bg-[var(--accent-soft)] text-[var(--nav-active)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                          }`}
                        >
                          <span>{option.label}</span>
                          {isSelected && <span className="text-xs font-semibold">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
