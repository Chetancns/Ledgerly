import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { getMe, updateMe } from '@/services/user';
import toast from 'react-hot-toast';
import NeumorphicInput from '@/components/NeumorphicInput';
import NeumorphicSelect from '@/components/NeumorphicSelect';
import { ISO_4217 } from '@/utils/iso4217';
import { useTheme } from '@/context/ThemeContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [form, setForm] = useState({
    name: '',
    email: '',
    currency: 'USD',
    currentPassword: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const validatePassword = (pwd: string): string[] => {
    if (!pwd) return [];
    const errors: string[] = [];
    if (pwd.length < 12) errors.push('At least 12 characters');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/\d/.test(pwd)) errors.push('One number');
    if (!/[@$!%*?&]/.test(pwd)) errors.push('One special character (@$!%*?&)');
    return errors;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getMe();
        setForm(f => ({
          ...f,
          name: me?.user?.name || '',
          email: me?.user?.email || '',
          currency: me?.user?.currency || 'USD',
        }));
      } catch (e) {
        // fallback to auth context
        setForm(f => ({
          ...f,
          name: user?.name || '',
          email: user?.email || '',
        }));
      }
    };
    load();
  }, [user]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        currency: form.currency,
      };
      if (form.password) {
        payload.password = form.password;
        if (form.currentPassword) payload.currentPassword = form.currentPassword;
      }
      const updated = await updateMe(payload);
      // Update form with latest persisted values & clear password fields
      setForm(f => ({
        ...f,
        name: updated?.name || '',
        email: updated?.email || '',
        currency: updated?.currency || f.currency,
        password: '',
        currentPassword: '',
      }));
      setPasswordErrors([]);
      toast.success('Profile updated');
      // Sync global auth context
      await refreshUser();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>User Profile</h1>
        <form onSubmit={onSubmit} className="space-y-6 backdrop-blur-xl p-6 rounded-3xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-lg)" }}>
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Name</label>
              <NeumorphicInput
                value={form.name}
                onChange={(v) => setForm(f => ({ ...f, name: v }))}
                placeholder="Your name"
                theme={theme}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Email</label>
              <NeumorphicInput
                value={form.email}
                onChange={(v) => setForm(f => ({ ...f, email: v }))}
                placeholder="you@example.com"
                type="email"
                theme={theme}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Currency</label>
              <NeumorphicSelect
                value={form.currency}
                onChange={(v) => setForm(f => ({ ...f, currency: v }))}
                options={ISO_4217}
                placeholder="Select currency"
                theme={theme}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold text-sm tracking-wide" style={{ color: "var(--text-secondary)" }}>Password (optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Current Password</label>
                <NeumorphicInput
                  value={form.currentPassword}
                  onChange={(v) => setForm(f => ({ ...f, currentPassword: v }))}
                  placeholder="••••••••"
                  type="password"
                  theme={theme}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>New Password</label>
                <div onFocus={() => setShowPasswordHints(true)} onBlur={() => setTimeout(() => setShowPasswordHints(false), 200)}>
                  <NeumorphicInput
                    value={form.password}
                    onChange={(v) => {
                      setForm(f => ({ ...f, password: v }));
                      setPasswordErrors(validatePassword(v));
                    }}
                    placeholder="Password (min 12 chars)"
                    type="password"
                    theme={theme}
                  />
                  {showPasswordHints && form.password && (
                    <div className="mt-2 text-xs space-y-1">
                      {passwordErrors.length > 0 ? (
                        <div className="rounded p-2" style={{ background: "var(--color-error-bg)", border: "1px solid var(--color-error)" }}>
                          <p className="font-semibold mb-1" style={{ color: "var(--color-error)" }}>Password must have:</p>
                          <ul className="list-disc list-inside" style={{ color: "var(--color-error)" }}>
                            {passwordErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="rounded p-2" style={{ background: "var(--color-success-bg)", border: "1px solid var(--color-success)" }}>
                          <p className="flex items-center gap-1" style={{ color: "var(--color-success)" }}>
                            <span>✓</span> Password meets all requirements
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {form.password && !form.currentPassword && (
              <p className="text-xs" style={{ color: "var(--color-warning)" }}>You did not enter current password — will overwrite if allowed.</p>
            )}
            {form.password && passwordErrors.length > 0 && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>Cannot save until password meets all requirements.</p>
            )}
          </section>

          <div className="pt-2">
            <button
              disabled={loading || (form.password ? passwordErrors.length > 0 : false)}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed transition"
              style={{ background: "var(--accent-primary)", color: "var(--text-inverse)", boxShadow: "var(--shadow-lg)" }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
