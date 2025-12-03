import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  getUserAccount,
  createAccount,
  onDeleteAccount,
  updateAccount,
} from "../services/accounts";
import { Account, AccountType } from "../models/account";
import { TrashIcon } from "@heroicons/react/24/solid";
import ConfirmModal from "@/components/ConfirmModal";
import toast, { Toaster } from "react-hot-toast";
import NeumorphicSelect from "@/components/NeumorphicSelect";
import NeumorphicInput from "@/components/NeumorphicInput";
import ModernButton from "@/components/NeumorphicButton";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const accountTypes: AccountType[] = [
    "bank",
    "cash",
    "credit_card",
    "wallet",
    "savings",
  ];
  const accountLabels: Record<AccountType, string> = {
    bank: "Bank",
    cash: "Cash",
    credit_card: "Credit Card",
    wallet: "Wallet",
    savings: "Savings",
  };

  const load = async () => {
    const res = await getUserAccount();
    setAccounts(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (name.trim() === "") {
        toast.error("Account name is required!");
        return;
      }
      if (isNaN(Number(balance))) {
        toast.error("Balance must be a valid number!");
        return;
      }if(type.trim() === "") {
        toast.error("Account type is required!");
        return;
      }
      if (editingId) {
        await updateAccount(editingId, { name, type, balance });
        toast.success("Account updated successfully!");
        setEditingId(null);
        setShowModal(false);
      } else {
        await createAccount({ name, type, balance });
        toast.success("Account added!");
      }
      setName("");
      setType("bank");
      setBalance("");
      await load();
    } catch (err) {
      toast.error("Something went wrong!");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteAccount(id);
      toast.success("Account deleted");
      await load();
    } catch (err) {
      console.error("Account delete failed", err);
      toast.error("Delete failed. Please try again.");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openModal = (account: Account) => {
    setEditingId(account.id);
    setName(account.name ?? "");
    setType(account.type ?? "bank" );
    setBalance(account.balance !== undefined ? account.balance.toString() : "");
    setShowModal(true);
  };

  const onCancel = () => {
    setShowModal(false);
    setEditingId(null);
    setName("");
    setType("bank");
    setBalance("");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 py-5 px-4">
        {/* <div className="mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8"> */}
          <h1 className="text-3xl font-bold text-white mb-6">Accounts</h1>

          {/* Form for adding new accounts */}
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 mb-6 p-4 rounded-xl"
          >
            <h2 className="md:col-span-2 text-xl font-semibold text-white mb-2">
              Add New Account
            </h2>
            <span className="md:col-span-2">
              <NeumorphicInput
              value={name}
              onChange={setName}
              placeholder="Account Name"
              theme={theme}
              type="text"
            />
            </span>
            
            <NeumorphicInput
              value={balance}
              onChange={setBalance}
              placeholder="Balance"
              theme={theme}
              type="number"
            />
            <NeumorphicSelect
            value={type}
            onChange={(val) => setType(val as AccountType)}
            options={accountTypes.map((acct) => ({
              value: acct,
              label: accountLabels[acct],
            }))}
            theme={theme}
            placeholder="Select Account Type"
            />
            <ModernButton
              type="submit"
              color="indigo-600"
              variant="solid"
              theme={theme}
            >Add Account</ModernButton>
            <ModernButton
              onClick={onCancel}
              color="gray-600"
              variant="solid"
              theme={theme}
              type="button"
            >
              Cancel
            </ModernButton>
          </form>

          {/* Accounts list */}
          <ul className="space-y-3">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="bg-white/20 p-4 rounded-lg flex justify-between items-center"
              >
                <span className="text-white font-semibold">
                  {a.name} ({accountLabels[a.type ?? "bank"]}) with Balance : {a.balance}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(a)}
                    className="text-yellow-400 hover:text-yellow-600 transition-transform hover:scale-110"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(a.id)}
                    className="text-red-600 hover:text-red-800 transition-transform hover:scale-110"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      {/*</div>

      {/* Modal for editing */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 w-full max-w-md">
            <h2 className="text-white text-xl font-bold mb-4">Edit Account</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <NeumorphicInput
              value={name}
              onChange={setName}
              placeholder="Account Name"
              theme={theme}
              type="text"
              />
              {/*<select
                className="p-2 rounded-lg text-black"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
              >
                {accountTypes.map((acct) => (
                  <option key={acct} value={acct}>
                    {accountLabels[acct]}
                  </option>
                ))}
              </select>*/}
              <NeumorphicSelect
            value={type}
            onChange={(val) => setType(val as AccountType)}
            options={accountTypes.map((acct) => ({
              value: acct,
              label: accountLabels[acct],
            }))}
            placeholder="Select Account Type"
            theme={theme}
          />
              <NeumorphicInput
                value={balance}
                onChange={setBalance}
                placeholder="Balance"
                theme={theme}
                type="number"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-800 flex-1"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-700 flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Account"
        description="Delete this account? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="red-500"
        loading={false}
        onConfirm={() => handleDelete(deleteConfirm!)}
        onClose={() => setDeleteConfirm(null)}
      />
    </Layout>
  );
}