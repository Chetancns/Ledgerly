// pages/debts.tsx
import DebtForm from "@/components/DebtForm";
import DebtList from "@/components/DebtList";
import Layout from "@/components/Layout";
import { useState } from "react";

export default function DebtsPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <Layout>
        <div 
          className="mx-auto backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Debt Management</h1>

          <DebtForm onCreated={() => setRefresh(refresh + 1)} />

          <div 
            className="mt-8 rounded-2xl shadow-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            <DebtList key={refresh} />
          </div>
        </div>
    </Layout>
  );

}
