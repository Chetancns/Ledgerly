// components/DebtForm.tsx
import { useState, useEffect, FormEvent } from "react";
import { createDebt } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";

// If you have a shared Frequency type, import instead.
// For safety we define the const here:
const FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
type Frequency = typeof FREQUENCIES[number];
const isFrequency = (v: any): v is Frequency => FREQUENCIES.includes(v);

export default function DebtForm({ onCreated }: { onCreated: () => void }) {
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
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full border border-white/30 p-6 md:p-10">
      <h2 className="text-2xl font-semibold text-white mb-4">Add Debt</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Debt name */}
        <div className="md:col-span-2">
          <label className="block text-sm text-white/90 mb-1">Debt Name</label>
          <input name="name" value={form.name} onChange={handleChange}
            placeholder="e.g. Car Loan (Chase)"
            className="w-full px-3 py-2 rounded bg-white/10 text-white" />
        </div>

        {/* Account */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Account</label>
          <select name="accountId" value={form.accountId} onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-white/10 text-white">
            <option className="text-black" value="">Select Account</option>
            {loadingAccounts ? <option>Loading...</option> : accounts.map(a => (
              <option className="text-black" key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
        </div>

        {/* Principal */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Principal (original amount)</label>
          <input name="principalAmount" value={form.principalAmount} onChange={handleChange}
            inputMode="decimal" placeholder="5000.00" className="w-full px-3 py-2 rounded bg-white/10 text-white" />
          <p className="text-xs text-white/60 mt-1">Total loan amount when issued. Used to compute installments if Term is provided.</p>
        </div>

        {/* Current balance */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Current balance (remaining)</label>
          <input name="currentBalance" value={form.currentBalance} onChange={handleChange}
            inputMode="decimal" placeholder="Leave blank to set = Principal" className="w-full px-3 py-2 rounded bg-white/10 text-white" />
          <p className="text-xs text-white/60 mt-1">What you still owe now. Defaults to Principal if empty.</p>
        </div>

        {/* Term months */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Term (months)</label>
          <input name="termMonths" value={form.termMonths} onChange={handleChange}
            inputMode="numeric" placeholder="e.g. 60" className="w-full px-3 py-2 rounded bg-white/10 text-white" />
          <p className="text-xs text-white/60 mt-1">Optional. If provided and auto-calc is ON, installment is calculated as Principal / (term × frequency multiplier).</p>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Frequency</label>
          <select name="frequency" value={form.frequency} onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-white/10 text-white">
            {FREQUENCIES.map(f => <option className="text-black" key={f} value={f}>{f}</option>)}
          </select>
          <p className="text-xs text-white/60 mt-1">Payment cadence (weekly / biweekly / monthly).</p>
        </div>

        {/* Auto-calc toggle */}
        <div className="flex items-center gap-3">
          <input id="autocalc" type="checkbox" checked={form.autoCalcInstallment} onChange={toggleAutoCalc}
            className="accent-yellow-300" />
          <label htmlFor="autocalc" className="text-sm text-white/90">Auto-calc installment from Principal & Term</label>
        </div>

        {/* Installment amount */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Installment amount</label>
          <input name="installmentAmount" value={form.installmentAmount} onChange={handleChange}
            inputMode="decimal" placeholder="e.g. 250.00" className="w-full px-3 py-2 rounded bg-white/10 text-white" />
          <p className="text-xs text-white/60 mt-1">Amount to pay each period. Auto-filled when Auto-calc is on and Term is provided.</p>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Start date (loan start)</label>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-white/10 text-white" />
          <p className="text-xs text-white/60 mt-1">The date loan started or when payments begin.</p>
        </div>

        {/* Next Due Date */}
        <div>
          <label className="block text-sm text-white/90 mb-1">Next due date</label>
          <input type="date" name="nextDueDate" value={form.nextDueDate} onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-white/10 text-white" />
          <p className="text-xs text-white/60 mt-1">Next scheduled payment date. Defaults to Start date but you can change it.</p>
        </div>

        {/* submit */}
        <div className="md:col-span-2">
          <button type="submit" className="w-full py-3 bg-yellow-300 text-indigo-900 font-semibold rounded">
            Add Debt
          </button>
        </div>
      </form>
    </div>
  );
}
