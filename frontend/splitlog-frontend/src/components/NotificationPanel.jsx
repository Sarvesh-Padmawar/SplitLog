import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, Clock, ChevronDown, ArrowLeftRight } from "lucide-react";
import api from "../shared/services/axios";
import { showToast } from "./toastStore";
import { useSocket } from "../services/socket/useSocket";

/* ──────────── NOTIFICATION PANEL ──────────── */
export default function NotificationPanel() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const panelRef = useRef(null);

  /* ========= FETCH ========= */
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      const notifs = res.data.data || res.data.items || res.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  /* Listen to real-time notification socket events */
  useEffect(() => {
    if (!socket) return;

    socket.on("notification_created", fetchNotifications);
    socket.on("notification_read", fetchNotifications);
    socket.on("notification_all_read", fetchNotifications);

    return () => {
      socket.off("notification_created", fetchNotifications);
      socket.off("notification_read", fetchNotifications);
      socket.off("notification_all_read", fetchNotifications);
    };
  }, [socket]);

  /* Fetch on mount + every 30s */
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  /* Fetch when panel opens */
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ========= RESPOND TO SPLIT ========= */
  const handleRespond = async (notification, status) => {
    const expenseId = notification.expense?._id;
    if (!expenseId) return;

    try {
      setActionLoadingId(notification._id);
      await api.patch(`/expenses/${expenseId}/respond`, { status });
      await api.patch(`/notifications/${notification._id}/read`);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true, _responded: status } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      showToast(
        status === "accepted" ? "Split accepted!" : "Split rejected",
        status === "accepted" ? "success" : "info"
      );
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ========= RESPOND TO SETTLEMENT ========= */
  const handleSettlementRespond = async (notification, status) => {
    try {
      setActionLoadingId(notification._id);
      await api.patch(`/notifications/${notification._id}/respond-settlement`, { status });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true, _responded: status } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      showToast(
        status === "accepted" ? "Settlement accepted!" : "Settlement rejected",
        status === "accepted" ? "success" : "info"
      );
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ========= DISMISS FRIEND REJECTED ========= */
  const handleFriendRejectedOk = async (notification) => {
    try {
      setActionLoadingId(notification._id);
      await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true, _responded: "ok" } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ========= MARK INDIVIDUAL AS READ ========= */
  const handleMarkRead = async (notification) => {
    try {
      setActionLoadingId(notification._id);
      await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ========= MARK ALL AS READ ========= */
  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      showToast("All notifications marked as read", "success");
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  /* ========= TIME AGO ========= */
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition "
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full leading-none px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-slideUp z-50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto no-scrollbar ">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  actionLoadingId={actionLoadingId}
                  onRespond={handleRespond}
                  onSettlementRespond={handleSettlementRespond}
                  onFriendRejectedOk={handleFriendRejectedOk}
                  onMarkRead={handleMarkRead}
                  timeAgo={timeAgo}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────── SINGLE NOTIFICATION ITEM ──────────── */
function NotificationItem({ notification, actionLoadingId, onRespond, onSettlementRespond, onFriendRejectedOk, onMarkRead, timeAgo }) {
  const n = notification;
  const senderName = n.sender?.name || "Someone";
  const senderInitial = senderName[0]?.toUpperCase() || "?";
  const expense = n.expense;
  const settlement = n.settlement;
  const isLoading = actionLoadingId === n._id;
  const responded = n._responded; // local state after action
  const isSettlement = n.type === "settlement_request";

  return (
    <div
      className={`px-4 py-3 border-b border-white/[0.04] transition ${
        n.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        {n.sender?.avatar?.url ? (
          <img
            src={n.sender.avatar.url}
            alt={senderName}
            className="w-9 h-9 rounded-full object-cover border border-emerald-500/20 shrink-0 shadow-sm"
          />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 border ${
            isSettlement
              ? "bg-gradient-to-br from-violet-500/30 to-purple-500/30 text-violet-400 border-violet-500/20"
              : "bg-gradient-to-br from-emerald-500/30 to-teal-500/30 text-emerald-400 border-emerald-500/20"
          }`}>
            {isSettlement ? <ArrowLeftRight className="w-4 h-4" /> : senderInitial}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-snug">{n.message}</p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-600">{timeAgo(n.createdAt)}</span>
            {isSettlement && settlement?.amount && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                ₹{settlement.amount}
              </span>
            )}
            {!isSettlement && expense?.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-gray-500 capitalize">
                {expense.category}
              </span>
            )}
          </div>

          {/* Accept + Reject — receiver of a split request */}
          {n.type === "split_request_pending" && !n.read && !responded && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => onRespond(n, "accepted")}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>
              <button
                onClick={() => onRespond(n, "rejected")}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          )}

          {/* Accept + Reject — receiver of a settlement request */}
          {n.type === "settlement_request" && !n.read && !responded && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => onSettlementRespond(n, "accepted")}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>
              <button
                onClick={() => onSettlementRespond(n, "rejected")}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25 transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          )}

          {/* OK only — info notifications (any non-actionable unread notification) */}
          {n.type !== "split_request_pending" && n.type !== "settlement_request" && !n.read && !responded && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => onFriendRejectedOk(n)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-500/15 text-gray-300 text-xs font-medium hover:bg-gray-500/25 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                OK
              </button>
            </div>
          )}

          {/* Responded state (for accept/reject actions only) */}
          {responded && responded !== "ok" && (
            <p className={`text-xs mt-2 font-medium ${
              responded === "accepted" ? "text-emerald-400" : "text-red-400"
            }`}>
              {responded === "accepted" ? "✓ Accepted" : "✗ Rejected"}
            </p>
          )}
        </div>

        {/* Mark as read check icon */}
        {!n.read && (
          <button
            onClick={() => onMarkRead(n)}
            disabled={isLoading}
            className="p-1 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/[0.05] transition self-start shrink-0"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
