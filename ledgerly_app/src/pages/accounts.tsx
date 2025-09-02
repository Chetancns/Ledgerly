import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getUserAccount, createAccount, onDeleteAccount } from "../services/accounts";
import { Account,AccountType } from "../models/account";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [balance, setBalance] = useState("");
  const accountTypes: AccountType[] = ['bank', 'cash', 'credit_card', 'wallet', 'savings'];
const accountLabels: Record<AccountType, string> = {
  bank: 'Bank',
  cash: 'Cash',
  credit_card: 'Credit Card',
  wallet: 'Wallet',
  savings: 'Savings',
};

  const load = async () => {
    const res = await getUserAccount();
    setAccounts(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAccount({ name, type, balance });
    setName("");
    setType("bank");
    setBalance("");
    await load();
  };

  const handleDelete = async (id: string) => {
    await onDeleteAccount(id);
    await load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-2">
        <div className="mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Accounts</h1>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 mb-6 bg-white/10 p-4 rounded-xl"
          >
            <input
              className="p-2 rounded-lg"
              placeholder="Account Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
  className="p-2 rounded-lg"
  value={type}
  onChange={(e) => setType(e.target.value as AccountType)}
>
  {accountTypes.map((acct) => (
    <option key={acct} value={acct}>
      {accountLabels[acct]}
    </option>
  ))}
</select>

            <input
              className="p-2 rounded-lg"
              placeholder="Balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-800"
            >
              Add Account
            </button>
          </form>

          {/* Accounts list */}
          <ul className="space-y-3">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="bg-white/20 p-4 rounded-lg flex justify-between items-center"
              >
                <span className="text-white font-semibold">
                  {a.name} ({a.type}) – ₹{a.balance}
                </span>
                <button
  onClick={() => handleDelete(a.id)}
  className="text-red-600 hover:text-red-800 transition-transform hover:scale-110"
  title="Delete"
>
  <TrashIcon className="h-5 w-5" />

</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
