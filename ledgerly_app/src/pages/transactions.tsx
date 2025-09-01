import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import TransactionForm from "../components/TransactionForm";
import AiInput from "../components/AiInput";
import { getTransactions } from "../services/transactions";
import { Transaction } from "@/models/Transaction";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = async () => {
    const res = await getTransactions();
    setTransactions(res.data);
  };

  useEffect(() => { load(); }, []);

 return (
  <Layout>
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2">
      <div className=" mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Transactions</h1>
        <TransactionForm onCreated={load} />
<div className=" rounded-2xl shadow-2xl  bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-4 px-4">
  
        <ul className="space-y-4 px-4">
  {transactions.map((t, i) => (
    <li
      key={i}
      className="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center"
    >
      <div>
        <p className="font-semibold text-gray-800">₹{t.amount}</p>
        <p className="text-m text-green-800">{t.description}</p>
      </div>
      <span className="text-m text-blue-600 font-medium">({t.type})</span>
    </li>
  ))}
</ul></div>

      </div>
    </div>
  </Layout>
);
}