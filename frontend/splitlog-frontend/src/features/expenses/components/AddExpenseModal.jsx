import { useState, useEffect } from "react";
import {
  X,
  FileText,
  MapPin,
  Tag,
  UserPlus,
  Trash2,
  Plus,
  CalendarDays,
  Divide,
} from "lucide-react";
import api from "../../../shared/services/axios";
import { showToast } from "../../../components/toastStore";
import { extractData } from "../../../shared/utils/apiHelper";

const CATEGORIES = [
  { value: "food", label: "Food", emoji: "🍔" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "other", label: "Other", emoji: "📌" },
];

export default function AddExpenseModal({ open, onClose, existingExpense, onSuccess }) {
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("other");
  const [splits, setSplits] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [expenseDate, setExpenseDate] = useState("");

  /* ================= FETCH FRIENDS ================= */
  useEffect(() => {
    if (!open) return;
    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const groupId = existingExpense?.group?._id || existingExpense?.group?.id;
        if (groupId) {
          const res = await api.get(`/groups/${groupId}`);
          const groupData = res.data?.data || res.data;
          setFriends(groupData?.members || []);
        } else {
          const res = await api.get("/friends");
          setFriends(extractData(res));
        }
      } catch {
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriends();
  }, [open, existingExpense]);

  /* ================= RESET ON CLOSE / PREFILL ON EDIT ================= */
  useEffect(() => {
    if (!open) {
      setTotalAmount("");
      setDescription("");
      setLocation("");
      setCategory("other");
      setSplits([]);
      setExpenseDate("");
    } else if (existingExpense) {
      setTotalAmount(existingExpense.totalAmount.toString());
      setDescription(existingExpense.title === "Expense" ? "" : existingExpense.title);
      setLocation(existingExpense.notes || "");
      setCategory(existingExpense.category || "other");
      
      const d = new Date(existingExpense.date || existingExpense.createdAt || Date.now());
      const tzOffset = d.getTimezoneOffset() * 60000;
      setExpenseDate(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));

      // Fill splits (exclude the payer)
      const friendSplits = existingExpense.participants
        .filter((p) => !p.isPayer)
        .map((p) => ({ user: p.userId, amount: p.amount.toString() }));
      setSplits(friendSplits);
    } else {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      setExpenseDate(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
    }
  }, [open, existingExpense]);

  /* ================= ADD / REMOVE SPLIT ================= */
  const addSplit = () => {
    setSplits((prev) => [...prev, { user: "", amount: "" }]);
  };

  const removeSplit = (index) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSplit = (index, field, value) => {
    setSplits((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const splitEqually = () => {
    if (!totalAmount || Number(totalAmount) <= 0) {
      showToast("Enter a valid amount first", "error");
      return;
    }
    
    // We split among the user + all selected friends
    const totalParticipants = splits.filter(s => s.user).length + 1;
    
    // Calculate equal share
    const total = Number(totalAmount);
    const equalShare = Number((total / totalParticipants).toFixed(2));
    
    // Adjust the last person's share to account for decimal rounding issues
    // Just applying equalShare to all friends. The user takes whatever is left (myShare).
    
    setSplits((prev) =>
      prev.map((s) => s.user ? { ...s, amount: equalShare.toString() } : s)
    );
  };

  /* ================= AVAILABLE FRIENDS (not already selected) ================= */
  const selectedUserIds = splits.map((s) => s.user);
  const availableFriends = (Array.isArray(friends) ? friends : []).filter(
    (f) => !selectedUserIds.includes(f._id)
  );

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    if (!totalAmount || Number(totalAmount) <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    const validSplits = splits
      .filter((s) => s.user && s.amount && Number(s.amount) > 0)
      .map((s) => ({ user: s.user, amount: Number(s.amount) }));

    const isoDate = expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString();

    try {
      setLoading(true);
      if (existingExpense) {
        await api.patch(`/expenses/${existingExpense.id}/editExpense`, {
          totalAmount: Number(totalAmount),
          splits: validSplits,
          description,
          location,
          category,
          date: isoDate,
        });
        showToast("Expense updated successfully!", "success");
      } else {
        await api.post("/expenses", {
          totalAmount: Number(totalAmount),
          splits: validSplits,
          description,
          location,
          category,
          date: isoDate,
        });
        showToast("Expense added successfully!", "success");
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save expense", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  /* ================= REMAINING AMOUNT ================= */
  const splitTotal = splits.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  );
  const myShare =
    totalAmount && Number(totalAmount) > 0
      ? Math.max(0, Number(totalAmount) - splitTotal)
      : 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg glass-strong rounded-2xl animate-slideUp overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-100">
            {existingExpense ? "Edit Expense" : "Add Expense"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto no-scrollbar">

          {/* Total Amount */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
              Total Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">₹</span>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                onWheel={(e) => e.target.blur()}
                placeholder="0.00"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, Movie tickets, etc."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Restaurant, City, etc."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
              Date & Time
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="datetime-local"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    category === cat.value
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Splits */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Split With Friends
              </label>
              <div className="flex items-center gap-3">
                {splits.length > 0 && splits.some(s => s.user) && (
                  <button
                    onClick={splitEqually}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium transition"
                  >
                    <Divide className="w-3.5 h-3.5" />
                    Split Equally
                  </button>
                )}
                <button
                  onClick={addSplit}
                  disabled={availableFriends.length === 0}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Person
                </button>
              </div>
            </div>

            {loadingFriends ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : splits.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">
                No splits — entire amount goes to you
              </p>
            ) : (
              <div className="space-y-2.5">
                {splits.map((split, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 animate-fadeIn"
                  >
                    {/* Friend picker */}
                    <select
                      value={split.user}
                      onChange={(e) =>
                        updateSplit(index, "user", e.target.value)
                      }
                      className="flex-1 h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition appearance-none"
                    >
                      <option value="" className="bg-surface-300">
                        Select friend
                      </option>
                      {/* Show currently selected friend + available ones */}
                      {(Array.isArray(friends) ? friends : [])
                        .filter(
                          (f) =>
                            f._id === split.user ||
                            !selectedUserIds.includes(f._id)
                        )
                        .map((f) => (
                          <option
                            key={f._id}
                            value={f._id}
                            className="bg-surface-300"
                          >
                            {f.name} (@{f.username})
                          </option>
                        ))}
                    </select>

                    {/* Amount */}
                    <input
                      type="number"
                      value={split.amount}
                      onChange={(e) =>
                        updateSplit(index, "amount", e.target.value)
                      }
                      onWheel={(e) => e.target.blur()}
                      placeholder="₹"
                      className="w-24 h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />

                    {/* Remove */}
                    <button
                      onClick={() => removeSplit(index)}
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {totalAmount && Number(totalAmount) > 0 && (
            <div className="glass rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="text-gray-200 font-medium">
                  ₹{Number(totalAmount).toFixed(2)}
                </span>
              </div>
              {splits.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Friends' share
                  </span>
                  <span className="text-red-400 font-medium">
                    ₹{splitTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Your share</span>
                <span className="text-emerald-400 font-medium">
                  ₹{myShare.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/[0.08] text-gray-400 text-sm font-medium hover:bg-white/[0.04] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !totalAmount}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {existingExpense ? <FileText className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {existingExpense ? "Update Expense" : "Add Expense"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
