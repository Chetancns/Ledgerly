// pages/debts.tsx
import DebtForm from "@/components/DebtForm";
import DebtList from "@/components/DebtList";
import Layout from "@/components/Layout";
import { useState } from "react";

export default function DebtsPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <Layout>
      {/* <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2"> */}
        <div className="mx-auto bg-white/6 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 w-full">
          <h1 className="text-3xl font-bold text-white mb-6">Debt Management</h1>

          <DebtForm onCreated={() => setRefresh(refresh + 1)} />

          <div className="mt-8 rounded-2xl shadow-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-6">
            <DebtList key={refresh} />
          </div>
        </div>
      {/* </div> */}
    </Layout>
  );

}
