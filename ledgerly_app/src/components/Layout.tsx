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
      <title>💰 Ledgerly </title>
    </Head><div className="min-h-screen bg-gray-50">
        <nav className="bg-indigo-800 text-white p-4 flex items-center gap-4">
           {/* Branded App Name */}
          <span className="text-2xl font-extrabold tracking-wide text-white drop-shadow-sm">
            💰 Ledgerly - Budget with Style  
          </span>

          <Link href="/" className="font-extrabold hover:underline" >Dashboard</Link>
          <Link href="/transactions" className="font-extrabold hover:underline">Transactions</Link>
          <Link href="/accounts" className="font-extrabold hover:underline">Accounts</Link>
          <Link href="/categories" className="font-extrabold hover:underline">Categories</Link>
          <Link href="/budgets"  className="font-extrabold hover:underline">Budget</Link>
          <span className="ml-auto font-extrabold">{user.name || "Guest"}</span>
          <button onClick={logout} className="ml-4 bg-red-600 font-extrabold hover:bg-red-800 px-3 py-1 rounded transition duration-200">
            Logout
          </button>

        </nav>
        <main>{children}</main>
      </div></>
  );
}