// pages/debts.tsx
import EnhancedDebtForm from "@/components/EnhancedDebtForm";
import EnhancedDebtList from "@/components/EnhancedDebtList";
import SplitwiseStyleDebtView from "@/components/SplitwiseStyleDebtView";
import Layout from "@/components/Layout";
import { useState } from "react";

export default function DebtsPage() {
  const [refresh, setRefresh] = useState(0);
  const [viewMode, setViewMode] = useState<"standard" | "splitwise">("standard");

  return (
    <Layout>
        <div 
          className="mx-auto backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          {/* Header with View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Debt Management</h1>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("standard")}
                className={`px-4 py-2 rounded-md transition-all ${
                  viewMode === "standard"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📋 Standard View
              </button>
              <button
                onClick={() => setViewMode("splitwise")}
                className={`px-4 py-2 rounded-md transition-all ${
                  viewMode === "splitwise"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                👥 People View
              </button>
            </div>
          </div>

          {/* Add Debt Form - Only show in standard view */}
          {viewMode === "standard" && (
            <EnhancedDebtForm onCreated={() => setRefresh(refresh + 1)} />
          )}

          {/* Content based on view mode */}
          <div 
            className="mt-8 rounded-2xl shadow-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          >
            {viewMode === "standard" ? (
              <EnhancedDebtList key={refresh} />
            ) : (
              <SplitwiseStyleDebtView key={refresh} />
            )}
          </div>
        </div>
    </Layout>
  );

}
