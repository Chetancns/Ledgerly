import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import router from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, X } from "lucide-react";

export default function Signup() {
  const { doSignup } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameError("");
    setEmailError("");
    
    // Validate fields
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email");
      return;
    }
    
    const errors = validatePassword(password);
    if (errors.length > 0) {
      toast.error("Password does not meet requirements");
      setShowPasswordHints(true);
      return;
    }
    
    try {
      setIsLoading(true);
      const signupPromise = doSignup(email, password, name);
      toast.promise(signupPromise, {
        loading: 'Creating your account... ⏳',
        success: "Welcome aboard! Let's manage your finances! 💰",
        error: (err) => {
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
      }
    } catch (err: any) {
      console.error("Sign up failed:", err);
      const errorMessage = err?.response?.data?.message;
      setError(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-6 relative overflow-hidden"
      style={{ background: "var(--ledgerly-grad)" }}
    >
      {/* Animated background elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        }}
      />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        }}
      />

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {error && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg animate-fade-in-out z-50 flex items-center gap-2 max-w-md text-center"
          style={{ backgroundColor: "var(--color-error)", color: "var(--text-inverse)" }}
        >
          <span>⚠️</span>
          {error}
        </div>
      )}

      <div className="relative z-10 w-full max-w-5xl">
        <div 
          className="grid grid-cols-1 md:grid-cols-2 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border"
          style={{
            background: theme === 'dark'
              ? "rgba(17, 24, 39, 0.8)"
              : "rgba(255, 255, 255, 0.9)",
            borderColor: "var(--border-primary)",
          }}
        >
          
          {/* Left Panel: Branding with Animation */}
          <div 
            className="hidden md:flex flex-col justify-center items-center p-8 lg:p-10 space-y-8 relative overflow-hidden"
            style={{
              background: theme === 'dark' 
                ? "linear-gradient(135deg, rgba(88, 28, 135, 0.95), rgba(49, 46, 129, 0.95))"
                : "linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(79, 70, 229, 0.95))",
            }}
          >
            <div className="space-y-6 text-center">
              <div className="text-6xl font-bold text-white animate-bounce">💰</div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">Ledgerly</h1>
              <p className="text-lg text-white/90 leading-relaxed">
                Start your journey to financial freedom and smart money management
              </p>
              
              <div className="space-y-4 pt-8">
                <div className="flex items-center gap-3 text-white/80">
                  <span className="text-2xl">📊</span>
                  <span>Real-time insights</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <span className="text-2xl">🎯</span>
                  <span>Smart budget goals</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <span className="text-2xl">🏷️</span>
                  <span>Organize with tags</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Signup Form */}
          <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center" style={{ background: "var(--bg-card)" }}>
            <div className="space-y-2 mb-8">
              <h2 
                className="text-3xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Create Account
              </h2>
              <p 
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Join thousands managing finances smarter
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label 
                  htmlFor="name"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Full Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError("");
                    }}
                    className={`w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px] ${
                      nameError ? "ring-2 ring-red-500" : ""
                    }`}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      color: "var(--input-text)",
                      borderColor: nameError ? "#ef4444" : "var(--input-border)",
                      border: `1px solid ${nameError ? "#ef4444" : "var(--input-border)"}`,
                    }}
                  />
                </div>
                {nameError && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>{nameError}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label 
                  htmlFor="email"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    className={`w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px] ${
                      emailError ? "ring-2 ring-red-500" : ""
                    }`}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      color: "var(--input-text)",
                      borderColor: emailError ? "#ef4444" : "var(--input-border)",
                      border: `1px solid ${emailError ? "#ef4444" : "var(--input-border)"}`,
                    }}
                  />
                </div>
                {emailError && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>{emailError}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label 
                  htmlFor="password"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      handlePasswordChange(e.target.value);
                    }}
                    onFocus={() => setShowPasswordHints(true)}
                    onBlur={() => setTimeout(() => setShowPasswordHints(false), 200)}
                    className={`w-full pl-12 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px]`}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      color: "var(--input-text)",
                      border: password && passwordErrors.length === 0 
                        ? "2px solid #10b981" 
                        : password && passwordErrors.length > 0 
                          ? "2px solid #ef4444" 
                          : "1px solid var(--input-border)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Requirements */}
                {showPasswordHints && password && (
                  <div className="mt-2 text-xs space-y-1">
                    {passwordErrors.length > 0 ? (
                      <div 
                        className="rounded p-3 space-y-2"
                        style={{ 
                          backgroundColor: "rgba(239, 68, 68, 0.1)", 
                          border: "1px solid rgba(239, 68, 68, 0.3)" 
                        }}
                      >
                        <p 
                          className="font-semibold"
                          style={{ color: "#ef4444" }}
                        >
                          Password needs:
                        </p>
                        <ul className="space-y-1">
                          {passwordErrors.map((err, i) => (
                            <li key={i} className="flex items-center gap-2" style={{ color: "#ef4444" }}>
                              <X size={14} />
                              {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div 
                        className="rounded p-3"
                        style={{ 
                          backgroundColor: "rgba(16, 185, 129, 0.1)", 
                          border: "1px solid rgba(16, 185, 129, 0.3)" 
                        }}
                      >
                        <p 
                          className="flex items-center gap-2"
                          style={{ color: "#10b981" }}
                        >
                          <Check size={14} /> Password is strong!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 font-semibold rounded-lg transition min-h-[48px] flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-70"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--text-inverse)",
                }}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⌛</span>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
              <span 
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}
              >
                Already have an account?
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
            </div>

            {/* Sign In Link */}
            <Link 
              href="/login" 
              className="w-full py-3 font-semibold rounded-lg transition min-h-[48px] border flex items-center justify-center gap-2 hover:shadow-lg"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--accent-primary)",
                backgroundColor: "transparent",
              }}
            >
              Sign In
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
