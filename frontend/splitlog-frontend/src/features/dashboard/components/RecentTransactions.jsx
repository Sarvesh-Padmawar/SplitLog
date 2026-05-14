import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Utensils, Film, Car, ShoppingBag, Home, HelpCircle } from "lucide-react";
import {
  fetchRecentTransactions,
  fetchFriendBalances,
} from "../services/dashboardService";

/* ------------------ ICON MAP ------------------ */
const categoryIconMap = {
  food: <Utensils className="w-4 h-4 text-emerald-400" />,
  travel: <Car className="w-4 h-4 text-blue-400" />,
  shopping: <ShoppingBag className="w-4 h-4 text-pink-400" />,
  rent: <Home className="w-4 h-4 text-amber-400" />,
  entertainment: <Film className="w-4 h-4 text-violet-400" />,
  other: <HelpCircle className="w-4 h-4 text-gray-400" />,
};

const statusStyles = {
  awaiting: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  awaiting_response: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  unsettled: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  settled: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/20",
};

// Dynamic label generator — uses progress counters when available
const getStatusLabel = (exp) => {
  const { status, acceptedCount, totalFriends, settledFriends } = exp;
  if (status === "awaiting_response" && totalFriends != null) {
    return `Awaiting response (${acceptedCount}/${totalFriends})`;
  }
  if (status === "pending" && totalFriends != null) {
    return `Pending (${settledFriends}/${totalFriends} settled)`;
  }
  const labels = {
    awaiting: "awaiting response",
    unsettled: "pending",
    settled: "settled ✓",
    rejected: "rejected",
  };
  return labels[status] || status;
};

/* ------------------ SKELETON ROWS ------------------ */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-2.5 w-20 rounded bg-white/10" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-white/10" />
        <div className="h-3 w-20 rounded bg-white/10" />
      </div>
    </div>
  );
}

function FriendSkeletonRow() {
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-2.5 w-16 rounded bg-white/10" />
        </div>
      </div>
      <div className="h-4 w-16 rounded bg-white/10" />
    </div>
  );
}

/* ------------------ MAIN COMPONENT ------------------ */
export default function RecentTransactions() {
  const navigate = useNavigate();
  const [view, setView] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [friendBalances, setFriendBalances] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    fetchRecentTransactions()
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoadingTx(false));

    fetchFriendBalances()
      .then(setFriendBalances)
      .catch(console.error)
      .finally(() => setLoadingFriends(false));
  }, []);

  return (
    <section className="glass rounded-2xl flex flex-col h-[48vh] animate-slideUp isolate relative z-0 overflow-hidden">

      {/* ---------- HEADER ---------- */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-lg font-semibold text-gray-100">Recent Activity</h3>

        <div className="flex bg-white/[0.05] rounded-lg p-1">
          {[
            { key: "transactions", label: "Transactions" },
            { key: "friends", label: "Friends" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                view === tab.key
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- TRANSACTIONS VIEW ---------- */}
      {view === "transactions" && (
        <div className="flex-1 overflow-y-auto dark-scrollbar divide-y divide-white/[0.04]">
          {loadingTx ? (
            [1, 2, 3].map((i) => <SkeletonRow key={i} />)
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          ) : (
            transactions.map((exp) => (
              <div
                key={exp.id}
                onClick={() => navigate(`/expense/${exp.id}`)}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer hover:ring-1 hover:ring-emerald-500/10 rounded-lg"
              >
                {/* Icon */}
                <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                  {categoryIconMap[exp.category?.toLowerCase()] ?? categoryIconMap.other}
                </div>

                {/* Title + Meta */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-100">{exp.title}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        statusStyles[exp.status] || statusStyles.awaiting
                      }`}
                    >
                      {getStatusLabel(exp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Paid by{" "}
                    <span className="font-medium text-gray-400">{exp.paidBy}</span>{" "}
                    • {(exp.category || "other").charAt(0).toUpperCase() + (exp.category || "other").slice(1)}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="text-right min-w-[80px]">
                  <p className="text-xs text-gray-400">{exp.date}</p>
                  <p className="text-xs text-gray-600">{exp.time}</p>
                </div>

                {/* Amount */}
                <div className="text-right min-w-[140px]">
                  <p className="text-xs text-gray-500">
                    ₹{Math.abs(exp.myShare).toFixed(2)} / ₹{exp.total}
                  </p>
                  {exp.status === "rejected" ? (
                    <p className="text-sm font-semibold text-gray-600">—</p>
                  ) : exp.paidBy === "You" && Math.abs(exp.myShare) === exp.total ? (
                    <p className="text-sm font-semibold text-gray-400">
                      Self expense
                    </p>
                  ) : (
                    <p
                      className={`text-sm font-semibold ${
                        exp.myShare >= 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {exp.myShare >= 0 ? "You owe" : "You get"} ₹
                      {Math.abs(exp.myShare).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------- FRIEND BALANCES VIEW ---------- */}
      {view === "friends" && (
        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/[0.04]">
          {loadingFriends ? (
            [1, 2, 3].map((i) => <FriendSkeletonRow key={i} />)
          ) : friendBalances.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">All settled up! 🎉</p>
            </div>
          ) : (
            friendBalances.map((f) => (
              <div
                key={f.id}
                onClick={() => navigate(`/friends/${f.id}`)}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer hover:ring-1 hover:ring-emerald-500/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 text-emerald-400 font-semibold text-sm flex items-center justify-center border border-emerald-500/20">
                    {f.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-100">{f.name}</p>
                    <p className="text-xs text-gray-500">
                      {f.balance >= 0 ? "Owes you" : "You owe"}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-semibold ${
                    f.balance >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ₹{Math.abs(f.balance).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
