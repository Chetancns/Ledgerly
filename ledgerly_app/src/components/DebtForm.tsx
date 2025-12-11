// components/DebtForm.tsx
import { useState, useEffect, FormEvent } from "react";
import { createDebt } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import NeumorphicInput from "./NeumorphicInput";
import NeumorphicSelect from "./NeumorphicSelect";
import ModernButton from "./NeumorphicButton";
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";

// If you have a shared Frequency type, import instead.
// For safety we define the const here:
const FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
type Frequency = typeof FREQUENCIES[number];
const isFrequency = (v: any): v is Frequency => FREQUENCIES.includes(v);

export default function DebtForm({ onCreated }: { onCreated: () => void }) {
  const { theme } = useTheme();
  const today = new Date().toISOString().split("T")[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [form, setForm] = useState({
    name: "",
    principalAmount: "",    // original loan amount
    currentBalance: "",     // remaining balance (defaults to principal)
    termMonths: "",         // optional term in months
    installmentAmount: "",  // will be auto-filled if autoCalc=true
    autoCalcInstallment: true,
    frequency: "monthly" as Frequency,
    startDate: today,
    nextDueDate: today,
    accountId: "",
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

  // auto-calc installment when principal/term/frequency/autoCalc change
  useEffect(() => {
    const p = Number(form.principalAmount);
    const term = Number(form.termMonths);
    if (!form.autoCalcInstallment) return;
    if (!p || !term || term <= 0) {
      // not enough info to calculate
      return;
    }

    // compute number of payments depending on frequency
    // simple approximation: monthly -> term months, biweekly -> 2 payments/month, weekly -> 4 payments/month
    const multiplier = form.frequency === "monthly" ? 1 : form.frequency === "biweekly" ? 2 : 4;
    const paymentsCount = Math.max(1, Math.round(term * multiplier));

    const installment = +(p / paymentsCount).toFixed(2);
    setForm((prev) => ({ ...prev, installmentAmount: String(installment) }));
  }, [form.principalAmount, form.termMonths, form.frequency, form.autoCalcInstallment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    // checkbox handled differently below (none here)
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAutoCalc = () =>
    setForm((prev) => ({ ...prev, autoCalcInstallment: !prev.autoCalcInstallment }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validations
    if (!form.name.trim()) return alert("Please enter a debt name");
    if (!form.accountId) return alert("Please select an Account");
    if (!form.principalAmount || Number(form.principalAmount) <= 0) return alert("Enter a valid principal amount");
    if (!form.currentBalance) {
      setForm((prev) => ({ ...prev, currentBalance: prev.principalAmount }));
    }

    if (!isFrequency(form.frequency)) return alert("Invalid frequency");

    // Map form fields to backend payload
    // Backend expects numeric values; we send numbers.
    const payload: any = {
      name: form.name,
      accountId: form.accountId,
      frequency: form.frequency,
      installmentAmount: Number(form.installmentAmount) || 0,
      currentBalance: Number(form.currentBalance) || Number(form.principalAmount) || 0,
      principal: Number(form.principalAmount) || 0,
      term: form.termMonths ? Number(form.termMonths) : undefined,
      startDate: form.startDate,
      nextDueDate: form.nextDueDate,
    };

    try {
      await createDebt(payload);
      onCreated();
      // reset
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
      });
    } catch (err) {
      console.error(err);
      alert("Failed to create debt: " + String(err));
    }
  };

  return (
    <div 
      className="backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full p-2 md:p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
    >
      <h2 className="text-2xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add Debt</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Debt name */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Debt Name</label>
          <NeumorphicInput 
            value={form.name} 
            onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
            placeholder="e.g. Car Loan (Chase)"
            type="text"
          />
        </div>

        {/* Account */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Account</label>
          <NeumorphicSelect 
            value={form.accountId} 
            onChange={(v) => setForm((prev) => ({ ...prev, accountId: v }))}
            options={loadingAccounts ? [] : accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type})` }))}
            placeholder={loadingAccounts ? "Loading..." : "Select Account"}
          />
        </div>

        {/* Principal */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Principal (original amount)</label>
          <NeumorphicInput 
            value={form.principalAmount} 
            onChange={(v) => setForm((prev) => ({ ...prev, principalAmount: v }))}
            placeholder="5000.00" 
            type="number"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Total loan amount when issued. Used to compute installments if Term is provided.</p>
        </div>

        {/* Current balance */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Current balance (remaining)</label>
          <NeumorphicInput 
            value={form.currentBalance} 
            onChange={(v) => setForm((prev) => ({ ...prev, currentBalance: v }))}
            placeholder="Leave blank to set = Principal" 
            type="number"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>What you still owe now. Defaults to Principal if empty.</p>
        </div>

        {/* Term months */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Term (months)</label>
          <NeumorphicInput 
            value={form.termMonths} 
            onChange={(v) => setForm((prev) => ({ ...prev, termMonths: v }))}
            placeholder="e.g. 60" 
            type="number"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Optional. If provided and auto-calc is ON, installment is calculated as Principal / (term × frequency multiplier).</p>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Frequency</label>
          <NeumorphicSelect 
            value={form.frequency} 
            onChange={(v) => setForm((prev) => ({ ...prev, frequency: v as Frequency }))}
            options={FREQUENCIES.map(f => ({ value: f, label: f }))}
            placeholder="Select Frequency"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Payment cadence (weekly / biweekly / monthly).</p>
        </div>

        {/* Auto-calc toggle */}
        <div className="flex items-center gap-3">
          <input id="autocalc" type="checkbox" checked={form.autoCalcInstallment} onChange={toggleAutoCalc}
            className="accent-yellow-300" />
          <label htmlFor="autocalc" className="text-sm" style={{ color: "var(--text-secondary)" }}>Auto-calc installment from Principal & Term</label>
        </div>

        {/* Installment amount */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Installment amount</label>
          <NeumorphicInput 
            value={form.installmentAmount} 
            onChange={(v) => setForm((prev) => ({ ...prev, installmentAmount: v }))}
            placeholder="e.g. 250.00" 
            type="number"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Amount to pay each period. Auto-filled when Auto-calc is on and Term is provided.</p>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Start date (loan start)</label>
          <NeumorphicInput 
            value={form.startDate} 
            onChange={(v) => setForm((prev) => ({ ...prev, startDate: v }))}
            type="date"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>The date loan started or when payments begin.</p>
        </div>

        {/* Next Due Date */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Next due date</label>
          <NeumorphicInput 
            value={form.nextDueDate} 
            onChange={(v) => setForm((prev) => ({ ...prev, nextDueDate: v }))}
            type="date"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Next scheduled payment date. Defaults to Start date but you can change it.</p>
        </div>

        {/* submit */}
        <div className="md:col-span-2">
          <ModernButton 
            type="submit" 
            color="indigo-600" 
            variant="solid" 
            size="lg"
            fullWidth
          >
            Add Debt
          </ModernButton>
        </div>
      </form>
    </div>
  );
}
