import { useNavigate } from "react-router-dom";

export default function FriendCard({ friend }) {
  const navigate = useNavigate();

  const {
    name,
    username,
    youOwe = 0,
    theyOwe = 0,
    pendingExpenses = 0,
    lastActivity,
  } = friend;

  const safeYouOwe = Number(youOwe) || 0;
  const safeTheyOwe = Number(theyOwe) || 0;
  const net = safeTheyOwe - safeYouOwe;
  const hasTransactions = safeYouOwe > 0 || safeTheyOwe > 0;

  const status =
    !hasTransactions ? "none" : net === 0 ? "settled" : net > 0 ? "receiving" : "owing";

  const badgeMap = {
    receiving: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    owing: "bg-red-500/15 text-red-400 border border-red-500/20",
    settled: "bg-white/[0.06] text-gray-400 border border-white/[0.08]",
    none: "bg-white/[0.06] text-gray-500 border border-white/[0.08]",
  };

  return (
    <div
      onClick={() => navigate(`/friends/${friend._id}`)}
      className="
        cursor-pointer glass rounded-2xl p-5
        transition-all duration-300
        hover:bg-white/[0.06]
        hover:ring-2 hover:ring-emerald-500/20
        hover:shadow-glow
        animate-fadeIn
      "
    >
      {/* ---------- HEADER ---------- */}
      <div className="flex gap-3 items-center">
        {friend.avatar?.url ? (
          <img
            src={friend.avatar.url}
            alt={name}
            className="w-11 h-11 rounded-full object-cover border border-emerald-500/20 shadow-sm"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-semibold text-base shadow-glow">
            {name?.[0]}
          </div>
        )}

        <div>
          <p className="font-semibold text-gray-100">{name}</p>
          <p className="text-sm text-gray-500">@{username}</p>
        </div>
      </div>

      {/* ---------- STATUS BADGE ---------- */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badgeMap[status]}`}
        >
          {status === "none"
            ? "No transactions"
            : status === "settled"
            ? "All settled ✓"
            : status === "receiving"
            ? `Receiving ₹${net}`
            : `Owing ₹${Math.abs(net)}`}
        </span>

        {pendingExpenses > 0 && (
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400 border border-sky-500/20">
            awaiting response · {pendingExpenses}
          </span>
        )}
      </div>

      {/* ---------- STACKED DETAILS ---------- */}
      {(safeYouOwe > 0 || safeTheyOwe > 0) && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">They owe you</span>
            <span className="font-medium text-emerald-400">
              ₹{safeTheyOwe}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">You owe them</span>
            <span className="font-medium text-red-400">
              ₹{safeYouOwe}
            </span>
          </div>
        </div>
      )}

      {/* ---------- FOOTER ---------- */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-gray-600">
        Last activity · {lastActivity || "No recent activity"}
      </div>
    </div>
  );
}
