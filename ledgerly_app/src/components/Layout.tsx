import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";


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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-800 text-white p-4 flex gap-4">
        <Link href="/">Dashboard</Link>
        <Link href="/transactions">Transactions</Link>
        <Link href="/accounts">Accounts</Link>
        <Link href="/categories">Categories</Link>
        <span className="ml-auto font-semibold">{user.name || "Guest"}</span>
        <button onClick={logout} className="ml-4 bg-red-600 hover:bg-red-700 px-3 py-1 rounded">
  Logout
</button>

      </nav>
      <main>{children}</main>
    </div>
  );
}