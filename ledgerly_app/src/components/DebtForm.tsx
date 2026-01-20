// components/DebtForm.tsx
import { useState, useEffect, FormEvent } from "react";
import { createDebt, getPersonNameSuggestions } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { getCategories } from "@/services/category";
import { Account } from "@/models/account";
import { Category } from "@/models/category";
import { DEBT_TYPES, DebtType } from "@/models/debt";

// If you have a shared Frequency type, import instead.
// For safety we define the const here:
const FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
type Frequency = typeof FREQUENCIES[number];
const isFrequency = (v: any): v is Frequency => FREQUENCIES.includes(v);

export default function DebtForm({ onCreated }: { onCreated: () => void }) {
  const today = new Date().toISOString().split("T")[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [personNameSuggestions, setPersonNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [form, setForm] = useState({
    name: "",
    debtType: "institutional" as DebtType,
    personName: "",
    principalAmount: "",    // original loan amount
    currentBalance: "",     // remaining balance (defaults to principal)
    termMonths: "",         // optional term in months
    installmentAmount: "",  // will be auto-filled if autoCalc=true
    autoCalcInstallment: true,
    frequency: "monthly" as Frequency,
    startDate: today,
    nextDueDate: today,
    reminderDate: "",       // When to remind about payment (for P2P debts)
    accountId: "",
    createTransaction: false,
    categoryId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          getUserAccount(),
          getCategories(),
        ]);
        setAccounts(accountsRes);
        setCategories(categoriesRes);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchData();
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
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const loadPersonNameSuggestions = async (search?: string) => {
    try {
      const suggestions = await getPersonNameSuggestions(search);
      // Ensure suggestions is an array
      if (Array.isArray(suggestions)) {
        setPersonNameSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        setPersonNameSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
      setPersonNameSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handlePersonNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, personName: value }));
    await loadPersonNameSuggestions(value || undefined);
  };

  const handlePersonNameFocus = async () => {
    // Load all suggestions when focused
    await loadPersonNameSuggestions();
  };

  const selectPersonName = (name: string) => {
    setForm((prev) => ({ ...prev, personName: name }));
    setShowSuggestions(false);
  };

  const toggleAutoCalc = () =>
    setForm((prev) => ({ ...prev, autoCalcInstallment: !prev.autoCalcInstallment }));

  const toggleCreateTransaction = () =>
    setForm((prev) => ({ ...prev, createTransaction: !prev.createTransaction }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validations
    if (!form.name.trim()) return alert("Please enter a debt name");
    if (!form.accountId) return alert("Please select an Account");
    if (!form.principalAmount || Number(form.principalAmount) <= 0) return alert("Enter a valid principal amount");
    if ((form.debtType === 'borrowed' || form.debtType === 'lent') && !form.personName.trim()) {
      return alert("Please enter the person's name for borrowed/lent debts");
    }
    if (form.createTransaction && !form.categoryId) {
      return alert("Please select a category for the transaction");
    }
    if (!form.currentBalance) {
      setForm((prev) => ({ ...prev, currentBalance: prev.principalAmount }));
    }

    if (!isFrequency(form.frequency)) return alert("Invalid frequency");

    // Map form fields to backend payload
    const payload: any = {
      name: form.name,
      debtType: form.debtType,
      personName: form.personName || undefined,
      accountId: form.accountId,
      frequency: form.frequency,
      installmentAmount: Number(form.installmentAmount) || 0,
      currentBalance: Number(form.currentBalance) || Number(form.principalAmount) || 0,
      principal: Number(form.principalAmount) || 0,
      term: form.termMonths ? Number(form.termMonths) : undefined,
      startDate: form.startDate,
      nextDueDate: form.nextDueDate,
      reminderDate: form.reminderDate || undefined,
      createTransaction: form.createTransaction,
      categoryId: form.categoryId || undefined,
    };

    try {
      await createDebt(payload);
      onCreated();
      // reset
      setForm({
        name: "",
        debtType: "institutional",
        personName: "",
        principalAmount: "",
        currentBalance: "",
        termMonths: "",
        installmentAmount: "",
        autoCalcInstallment: true,
        frequency: "monthly",
        startDate: today,
        nextDueDate: today,
        reminderDate: "",
        accountId: "",
        createTransaction: false,
        categoryId: "",
      });
    } catch (err) {
      console.error(err);
      alert("Failed to create debt: " + String(err));
    }
  };

  return (
    <div 
      className="backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full p-6 md:p-10"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
    >
      <h2 className="text-2xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add Debt</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Debt Type */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Debt Type</label>
          <select name="debtType" value={form.debtType} onChange={handleChange}
            className="w-full px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}>
            {DEBT_TYPES.map(t => (
              <option key={t} value={t}>
                {t === 'institutional' ? 'Institutional (Loan/Credit Card)' : 
                 t === 'borrowed' ? 'Borrowed (I owe someone)' : 
                 'Lent (Someone owes me)'}
              </option>
            ))}
          </select>
        </div>

        {/* Person Name (shown for borrowed/lent) */}
        {(form.debtType === 'borrowed' || form.debtType === 'lent') && (
          <div className="md:col-span-2 relative">
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Person Name
            </label>
            <input
              name="personName"
              value={form.personName}
              onChange={handlePersonNameChange}
              onFocus={handlePersonNameFocus}
              onBlur={() => {
                // Delay hiding suggestions to allow click events to register
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Enter person's name"
              className="w-full px-3 py-2 rounded"
              style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
            />
            {showSuggestions && personNameSuggestions.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 rounded shadow-lg max-h-40 overflow-y-auto"
                style={{
                  // Use a denser backdrop so suggestions stay legible
                  background: "var(--bg-card-solid, rgba(20,24,28,0.95))",
                  border: "2px solid var(--accent-primary)",
                  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.55)"
                }}
              >
                {personNameSuggestions.map((name, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      // Use onMouseDown instead of onClick to fire before onBlur
                      e.preventDefault();
                      selectPersonName(name);
                    }}
                    className="px-3 py-2 cursor-pointer transition-colors"
                    style={{ 
                      color: "var(--text-primary)",
                      background: "transparent"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Debt name */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            Debt Description
          </label>
          <input name="name" value={form.name} onChange={handleChange}
            placeholder={form.debtType === 'institutional' ? "e.g. Car Loan (Chase)" : "e.g. Emergency loan"}
            className="w-full px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
        </div>

        {/* Account */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Account</label>
          <select name="accountId" value={form.accountId} onChange={handleChange}
            className="w-full px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}>
            <option value="">Select Account</option>
            {loadingAccounts ? <option>Loading...</option> : accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
        </div>

        {/* Principal */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {form.debtType === 'institutional' ? 'Principal (original amount)' : 'Total Amount'}
          </label>
          <input name="principalAmount" value={form.principalAmount} onChange={handleChange}
            inputMode="decimal" placeholder="5000.00" className="w-full px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {form.debtType === 'institutional' 
              ? 'Total loan amount when issued. Used to compute installments if Term is provided.' 
              : 'Total amount borrowed or lent. You can make flexible payments of any amount.'}
          </p>
        </div>

        {/* Current balance */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Current balance (remaining)</label>
          <input name="currentBalance" value={form.currentBalance} onChange={handleChange}
            inputMode="decimal" placeholder="Leave blank to set = Principal" className="w-full px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>What you still owe now. Defaults to Principal if empty.</p>
        </div>

        {/* Institutional debt fields (term, frequency, installment) */}
        {form.debtType === 'institutional' && (
          <>
            {/* Term months */}
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Term (months)</label>
              <input name="termMonths" value={form.termMonths} onChange={handleChange}
                inputMode="numeric" placeholder="e.g. 60" className="w-full px-3 py-2 rounded"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Optional. If provided and auto-calc is ON, installment is calculated as Principal / (term × frequency multiplier).</p>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Frequency</label>
              <select name="frequency" value={form.frequency} onChange={handleChange}
                className="w-full px-3 py-2 rounded"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
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
              <input name="installmentAmount" value={form.installmentAmount} onChange={handleChange}
                inputMode="decimal" placeholder="e.g. 250.00" className="w-full px-3 py-2 rounded"
                style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Amount to pay each period. Auto-filled when Auto-calc is on and Term is provided.</p>
            </div>
          </>
        )}

        {/* P2P debt note */}
        {(form.debtType === 'borrowed' || form.debtType === 'lent') && (
          <div className="md:col-span-2 p-3 rounded" style={{ background: "var(--bg-card-hover)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              💡 For {form.debtType} debts, you can make flexible payments of any amount at any time. No need to set installments or frequency.
            </p>
          </div>
        )}

        {/* Start Date */}
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Start date</label>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange}
            className="w-full px-3 py-2 rounded"
            style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {form.debtType === 'institutional' ? 'The date loan started or when payments begin.' : 'The date this debt was created.'}
          </p>
        </div>

        {/* Next Due Date - only for institutional */}
        {form.debtType === 'institutional' && (
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Next due date</label>
            <input type="date" name="nextDueDate" value={form.nextDueDate} onChange={handleChange}
              className="w-full px-3 py-2 rounded"
              style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Next scheduled payment date. Defaults to Start date but you can change it.</p>
          </div>
        )}

        {/* Reminder Date - only for P2P debts */}
        {(form.debtType === 'borrowed' || form.debtType === 'lent') && (
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              {form.debtType === 'borrowed' ? 'Payment Reminder Date' : 'Collection Reminder Date'}
            </label>
            <input type="date" name="reminderDate" value={form.reminderDate} onChange={handleChange}
              className="w-full px-3 py-2 rounded"
              style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }} />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {form.debtType === 'borrowed' 
                ? 'When to remind yourself to send payment.' 
                : 'When to remind yourself to collect payment.'}
            </p>
          </div>
        )}

        {/* Create Transaction */}
        <div className="md:col-span-2 flex items-center gap-3">
          <input
            id="createTransaction"
            type="checkbox"
            checked={form.createTransaction}
            onChange={toggleCreateTransaction}
            className="accent-yellow-300"
          />
          <label htmlFor="createTransaction" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Create transaction for this {form.debtType === 'lent' ? 'lending' : 'borrowing'} (expense)
          </label>
        </div>

        {/* Category (shown when createTransaction is true) */}
        {form.createTransaction && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Transaction Category
            </label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded"
              style={{ background: "var(--input-bg)", color: "var(--input-text)", border: "1px solid var(--input-border)" }}
            >
              <option value="">Select Category</option>
              {categories
                .filter(c => c.type === 'expense')
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Category for the expense transaction (money going out)
            </p>
          </div>
        )}

        {/* submit */}
        <div className="md:col-span-2">
          <button type="submit" className="w-full py-3 font-semibold rounded" style={{ background: "var(--accent-primary)", color: "var(--text-inverse)" }}>
            Add Debt
          </button>
        </div>
      </form>
    </div>
  );
}
