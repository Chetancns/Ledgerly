import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import router from "next/router";
import Link from "next/link";

export default function Signup() {
  const { doSignup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try{
    const success = await doSignup(email, password, name);
    if (success) {
          console.log("redirect called");
    router.push('/'); // redirects to index page
  }  else {
    showError();
  }}catch (err: unknown) {
    showError();
    }
  };

    const showError = () =>{
    console.error("Sign up Failed");
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition"
          />
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