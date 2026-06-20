import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../shared/services/axios";
import FriendSummaryPanel from "../../features/friends/components/FriendSummaryPanel";
import FriendActivityPanel from "../../features/friends/components/FriendActivityPanel";
import { useSocket } from "../../services/socket/useSocket";

export default function FriendPage() {
  const { socket } = useSocket();
  const { friendId } = useParams();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await api.get(`/ledger/${friendId}`);
      setLedger(res.data);
    } catch (err) {
      console.error("Failed to load ledger", err);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    fetchLedger();

    // Auto-refresh every 15 seconds to pick up new transactions
    const interval = setInterval(fetchLedger, 15000);

    // Also refresh when tab regains focus
    const handleFocus = () => fetchLedger();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchLedger]);

  useEffect(() => {
    if (!socket) return;

    socket.on("expense_created", fetchLedger);
    socket.on("expense_updated", fetchLedger);
    socket.on("expense_deleted", fetchLedger);

    return () => {
      socket.off("expense_created", fetchLedger);
      socket.off("expense_updated", fetchLedger);
      socket.off("expense_deleted", fetchLedger);
    };
  }, [socket, fetchLedger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[55vh]">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ledger) return null;

  const { friend, expenses, settlements } = ledger;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-16 py-6 animate-fadeIn">
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT */}
        <FriendSummaryPanel {...ledger} onSettle={fetchLedger} />

        {/* RIGHT */}
        <FriendActivityPanel
          expenses={expenses}
          settlements={settlements}
          friend={friend}
        />
      </div>
    </div>
  );
}

