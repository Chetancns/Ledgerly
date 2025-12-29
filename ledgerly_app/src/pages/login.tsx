import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Login() {
    
  const { doLogin } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setEmailError("");
      setPasswordError("");

      // Validation
      if (!email) {
        setEmailError("Email is required");
        return;
      }
      if (!validateEmail(email)) {
        setEmailError("Please enter a valid email");
        return;
      }
      if (!password) {
        setPasswordError("Password is required");
        return;
      }
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        return;
      }

    try {
      setIsLoading(true);
      const loginPromise = doLogin(email, password);
      
      toast.promise(loginPromise, {
        loading: 'Waking up the free-tier backend... ⏳',
        success: "Welcome back! Let's manage those finances! 💰",
        error: "Hmm, that didn't work. Check your details and try again.",
      });

      const user = await loginPromise;

      if (user) {
        router.push('/');
      } 
    } catch (err: unknown) {
      console.error("Login failed:", err);
      setError("Login unsuccessful. Please try again.");
      setTimeout(() => setError(null), 5000);
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
        className="fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg animate-fade-in-out z-50 flex items-center gap-2"
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
              Take control of your finances with intelligent budgeting and expense tracking
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

        {/* Right Panel: Login Form */}
        <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center" style={{ background: "var(--bg-card)" }}>
          <div className="space-y-2 mb-8">
            <h2 
              className="text-3xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Welcome Back
            </h2>
            <p 
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Sign in to manage your finances
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  className={`w-full pl-12 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px] ${
                    passwordError ? "ring-2 ring-red-500" : ""
                  }`}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    color: "var(--input-text)",
                    borderColor: passwordError ? "#ef4444" : "var(--input-border)",
                    border: `1px solid ${passwordError ? "#ef4444" : "var(--input-border)"}`,
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
              {passwordError && (
                <p className="text-xs" style={{ color: "#ef4444" }}>{passwordError}</p>
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
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
              New to Ledgerly?
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
          </div>

          {/* Sign Up Link */}
          <Link 
            href="/signup" 
            className="w-full py-3 font-semibold rounded-lg transition min-h-[48px] border flex items-center justify-center gap-2 hover:shadow-lg"
            style={{
              borderColor: "var(--border-primary)",
              color: "var(--accent-primary)",
              backgroundColor: "transparent",
            }}
          >
            Create Account
            <ArrowRight size={18} />
          </Link>

          {/* Demo Login */}
          {/* <button
            type="button"
            onClick={() => {
              setEmail("demo@ledgerly.com");
              setPassword("demo123");
            }}
            className="w-full mt-3 py-2 text-sm font-medium rounded-lg transition opacity-70 hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            Try Demo Account
          </button> */}
        </div>
      </div>
    </div>
  </div>
);

}
