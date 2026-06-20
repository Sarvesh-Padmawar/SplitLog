import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Utensils,
  Car,
  ShoppingBag,
  Home,
  Film,
  HelpCircle,
  CreditCard,
  MapPin,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  TrendingUp,
  Edit2,
} from "lucide-react";
import api from "../../shared/services/axios";
import { showToast } from "../../components/toastStore";
import AddExpenseModal from "../../features/expenses/components/AddExpenseModal";
import { useSocket } from "../../services/socket/useSocket";

/* ── Category icon map ─────────────────────────────────────── */
const categoryIconMap = {
  food: <Utensils className="w-5 h-5 text-emerald-400" />,
  travel: <Car className="w-5 h-5 text-blue-400" />,
  shopping: <ShoppingBag className="w-5 h-5 text-pink-400" />,
  rent: <Home className="w-5 h-5 text-amber-400" />,
  entertainment: <Film className="w-5 h-5 text-violet-400" />,
  other: <HelpCircle className="w-5 h-5 text-gray-400" />,
};

/* ── Status config ─────────────────────────────────────────── */
const statusConfig = {
  pending: {
    cls: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
    label: "pending approval",
  },
  awaiting: {
    cls: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
    label: "pending approval",
  },
  awaiting_response: {
    cls: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
    label: "pending approval",
  },
  open: {
    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    label: "open",
  },
  unsettled: {
    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    label: "open",
  },
  partially_settled: {
    cls: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20",
    label: "partially settled",
  },
  settled: {
    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    label: "settled ✓",
  },
  rejected: {
    cls: "bg-red-500/15 text-red-400 border border-red-500/20",
    label: "rejected",
  },
};

function getStatusLabel(exp) {
  const { status, acceptedCount, totalFriends, settledFriends } = exp;
  if ((status === "pending" || status === "awaiting_response") && totalFriends != null && totalFriends > 0) {
    return `Pending approval (${acceptedCount}/${totalFriends})`;
  }
  if (status === "partially_settled" && totalFriends != null && totalFriends > 0) {
    return `Partially settled (${settledFriends}/${totalFriends})`;
  }
  return statusConfig[status]?.label ?? status;
}

/* ── Participant row ───────────────────────────────────────── */
function ParticipantRow({ p }) {
  const settleColors = {
    paid: "text-emerald-400",
    settled: "text-emerald-400",
    unsettled: "text-amber-400",
    open: "text-amber-400",
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/[0.05] last:border-0">
      {/* Avatar */}
      {p.avatar?.url ? (
        <img
          src={p.avatar.url}
          alt={p.name}
          className="w-9 h-9 rounded-full object-cover border border-emerald-500/20 flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-sm font-semibold text-emerald-400 flex-shrink-0 border border-emerald-500/20">
          {p.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-100 truncate">
            {p.isMe ? "You" : p.name}
          </span>
          {p.isPayer && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
              paid
            </span>
          )}
          {!p.isPayer && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                p.responseStatus === "accepted"
                  ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
                  : p.responseStatus === "rejected"
                  ? "bg-red-500/15 border-red-500/20 text-red-400"
                  : "bg-sky-500/15 border-sky-500/20 text-sky-400"
              }`}
            >
              {p.responseStatus === "accepted"
                ? "accepted"
                : p.responseStatus === "rejected"
                ? "rejected"
                : "awaiting"}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {p.isPayer
            ? `Paid ₹${p.amount}`
            : `Owes ₹${p.amount}`}
        </p>
      </div>

      {/* Settlement status */}
      {!p.isPayer && (
        <div
          className={`text-xs font-medium ${settleColors[p.settlementStatus] ?? "text-gray-500"}`}
        >
          {p.settlementStatus === "paid" || p.settlementStatus === "settled" ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
            </span>
          ) : p.responseStatus === "rejected" ? (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3.5 h-3.5" /> Rejected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" /> Unpaid
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-white/10" />
      <div className="h-40 rounded-2xl bg-white/[0.04]" />
      <div className="h-32 rounded-2xl bg-white/[0.04]" />
      <div className="h-48 rounded-2xl bg-white/[0.04]" />
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function ExpenseDetailPage() {
  const { socket } = useSocket();
  const { expenseId } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const fetchExpense = async () => {
    try {
      const { data } = await api.get(`/expenses/${expenseId}`);
      setExpense(data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load expense", "error");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  useEffect(() => {
    if (!socket || !expenseId) return;

    const handleExpenseUpdated = (updatedExpense) => {
      const updatedId = updatedExpense?._id || updatedExpense?.id || updatedExpense;
      if (updatedId?.toString() === expenseId.toString()) {
        fetchExpense();
      }
    };

    const handleExpenseDeleted = (payload) => {
      const deletedId = payload?.expenseId || payload?.id || payload;
      if (deletedId?.toString() === expenseId.toString()) {
        showToast("This expense has been deleted.", "info");
        navigate(-1);
      }
    };

    socket.on("expense_updated", handleExpenseUpdated);
    socket.on("expense_deleted", handleExpenseDeleted);

    return () => {
      socket.off("expense_updated", handleExpenseUpdated);
      socket.off("expense_deleted", handleExpenseDeleted);
    };
  }, [socket, expenseId, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    try {
      setDeleting(true);
      await api.delete(`/expenses/${expenseId}`);
      showToast("Expense deleted", "success");
      navigate("/");
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
  const dateStr = expense
    ? new Date(expense.date || expense.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const timeStr = expense
    ? new Date(expense.date || expense.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const settleProgress =
    expense?.totalFriends != null
      ? Math.round((expense.settledFriends / expense.totalFriends) * 100)
      : null;

  const canEdit =
    expense?.paidByMe &&
    !expense.participants.some(
      (p) => p.settlementStatus === "paid" && !p.isPayer
    );

  return (
    <div className="w-full flex-1 flex flex-col animate-fadeIn overflow-hidden min-h-0">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 flex-1 flex flex-col h-full overflow-hidden">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition group mb-4 w-fit flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {loading ? (
          <Skeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden min-h-0 w-full flex-1">
            {/* ── LEFT COLUMN: Info & Actions ───────────────────────── */}
            <div className="md:col-span-6 space-y-5 h-auto md:h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar pb-6 pr-1">
              {/* ── Header card ─────────────────────────────── */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start gap-4">
                {/* Category icon */}
                <div className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.06] flex-shrink-0">
                  {categoryIconMap[expense.category] ?? categoryIconMap.other}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-100 truncate">
                    {expense.title}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {dateStr} · {timeStr}
                  </p>

                  {/* Status badge */}
                  <span
                    className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${
                      statusConfig[expense.status]?.cls ??
                      statusConfig.unsettled.cls
                    }`}
                  >
                    {getStatusLabel(expense)}
                  </span>
                </div>

                {/* Total */}
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-gray-100">
                    {fmt(expense.totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">total</p>
                </div>
              </div>
            </div>

            {/* ── Expense Summary ──────────────────────────── */}
            <div className="glass rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Expense Summary
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-100 mt-0.5">
                    {fmt(expense.totalAmount)}
                  </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                  <p className="text-xs text-gray-500">Paid By</p>
                  <p className="text-lg font-semibold text-gray-100 mt-0.5 truncate">
                    {expense.paidByMe ? "You" : expense.paidBy.name}
                  </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-200 mt-0.5 capitalize">
                    {expense.category}
                  </p>
                </div>
                {expense.notes && (
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Notes
                    </p>
                    <p className="text-sm font-medium text-gray-200 mt-0.5 truncate">
                      {expense.notes}
                    </p>
                  </div>
                )}
                {expense.group && (
                  <div 
                    onClick={() => navigate(`/groups/${expense.group._id}`)}
                    className="bg-white/[0.03] rounded-xl p-3 border border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer transition-all duration-200 group"
                  >
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400 animate-pulse" /> Group
                    </p>
                    <p className="text-sm font-semibold text-emerald-400 mt-0.5 truncate group-hover:underline">
                      {expense.group.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Actions ─────────────────────────────────── */}
            {expense.paidByMe && (
              <div className="glass rounded-2xl p-5 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Actions
                </h2>

                <div className="flex flex-col sm:flex-row gap-3">
                  {canEdit && (
                    <button
                      onClick={() => setShowEdit(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-sm font-medium border border-sky-500/20 transition-all duration-200 flex-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Expense
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium border border-red-500/20 transition-all duration-200 disabled:opacity-50 flex-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? "Deleting…" : "Delete Expense"}
                  </button>
                </div>

                {expense.status === "settled" && (
                  <p className="text-xs text-emerald-400 mt-3 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    This expense is fully settled
                  </p>
                )}
              </div>
            )}
            </div>

            {/* ── RIGHT COLUMN: Participants & Progress ──────────────── */}
            <div className="md:col-span-6 space-y-5 h-auto md:h-[72vh] flex flex-col min-h-0 pb-6">
              {/* ── Settlement Progress ──────────────────────── */}
              {settleProgress !== null && expense.totalFriends > 0 && (
                <div className="glass rounded-2xl p-5 flex-shrink-0">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" /> Settlement Progress
                  </h2>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-300">
                      {expense.settledFriends}/{expense.totalFriends} Settled
                    </p>
                    <p className="text-sm font-semibold text-emerald-400">
                      {settleProgress}%
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${settleProgress}%` }}
                    />
                  </div>

                  {settleProgress === 100 && (
                    <p className="text-xs text-emerald-400 mt-2 font-medium">
                      All settled ✓
                    </p>
                  )}
                </div>
              )}

              {/* ── Participants ─────────────────────────────── */}
              <div className="glass rounded-2xl p-5 flex-1 flex flex-col overflow-hidden">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3 flex-shrink-0">
                  <Users className="w-4 h-4" /> Participants
                </h2>

                <div className="overflow-y-auto no-scrollbar flex-1 pr-1">
                {expense.participants.map((p) => (
                  <ParticipantRow key={p.userId} p={p} />
                ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {expense && (
        <AddExpenseModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          existingExpense={expense}
          onSuccess={fetchExpense}
        />
      )}
    </div>
  );
}
