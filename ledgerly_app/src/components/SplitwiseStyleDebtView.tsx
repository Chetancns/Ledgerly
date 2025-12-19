// components/SplitwiseStyleDebtView.tsx
// Splitwise-inspired UI for debt management
import { useEffect, useState, useMemo } from "react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Debt } from "@/models/debt";
import { getUserDebts } from "@/services/debts";
import { batchRepayment } from "@/services/debts";
import { getUserAccount } from "@/services/accounts";
import { Account } from "@/models/account";
import toast from "react-hot-toast";

interface PersonBalance {
  name: string;
  youOwe: number;
  theyOwe: number;
  netBalance: number;
  debts: Debt[];
}

export default function SplitwiseStyleDebtView() {
  const { format } = useCurrencyFormatter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [view, setView] = useState<"people" | "groups">("people");
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    loadDebts();
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await getUserAccount();
      setAccounts(res);
    } catch (error) {
      console.error("Failed to load accounts", error);
    }
  };

  const loadDebts = async () => {
    setLoading(true);
    try {
      const res = await getUserDebts();
      setDebts(res.filter(d => d.status !== 'settled')); // Only show unsettled
    } catch (error) {
      toast.error("Failed to load debts");
    } finally {
      setLoading(false);
    }
  };

  // Calculate per-person balances
  const peopleBalances = useMemo(() => {
    const balanceMap = new Map<string, PersonBalance>();

    debts.forEach((debt) => {
      const person = debt.counterpartyName;
      if (!person) return;

      if (!balanceMap.has(person)) {
        balanceMap.set(person, {
          name: person,
          youOwe: 0,
          theyOwe: 0,
          netBalance: 0,
          debts: [],
        });
      }

      const balance = balanceMap.get(person)!;
      balance.debts.push(debt);

      const remaining = parseFloat(debt.currentBalance);

      if (debt.role === "borrowed") {
        balance.youOwe += remaining;
      } else if (debt.role === "lent") {
        balance.theyOwe += remaining;
      }
    });

    // Calculate net balance
    balanceMap.forEach((balance) => {
      balance.netBalance = balance.theyOwe - balance.youOwe;
    });

    return Array.from(balanceMap.values()).sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }, [debts]);

  // Calculate per-group balances
  const groupBalances = useMemo(() => {
    const groupMap = new Map<string, { name: string; total: number; debts: Debt[] }>();

    debts.forEach((debt) => {
      const group = debt.settlementGroupId || "No Group";
      if (!groupMap.has(group)) {
        groupMap.set(group, { name: group, total: 0, debts: [] });
      }
      const groupData = groupMap.get(group)!;
      groupData.debts.push(debt);
      const remaining = parseFloat(debt.currentBalance);
      groupData.total += debt.role === "lent" ? remaining : -remaining;
    });

    return Array.from(groupMap.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [debts]);

  const handleSettleWithPerson = async (person: string) => {
    const balance = peopleBalances.find(p => p.name === person);
    if (!balance) return;

    // Get all debts for this person that need settlement
    const debtsToSettle = balance.debts.filter(d => parseFloat(d.currentBalance) > 0);
    if (debtsToSettle.length === 0) {
      toast.error("No debts to settle");
      return;
    }

    if (!accounts || accounts.length === 0) {
      toast.error("Please create an account first");
      return;
    }

    const total = debtsToSettle.reduce((sum, d) => sum + parseFloat(d.currentBalance), 0);

    try {
      await toast.promise(
        batchRepayment({
          debtIds: debtsToSettle.map(d => d.id),
          amount: total.toFixed(2),
          date: new Date().toISOString().split('T')[0],
          accountId: accounts[0].id,
        }),
        {
          loading: `Settling ${format(total)} with ${person}...`,
          success: `✅ Settled with ${person}!`,
          error: "Failed to settle debts",
        }
      );
      await loadDebts();
    } catch (error) {
      // Error handled by toast
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-red-500",
    ];
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Balances</h1>
        <p className="text-muted-foreground">See who owes what</p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setView("people")}
          className={`px-4 py-2 font-medium transition-colors ${
            view === "people"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          People
        </button>
        <button
          onClick={() => setView("groups")}
          className={`px-4 py-2 font-medium transition-colors ${
            view === "groups"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Groups
        </button>
      </div>

      {/* People View */}
      {view === "people" && (
        <div className="space-y-3">
          {peopleBalances.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😊</div>
              <h3 className="text-xl font-semibold mb-2">All settled up!</h3>
              <p className="text-muted-foreground">You don't owe anyone, and no one owes you.</p>
            </div>
          ) : (
            peopleBalances.map((person) => (
              <div
                key={person.name}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPerson(selectedPerson === person.name ? null : person.name)}
              >
                <div className="flex items-center justify-between">
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(
                        person.name
                      )}`}
                    >
                      {getInitials(person.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{person.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {person.debts.length} {person.debts.length === 1 ? "debt" : "debts"}
                      </p>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    {person.netBalance > 0 ? (
                      <div className="text-green-600 font-semibold">
                        owes you {format(person.netBalance)}
                      </div>
                    ) : person.netBalance < 0 ? (
                      <div className="text-orange-600 font-semibold">
                        you owe {format(Math.abs(person.netBalance))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">settled up</div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedPerson === person.name && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {person.youOwe > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You owe:</span>
                        <span className="text-orange-600 font-medium">{format(person.youOwe)}</span>
                      </div>
                    )}
                    {person.theyOwe > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">They owe:</span>
                        <span className="text-green-600 font-medium">{format(person.theyOwe)}</span>
                      </div>
                    )}

                    {/* Individual Debts */}
                    <div className="space-y-2 mt-3">
                      <div className="text-sm font-medium text-muted-foreground">Details:</div>
                      {person.debts.map((debt) => (
                        <div key={debt.id} className="flex justify-between text-sm pl-3">
                          <span>{debt.name}</span>
                          <span className={debt.role === "lent" ? "text-green-600" : "text-orange-600"}>
                            {format(parseFloat(debt.currentBalance))}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Settle Button */}
                    {person.netBalance !== 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSettleWithPerson(person.name);
                        }}
                        className="w-full mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Settle Up
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Groups View */}
      {view === "groups" && (
        <div className="space-y-3">
          {groupBalances.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground">Create debts with settlement groups to organize them.</p>
            </div>
          ) : (
            groupBalances.map((group) => (
              <div
                key={group.name}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">📁 {group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.debts.length} {group.debts.length === 1 ? "debt" : "debts"}
                    </p>
                  </div>
                  <div className="text-right">
                    {group.total > 0 ? (
                      <div className="text-green-600 font-semibold">+{format(group.total)}</div>
                    ) : group.total < 0 ? (
                      <div className="text-orange-600 font-semibold">{format(group.total)}</div>
                    ) : (
                      <div className="text-muted-foreground">settled</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Overall Summary */}
      {debts.length > 0 && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Overall Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total you owe:</div>
              <div className="text-orange-600 font-semibold">
                {format(
                  peopleBalances.reduce((sum, p) => sum + Math.max(0, -p.netBalance), 0)
                )}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total owed to you:</div>
              <div className="text-green-600 font-semibold">
                {format(
                  peopleBalances.reduce((sum, p) => sum + Math.max(0, p.netBalance), 0)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
