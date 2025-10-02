import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";


export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name?: string }>({});
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        console.log("User", JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse user:", err);
      }
    }
  }, []);

  const logout = () => {
  localStorage.clear();
  setUser({});
  router.push("/login");
};


  return (

      <><Head>
      <title>💰 Ledgerly - Budget with Style </title>
    </Head><div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <nav className="bg-indigo-800 text-white p-4 flex flex-wrap items-center gap-2 md:gap-4">
  {/* Branded App Name */}
  <span className="text-lg md:text-2xl font-extrabold tracking-wide text-white drop-shadow-sm w-full md:w-auto">
    💰 Ledgerly 
  </span>

  <div className="flex flex-wrap gap-2 md:gap-4 text-sm md:text-base">
    <Link href="/" className="font-extrabold hover:underline">Dashboard</Link>
    <Link href="/transactions" className="font-extrabold hover:underline">Transactions</Link>
    <Link href="/accounts" className="font-extrabold hover:underline">Accounts</Link>
    <Link href="/categories" className="font-extrabold hover:underline">Categories</Link>
    <Link href="/budgets" className="font-extrabold hover:underline">Budget</Link>
    <Link href="/debts" className="font-extrabold hover:underline">Debts</Link> 
  </div>

  <div className="ml-auto flex items-center gap-2">
    <span className="font-extrabold text-sm md:text-base">{user.name || "Guest"}</span>
    <button
      onClick={logout}
      className="bg-red-600 font-extrabold hover:bg-red-800 px-3 py-1 rounded text-sm md:text-base"
    >
      Logout
    </button>
  </div>
</nav>
        <main>{children}</main>
      </div></>
  );
}