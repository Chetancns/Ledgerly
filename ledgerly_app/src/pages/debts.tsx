// pages/debts.tsx
import DebtForm from "@/components/DebtForm";
import DebtList from "@/components/DebtList";
import Layout from "@/components/Layout";
import { useState } from "react";

export default function DebtsPage() {
  const [refresh, setRefresh] = useState(0);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  return (
    <Layout>
        <div 
          className="mx-auto backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Debt Management</h1>

          {/* Collapsible Form Section */}
          <div className="mb-6">
            <button
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all mb-4"
              style={{ 
                background: "var(--accent-secondary)", 
                color: "#fff",
                fontWeight: "600"
              }}
            >
              <span>{isFormCollapsed ? '▶' : '▼'}</span>
              <span>{isFormCollapsed ? 'Show' : 'Hide'} Debt Form</span>
            </button>

            {!isFormCollapsed && (
              <div className="transition-all">
                <DebtForm onCreated={() => setRefresh(refresh + 1)} />
              </div>
            )}
          </div>

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
