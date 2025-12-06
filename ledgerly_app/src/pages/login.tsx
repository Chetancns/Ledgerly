import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
    
  const { doLogin } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
    try {
  const loginPromise = doLogin(email, password);
  
  toast.promise(loginPromise, {
    loading: 'Loading... Please wait, we are using a free tier backend which may take some time to wake up.',
    success: "You're in. Let's get started!",
    error: "Login didn't go through. Let's double-check your details.",
  });

  const user = await loginPromise;

  if (user) {
    router.push('/');
  } 
} catch (err: unknown) {
  console.error("Login failed:", err);
}
  };
  
  const showError = () =>{
    setError("Login unsuccessful. Double-check your email and password.");
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
    className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50"
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
          Track your expenses. Budget smarter. Own your future.
        </p>
      </div>

      {/* Right Panel: Login Form */}
      <div className="p-6 md:p-8 lg:p-12" style={{ background: "var(--bg-card)" }}>
        <h2 
          className="text-xl md:text-2xl font-semibold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Log In
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition min-h-[48px]"
            style={{
              backgroundColor: "var(--input-bg)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
            }}
          />
          <button
            type="submit"
            className="w-full py-3 font-semibold rounded-lg transition min-h-[48px]"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--text-inverse)",
            }}
          >
            Log In
          </button>
        </form>
        <p 
          className="mt-6 text-sm text-center"
          style={{ color: "var(--text-muted)" }}
        >
          New to Ledgerly?{" "}
          <Link 
            href="/signup" 
            className="underline hover:opacity-80"
            style={{ color: "var(--accent-primary)" }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  </div>
);

}
