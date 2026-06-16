import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingDown, TrendingUp, Scale, Loader2 } from "lucide-react";
import api from "../../../shared/services/axios";
import { showToast } from "../../../components/toastStore";

export default function FriendSummaryPanel({
  friend,
  youOwe,
  theyOwe,
  netBalance,
  onSettle,
}) {
  const navigate = useNavigate();
  const [settling, setSettling] = useState(false);

  // Settle up: the person who owes sends the settlement
  const handleSettle = async () => {
    // Only the person who owes can send a settlement
    if (netBalance >= 0) {
      showToast("Nothing to settle — they owe you!", "info");
      return;
    }

    const amount = Math.abs(netBalance);

    try {
      setSettling(true);
      await api.post("/settlements", {
        friendId: friend._id,
        amount,
      });
      showToast(`Settlement request of ₹${amount} sent!`, "success");
      if (onSettle) onSettle();
    } catch (err) {
      showToast(err.response?.data?.message || "Settlement failed", "error");
    } finally {
      setSettling(false);
    }
  };

  const netColor =
    netBalance > 0
      ? "from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400"
      : netBalance < 0
      ? "from-red-500/20 to-orange-500/10 border-red-500/20 text-red-400"
      : "from-white/[0.04] to-white/[0.02] border-white/[0.08] text-gray-400";

  return (
    <div className="col-span-12 lg:col-span-4 space-y-4 w-full">

      {/* Back button */}
      <button
        onClick={() => navigate("/friends")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to friends
      </button>

      {/* Friend Info */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-semibold shadow-glow ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-surface-300">
            {friend.name[0]}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-100">{friend.name}</p>
            <p className="text-sm text-gray-500">@{friend.username}</p>
          </div>
        </div>
      </div>

      {/* You owe */}
      <div className="glass rounded-2xl p-4 border-l-2 border-l-red-500">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <p className="text-sm text-gray-500">You owe</p>
        </div>
        <p className="text-xl font-semibold text-red-400">
          ₹{youOwe}
        </p>
      </div>

      {/* They owe */}
      <div className="glass rounded-2xl p-4 border-l-2 border-l-emerald-500">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-gray-500">They owe you</p>
        </div>
        <p className="text-xl font-semibold text-emerald-400">
          ₹{theyOwe}
        </p>
      </div>

      {/* Net */}
      <div className={`rounded-2xl p-4 bg-gradient-to-br border ${netColor}`}>
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-4 h-4" />
          <p className="text-sm opacity-80">Net balance</p>
        </div>
        <p className="text-xl font-semibold">
          {netBalance === 0
            ? "₹0 — All settled"
            : netBalance > 0
            ? `You get ₹${netBalance}`
            : `You owe ₹${Math.abs(netBalance)}`}
        </p>
      </div>

      {/* Settle */}
      <button
        onClick={handleSettle}
        disabled={netBalance >= 0 || settling}
        className={`w-full h-14 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
          netBalance >= 0
            ? "bg-white/[0.04] text-gray-600 cursor-not-allowed"
            : settling
            ? "bg-emerald-500/30 text-emerald-300 cursor-wait"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg"
        }`}
      >
        {settling ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Settle up"
        )}
      </button>
    </div>
  );
}
