import Link from "next/link";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-indigo-800 text-white p-4 flex gap-4">
      <Link href="/">Dashboard</Link>
      <Link href="/transactions">Transactions</Link>
    </nav>
    <main className="">{children}</main>
  </div>
);
}
