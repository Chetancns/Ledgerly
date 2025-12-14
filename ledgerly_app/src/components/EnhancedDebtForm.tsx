// components/EnhancedDebtForm.tsx
import { useState, useEffect, FormEvent } from "react";
import { createDebt } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import { DebtRole } from "@/models/debt";
import toast from "react-hot-toast";

const FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
type Frequency = typeof FREQUENCIES[number];

export default function EnhancedDebtForm({ onCreated }: { onCreated: () => void }) {
  const today = new Date().toISOString().split("T")[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [role, setRole] = useState<DebtRole>("institutional");

  const [form, setForm] = useState({
    name: "",
    principalAmount: "",
    currentBalance: "",
    termMonths: "",
    installmentAmount: "",
    autoCalcInstallment: true,
    frequency: "monthly" as Frequency,
    startDate: today,
    nextDueDate: today,
    accountId: "",
    counterpartyName: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    const fetchAcc = async () => {
      try {
        const res = await getUserAccount();
        setAccounts(res);
      } catch (err) {
        console.error("Failed to load accounts", err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAcc();
  }, []);

  useEffect(() => {
    const p = Number(form.principalAmount);
    const term = Number(form.termMonths);
    if (!form.autoCalcInstallment || !p || !term || term <= 0) return;

    const multiplier = form.frequency === "monthly" ? 1 : form.frequency === "biweekly" ? 2 : 4;
    const paymentsCount = Math.max(1, Math.round(term * multiplier));
    const installment = +(p / paymentsCount).toFixed(2);
    setForm((prev) => ({ ...prev, installmentAmount: String(installment) }));
  }, [form.principalAmount, form.termMonths, form.frequency, form.autoCalcInstallment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAutoCalc = () =>
    setForm((prev) => ({ ...prev, autoCalcInstallment: !prev.autoCalcInstallment }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter a debt name");
      return;
    }
    if (!form.principalAmount || Number(form.principalAmount) <= 0) {
      toast.error("Enter a valid principal amount");
      return;
    }

    if ((role === "lent" || role === "borrowed") && !form.counterpartyName.trim()) {
      toast.error("Please enter the person's name");
      return;
    }

    if (role === "institutional" && !form.accountId) {
      toast.error("Please select an account");
      return;
    }

    const payload: any = {
      name: form.name,
      principal: form.principalAmount,
      role: role,
    };

    if (role === "lent" || role === "borrowed") {
      payload.counterpartyName = form.counterpartyName;
      payload.dueDate = form.dueDate || undefined;
      payload.notes = form.notes || undefined;
      payload.accountId = form.accountId || undefined;
    } else {
      payload.accountId = form.accountId;
      payload.frequency = form.frequency;
      payload.installmentAmount = form.installmentAmount;
      payload.currentBalance = form.currentBalance || form.principalAmount;
      payload.term = form.termMonths ? Number(form.termMonths) : undefined;
      payload.startDate = form.startDate;
      payload.nextDueDate = form.nextDueDate;
    }

    try {
      await toast.promise(createDebt(payload), {
        loading: "Creating debt...",
        success: "✅ Debt created successfully!",
        error: "Failed to create debt. Please try again.",
      });

      onCreated();
      setForm({
        name: "",
        principalAmount: "",
        currentBalance: "",
        termMonths: "",
        installmentAmount: "",
        autoCalcInstallment: true,
        frequency: "monthly",
        startDate: today,
        nextDueDate: today,
        accountId: "",
        counterpartyName: "",
        dueDate: "",
        notes: "",
      });
      setRole("institutional");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full p-6 md:p-10"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
    >
      <h2 className="text-2xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Add Debt
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Role Selector */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-secondary)" }}>
            Debt Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRole("lent")}
              className={`px-4 py-3 rounded-lg transition-all font-semibold ${
                role === "lent"
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              💰 I Lent
              <div className="text-xs font-normal mt-1 opacity-80">Owed to me</div>
            </button>
            <button
              type="button"
              onClick={() => setRole("borrowed")}
              className={`px-4 py-3 rounded-lg transition-all font-semibold ${
                role === "borrowed"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              💸 I Borrowed
              <div className="text-xs font-normal mt-1 opacity-80">I owe</div>
            </button>
            <button
              type="button"
              onClick={() => setRole("institutional")}
              className={`px-4 py-3 rounded-lg transition-all font-semibold ${
                role === "institutional"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              🏦 Institutional
              <div className="text-xs font-normal mt-1 opacity-80">Loan/Credit</div>
            </button>
          </div>
        </div>

        {/* Debt Name/Description */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {role === "institutional" ? "Debt Name" : "Description"}
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={
              role === "institutional" ? "e.g. Car Loan (Chase)" : "e.g. Loan to John for textbooks"
            }
            className="w-full px-3 py-2 rounded"
            style={{
              background: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          />
        </div>

        {/* Counterparty Name (for personal debts) */}
        {(role === "lent" || role === "borrowed") && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              {role === "lent" ? "Person who borrowed" : "Person I borrowed from"} *
            </label>
            <input
              name="counterpartyName"
              value={form.counterpartyName}
              onChange={handleChange}
              placeholder="Enter name"
              className="w-full px-3 py-2 rounded"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>
        )}

        {/* Principal/Amount */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {role === "institutional" ? "Principal" : "Amount"} *
          </label>
          <input
            name="principalAmount"
            value={form.principalAmount}
            onChange={handleChange}
            inputMode="decimal"
            placeholder="5000.00"
            className="w-full px-3 py-2 rounded"
            style={{
              background: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {role === "institutional"
              ? "Total loan amount"
              : role === "lent"
              ? "Amount you lent"
              : "Amount you borrowed"}
          </p>
        </div>

        {/* Due Date (for personal debts) or Account (for institutional) */}
        {role === "lent" || role === "borrowed" ? (
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Due Date (optional)
            </label>
            <input
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Current Balance
            </label>
            <input
              name="currentBalance"
              value={form.currentBalance}
              onChange={handleChange}
              inputMode="decimal"
              placeholder="Leave blank = Principal"
              className="w-full px-3 py-2 rounded"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>
        )}

        {/* Account */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            Account {role === "institutional" ? "*" : "(optional)"}
          </label>
          <select
            name="accountId"
            value={form.accountId}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded"
            style={{
              background: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          >
            <option value="">Select Account</option>
            {loadingAccounts ? (
              <option>Loading...</option>
            ) : (
              accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Notes (for personal debts) */}
        {(role === "lent" || role === "borrowed") && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Notes (optional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any terms or context..."
              rows={3}
              className="w-full px-3 py-2 rounded"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>
        )}

        {/* Institutional Debt Fields */}
        {role === "institutional" && (
          <>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Term (months)
              </label>
              <input
                name="termMonths"
                value={form.termMonths}
                onChange={handleChange}
                inputMode="numeric"
                placeholder="e.g. 60"
                className="w-full px-3 py-2 rounded"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Frequency
              </label>
              <select
                name="frequency"
                value={form.frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="autocalc"
                type="checkbox"
                checked={form.autoCalcInstallment}
                onChange={toggleAutoCalc}
                className="accent-yellow-300"
              />
              <label htmlFor="autocalc" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Auto-calc installment
              </label>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Installment Amount
              </label>
              <input
                name="installmentAmount"
                value={form.installmentAmount}
                onChange={handleChange}
                inputMode="decimal"
                disabled={form.autoCalcInstallment}
                placeholder="Auto-calculated"
                className="w-full px-3 py-2 rounded disabled:opacity-50"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Start Date
              </label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Next Due Date
              </label>
              <input
                name="nextDueDate"
                type="date"
                value={form.nextDueDate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--input-text)",
                  border: "1px solid var(--input-border)",
                }}
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="md:col-span-2 mt-4">
          <button
            type="submit"
            className="w-full px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            style={{ background: "var(--color-success)", color: "#fff" }}
          >
            ➕ Add Debt
          </button>
        </div>
      </form>
    </div>
  );
}
