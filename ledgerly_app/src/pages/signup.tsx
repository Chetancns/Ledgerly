import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import router from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";

export default function Signup() {
  const { doSignup } = useAuth();
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
          //console.log("redirect called");
    router.push('/'); // redirects to index page
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
    //console.error("Sign up Failed");
    setError("Account creation failed. If the issue persists, contact support.");
    setTimeout(() => setError(null), 5000);
    }

return (
  <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 flex items-center justify-center px-4">
    {error && (
  <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50">
    {error}
  </div>
)}
    <div className="grid grid-cols-1 md:grid-cols-2 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl border border-white/20">
      
      {/* Left Panel: Branding */}
      <div className="hidden md:flex flex-col justify-center items-center p-10 text-white space-y-6 bg-gradient-to-br from-purple-800 to-indigo-800">
        <h1 className="text-4xl font-bold tracking-wide">Ledgerly</h1>
        <p className="text-lg text-white/80 text-center">
          Join Ledgerly and take control of your financial future.
        </p>
        {/* <img src="/logo.svg" alt="Ledgerly Logo" className="w-24 h-24" /> */}
      </div>

      {/* Right Panel: Signup Form */}
      <div className="p-8 md:p-12 bg-white/5">
        <h2 className="text-2xl font-semibold text-white mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          />
          <div>
            <input
              type="password"
              placeholder="Password (min 12 chars)"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onFocus={() => setShowPasswordHints(true)}
              onBlur={() => setTimeout(() => setShowPasswordHints(false), 200)}
              className={`w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 transition ${
                password && passwordErrors.length === 0 ? 'ring-2 ring-green-400' : 
                password && passwordErrors.length > 0 ? 'ring-2 ring-red-400' : 'focus:ring-yellow-300'
              }`}
            />
            {showPasswordHints && password && (
              <div className="mt-2 text-xs space-y-1">
                {passwordErrors.length > 0 ? (
                  <div className="bg-red-500/20 border border-red-400/30 rounded p-2">
                    <p className="font-semibold text-red-200 mb-1">Password must have:</p>
                    <ul className="list-disc list-inside text-red-200">
                      {passwordErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-500/20 border border-green-400/30 rounded p-2">
                    <p className="text-green-200 flex items-center gap-1">
                      <span>✓</span> Password meets all requirements
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-yellow-300 text-indigo-900 font-semibold rounded-lg hover:bg-yellow-400 transition"
          >
            Sign Up
          </button>
        </form>
        <p className="text-white/80 mt-6 text-sm text-center">
          Already have an account? <Link href="/login" className="underline text-yellow-300 hover:text-yellow-400">Log in</Link>
        </p>
      </div>
    </div>
  </div>
);

}