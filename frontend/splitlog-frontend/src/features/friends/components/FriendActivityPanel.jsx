import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Utensils, Film, Car, ArrowLeftRight, Inbox } from "lucide-react";

const categoryIconMap = {
  Food: <Utensils className="w-4 h-4 text-emerald-400" />,
  Entertainment: <Film className="w-4 h-4 text-violet-400" />,
  Travel: <Car className="w-4 h-4 text-blue-400" />,
};

export default function FriendActivityPanel({
  expenses = [],
  settlements = [],
  friend,
}) {
  const [activeTab, setActiveTab] = useState("transactions");
  const navigate = useNavigate();

  return (
    <div className="col-span-12 lg:col-span-8">
      <div className="glass rounded-2xl h-[65vh] flex flex-col">

        {/* ---------- HEADER ---------- */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>

          <div className="flex bg-white/[0.05] rounded-lg p-1 text-sm">
            {["transactions", "settlements"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "transactions" ? "Transactions" : "Settlements"}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- CONTENT ---------- */}
        <div className="flex-1 overflow-y-auto dark-scrollbar divide-y divide-white/[0.04]">

          {/* ================= TRANSACTIONS ================= */}
          {activeTab === "transactions" && (() => {
            // Exclude settled AND rejected — rejected ones go to Settlements tab
            const unsettledExpenses = expenses.filter(
              (exp) => exp.status !== "settled" && exp.status !== "rejected"
            );
            return (
            <>
              {unsettledExpenses.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3">
                    <Inbox className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-500">No transactions yet</p>
                  <p className="text-xs text-gray-600 mt-1">Expenses with {friend.name} will appear here</p>
                </div>
              )}

              {unsettledExpenses.map((exp) => {
                const displayAmount = exp.splitAmount ?? exp.remainingAmount ?? 0;
                const payerId = exp.paidBy?._id?.toString?.() ?? exp.paidBy?.toString?.() ?? "";
                const friendIdStr = friend._id?.toString?.() ?? "";
                const paidByMe = payerId !== friendIdStr;

                // DEBUG — remove after fix
                console.log(`[STATUS] "${exp.description}" → backend status="${exp.status}" | paidByMe=${paidByMe}`);

                // Use backend-computed status directly.
                const s = exp.status;

                const badgeClass =
                  s === "settled" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : s === "rejected" ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : s === "open" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : s === "partially_settled" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                  : "bg-sky-500/15 text-sky-400 border border-sky-500/20"; // pending approval

                const badgeLabel =
                  s === "settled" ? "settled ✓"
                  : s === "rejected" ? "rejected"
                  : s === "open" ? "open"
                  : s === "partially_settled" ? "partially settled"
                  : "pending approval";

                return (
                  <div
                    key={exp._id}
                    onClick={() => navigate(`/expense/${exp._id}`)}
                    className="group flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer"
                  >
                    {/* Icon */}
                    <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                      {categoryIconMap[exp.category] || <Utensils className="w-4 h-4 text-gray-500" />}
                    </div>

                    {/* Title + Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-100 truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none">
                          {exp.description || "Expense"}
                        </p>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeClass}`}
                        >
                          {badgeLabel}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Paid by{" "}
                        <span className="font-medium text-gray-400">
                          {paidByMe ? "You" : friend.name}
                        </span>{" "}
                        • {exp.category || "General"}
                        <span className="inline sm:hidden text-gray-600"> • {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                      </p>
                    </div>

                    {/* Date & Time */}
                    <div className="hidden sm:block text-right min-w-[80px] shrink-0">
                      <p className="text-xs text-gray-400">
                        {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(exp.date || exp.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right min-w-[100px] sm:min-w-[140px] shrink-0">
                      <p className="text-xs text-gray-500">
                        ₹{displayAmount} / ₹{exp.amount}
                      </p>

                      {s === "rejected" ? (
                        <p className="text-sm font-semibold text-gray-600">—</p>
                      ) : (
                        <p
                          className={`text-sm font-semibold ${
                            paidByMe ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {paidByMe
                            ? `You get ₹${displayAmount}`
                            : `You owe ₹${displayAmount}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
            );
          })()}

          {/* ================= SETTLEMENTS ================= */}
          {activeTab === "settlements" && (() => {
            // Flatten and deduplicate settled expenses from all settlements
            const seen = new Set();
            const settledExpenses = settlements.flatMap((s) =>
              (s.expenses || []).filter((exp) => {
                const id = exp._id?.toString?.() || exp._id;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
              }).map((exp) => ({ ...exp, settlementAmount: s.amount }))
            );

            // All rejected expenses between these two users
            const rejectedExpenses = expenses.filter((exp) => exp.status === "rejected");

            return (
              <>
                {settledExpenses.length === 0 && rejectedExpenses.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3">
                      <ArrowLeftRight className="w-7 h-7 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500">No settlements yet</p>
                    <p className="text-xs text-gray-600 mt-1">Settled payments will show up here</p>
                  </div>
                )}

                {/* ── Settled expenses ── */}
                {settledExpenses.map((exp) => {
                  const paidByMe = exp.paidBy?.toString?.() !== friend._id?.toString?.()
                    && exp.paidBy?._id?.toString?.() !== friend._id?.toString?.();

                  const friendIdStr = friend._id?.toString?.() || friend._id;
                  const mySplit = (exp.splits || []).find(
                    (s) => {
                      const splitUser = s.user?._id?.toString?.() || s.user?.toString?.();
                      return splitUser !== friendIdStr && s.status === "accepted";
                    }
                  );
                  const splitAmount = mySplit?.amount || exp.totalAmount || exp.amount;

                  return (
                    <div
                      key={exp._id}
                      onClick={() => navigate(`/expense/${exp._id}`)}
                      className="group flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer"
                    >
                      <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06] shrink-0">
                        {categoryIconMap[exp.category] || <Utensils className="w-4 h-4 text-gray-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-100 truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none">{exp.description || "Expense"}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                            settled
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Paid by{" "}
                          <span className="font-medium text-gray-400">{paidByMe ? "You" : friend.name}</span>{" "}
                          • {exp.category || "General"}
                          <span className="inline sm:hidden text-gray-600"> • {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                        </p>
                      </div>

                      <div className="hidden sm:block text-right min-w-[80px] shrink-0">
                        <p className="text-xs text-gray-400">
                          {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(exp.date || exp.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="text-right min-w-[100px] sm:min-w-[140px] shrink-0">
                        <p className="text-xs text-gray-500">₹{splitAmount} / ₹{exp.totalAmount || exp.amount}</p>
                        <p className={`text-sm font-semibold ${paidByMe ? "text-emerald-400" : "text-red-400"}`}>
                          {paidByMe ? `Settled ₹${splitAmount}` : `You paid ₹${splitAmount}`}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* ── Rejected expenses ── */}
                {rejectedExpenses.map((exp) => {
                  const payerId = exp.paidBy?._id?.toString?.() ?? exp.paidBy?.toString?.() ?? "";
                  const friendIdStr = friend._id?.toString?.() ?? "";
                  const paidByMe = payerId !== friendIdStr;

                  return (
                    <div
                      key={`rej-${exp._id}`}
                      onClick={() => navigate(`/expense/${exp._id}`)}
                      className="group flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer"
                    >
                      <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06] shrink-0">
                        {categoryIconMap[exp.category] || <Utensils className="w-4 h-4 text-gray-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-100 truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none">{exp.description || "Expense"}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
                            rejected
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Paid by{" "}
                          <span className="font-medium text-gray-400">{paidByMe ? "You" : friend.name}</span>{" "}
                          • {exp.category || "General"}
                          <span className="inline sm:hidden text-gray-600"> • {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                        </p>
                      </div>

                      <div className="hidden sm:block text-right min-w-[80px] shrink-0">
                        <p className="text-xs text-gray-400">
                          {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(exp.date || exp.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="text-right min-w-[100px] sm:min-w-[140px] shrink-0">
                        <p className="text-xs text-gray-500">₹{exp.splitAmount ?? 0} / ₹{exp.amount}</p>
                        <p className="text-sm font-semibold text-gray-600">—</p>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
