import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import router from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function Signup() {
  const { doSignup } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  // Validate password strength
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 12) errors.push("At least 12 characters");
    if (!/[a-z]/.test(pwd)) errors.push("One lowercase letter");
    if (!/[A-Z]/.test(pwd)) errors.push("One uppercase letter");
    if (!/\d/.test(pwd)) errors.push("One number");
    if (!/[@$!%*?&]/.test(pwd)) errors.push("One special character (@$!%*?&)");
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate password before submitting
    const errors = validatePassword(password);
    if (errors.length > 0) {
      toast.error("Password does not meet requirements");
      setShowPasswordHints(true);
      return;
    }
    
    try{
    const signupPromise =  doSignup(email, password, name);
    toast.promise(signupPromise, {
    loading: 'Creating your account... Hang tight, our free-tier backend may take a moment to wake up.',
    success: "Welcome aboard! Your account's ready—let's get started.",
    error: (err) => {
      // Extract error message from response
      const errorMessage = err?.response?.data?.message;
      if (Array.isArray(errorMessage)) {
        return errorMessage.join(', ');
      }
      return errorMessage || 'Signup failed. Please check your details and try again.';
    },
    });

    const success = await signupPromise;
    if (success) {
    router.push('/');
  } }catch (err: any) {
    console.error("Sign up failed:", err);
    const errorMessage = err?.response?.data?.message;
    if (errorMessage) {
      if (Array.isArray(errorMessage)) {
        setError(errorMessage.join('. '));
      } else {
        setError(errorMessage);
      }
      setTimeout(() => setError(null), 7000);
    }
    }
  };

    const showError = () =>{
    setError("Account creation failed. If the issue persists, contact support.");
    setTimeout(() => setError(null), 5000);
    }

return (
  <div 
    className="min-h-screen flex items-center justify-center px-4 py-6"
    style={{ background: "var(--ledgerly-grad)" }}
  >
    {/* Theme Toggle - Fixed Position */}
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
    
    {error && (
  <div 
    className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50 max-w-md text-center"
    style={{ backgroundColor: "var(--color-error)", color: "var(--text-inverse)" }}
  >
    {error}
  </div>
)}
    <div 
      className="grid grid-cols-1 md:grid-cols-2 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      
      {/* Left Panel: Branding */}
      <div 
        className="hidden md:flex flex-col justify-center items-center p-8 lg:p-10 space-y-6"
        style={{
          background: theme === 'dark' 
            ? "linear-gradient(to bottom right, rgba(88, 28, 135, 0.9), rgba(49, 46, 129, 0.9))"
            : "linear-gradient(to bottom right, rgba(124, 58, 237, 0.9), rgba(79, 70, 229, 0.9))",
        }}
      >
        <h1 className="text-3xl lg:text-4xl font-bold tracking-wide text-white">Ledgerly</h1>
        <p className="text-base lg:text-lg text-white/80 text-center">
          Join Ledgerly and take control of your financial future.
        </p>
      </div>

      {/* Right Panel: Signup Form */}
      <div className="p-6 md:p-8 lg:p-12" style={{ background: "var(--bg-card)" }}>
        <h2 
          className="text-xl md:text-2xl font-semibold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Create Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px]"
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px]"
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          />
          <div>
            <input
              type="password"
              placeholder="Password (min 12 chars)"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onFocus={() => setShowPasswordHints(true)}
              onBlur={() => setTimeout(() => setShowPasswordHints(false), 200)}
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px]"
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                border: password && passwordErrors.length === 0 
                  ? "2px solid var(--color-success)" 
                  : password && passwordErrors.length > 0 
                    ? "2px solid var(--color-error)" 
                    : "1px solid var(--input-border)",
              }}
            />
            {showPasswordHints && password && (
              <div className="mt-2 text-xs space-y-1">
                {passwordErrors.length > 0 ? (
                  <div 
                    className="rounded p-2"
                    style={{ 
                      backgroundColor: "var(--color-error-bg)", 
                      border: "1px solid var(--color-error)" 
                    }}
                  >
                    <p 
                      className="font-semibold mb-1"
                      style={{ color: "var(--color-error)" }}
                    >
                      Password must have:
                    </p>
                    <ul 
                      className="list-disc list-inside"
                      style={{ color: "var(--color-error)" }}
                    >
                      {passwordErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div 
                    className="rounded p-2"
                    style={{ 
                      backgroundColor: "var(--color-success-bg)", 
                      border: "1px solid var(--color-success)" 
                    }}
                  >
                    <p 
                      className="flex items-center gap-1"
                      style={{ color: "var(--color-success)" }}
                    >
                      <span>✓</span> Password meets all requirements
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 font-semibold rounded-lg transition min-h-[48px]"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--text-inverse)",
            }}
          >
            Sign Up
          </button>
        </form>
        <p 
          className="mt-6 text-sm text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Already have an account?{" "}
          <Link 
            href="/login" 
            className="underline hover:opacity-80"
            style={{ color: "var(--accent-primary)" }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  </div>
);

}
