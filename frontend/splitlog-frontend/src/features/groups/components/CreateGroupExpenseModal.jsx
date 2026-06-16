import React, { useState, useEffect } from "react";
import { X, Plus, Info, Divide } from "lucide-react";
import { z } from "zod";
import { showToast } from "../../../components/toastStore";

const CATEGORIES = [
  { value: "food", label: "Food", emoji: "🍔" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "other", label: "Other", emoji: "📌" },
];

// Zod Schema
const expenseSchema = z.object({
  totalAmount: z.number().positive("Total amount must be greater than zero"),
  description: z.string().trim().min(1, "Description is required").max(100, "Description is too long"),
  category: z.string(),
});

/**
 * CreateGroupExpenseModal Component
 * Form to create an expense for a group with split configuration.
 */
export default function CreateGroupExpenseModal({ open, onClose, onSubmit, members = [], loading }) {
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState("other");
  
  // Track which members are selected for splitting
  // Maps member._id -> boolean
  const [selectedMembers, setSelectedMembers] = useState({});
  // Maps member._id -> amount string
  const [splitAmounts, setSplitAmounts] = useState({});
  const [validationError, setValidationError] = useState("");

  // Initialize selected members to everyone in the group
  useEffect(() => {
    if (open && members.length > 0) {
      setDescription("");
      setTotalAmount("");
      setCategory("other");
      setValidationError("");

      const initialSelected = {};
      const initialAmounts = {};
      members.forEach((m) => {
        initialSelected[m._id] = true;
        initialAmounts[m._id] = "";
      });
      setSelectedMembers(initialSelected);
      setSplitAmounts(initialAmounts);
    }
  }, [open, members]);

  if (!open) return null;

  // List of members currently checked/selected
  const activeMembers = members.filter((m) => selectedMembers[m._id]);

  // Handle auto split equally
  const handleSplitEqually = () => {
    const amountNum = parseFloat(totalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setValidationError("Please enter a valid total amount first");
      return;
    }
    if (activeMembers.length === 0) {
      setValidationError("Please select at least one participant to split with");
      return;
    }

    setValidationError("");
    const equalShare = (amountNum / activeMembers.length).toFixed(2);
    
    const newAmounts = { ...splitAmounts };
    members.forEach((m) => {
      if (selectedMembers[m._id]) {
        newAmounts[m._id] = equalShare;
      } else {
        newAmounts[m._id] = "";
      }
    });

    // Adjust the last person's share to prevent rounding errors
    const calculatedSum = parseFloat(equalShare) * activeMembers.length;
    const difference = amountNum - calculatedSum;
    if (Math.abs(difference) > 0.001 && activeMembers.length > 0) {
      const lastMemberId = activeMembers[activeMembers.length - 1]._id;
      newAmounts[lastMemberId] = (parseFloat(equalShare) + difference).toFixed(2);
    }

    setSplitAmounts(newAmounts);
  };

  const handleToggleMember = (memberId) => {
    setSelectedMembers((prev) => {
      const next = { ...prev, [memberId]: !prev[memberId] };
      // Clear split amount if deselected
      if (!next[memberId]) {
        setSplitAmounts((prevAmt) => ({ ...prevAmt, [memberId]: "" }));
      }
      return next;
    });
  };

  const handleAmountChange = (memberId, val) => {
    setSplitAmounts((prev) => ({ ...prev, [memberId]: val }));
    setValidationError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    const amountNum = parseFloat(totalAmount);
    const result = expenseSchema.safeParse({
      totalAmount: amountNum,
      description,
      category,
    });

    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    if (activeMembers.length === 0) {
      setValidationError("Please select at least one participant");
      return;
    }

    // Build splits array
    const splits = [];
    let splitSum = 0;

    for (const member of activeMembers) {
      const splitAmt = parseFloat(splitAmounts[member._id]);
      if (isNaN(splitAmt) || splitAmt <= 0) {
        setValidationError(`Please enter a valid split amount for ${member.name}`);
        return;
      }
      splits.push({
        user: member._id,
        amount: splitAmt,
      });
      splitSum += splitAmt;
    }

    // Verify sum
    if (Math.abs(splitSum - amountNum) > 0.01) {
      setValidationError(
        `Sum of splits (₹${splitSum.toFixed(2)}) does not match the total amount (₹${amountNum.toFixed(2)})`
      );
      return;
    }

    const payload = {
      totalAmount: amountNum,
      description: description.trim(),
      category,
      splits,
    };

    const res = await onSubmit(payload);
    if (res?.success) {
      showToast("Group expense added successfully!", "success");
      onClose();
    } else {
      setValidationError(res?.error || "Failed to save group expense");
      showToast(res?.error || "Failed to save group expense", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg glass-strong rounded-2xl animate-slideUp overflow-hidden border border-white/[0.08] shadow-glass"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-surface-200/50">
          <h2 className="text-lg font-brand font-semibold text-gray-100 flex items-center gap-2">
            Add Group Expense
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto dark-scrollbar pr-1">
            {validationError && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
                <Info size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Total Amount */}
            <div className="space-y-1.5">
              <label htmlFor="expense-amount" className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Total Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">₹</span>
                <input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="expense-desc" className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Description *
              </label>
              <input
                id="expense-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, Hotel bill, Cab fare, etc."
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                required
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Category
              </label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      category === cat.value
                        ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] border border-white/[0.05]"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/[0.06] my-4" />

            {/* Participants list */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  Split With Members
                </label>
                
                {totalAmount && parseFloat(totalAmount) > 0 && activeMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSplitEqually}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-all duration-200"
                  >
                    <Divide size={12} />
                    Split Equally
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto dark-scrollbar pr-1">
                {members.map((member) => {
                  const isChecked = !!selectedMembers[member._id];
                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      {/* Checkbox + Username */}
                      <label className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMember(member._id)}
                          className="w-4 h-4 rounded border-gray-600 text-emerald-500 bg-surface-100 focus:ring-emerald-500/40 cursor-pointer"
                        />
                        
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isChecked ? "text-gray-200" : "text-gray-500"}`}>
                            {member.name}
                          </p>
                          <p className="text-[10px] text-gray-600 truncate">@{member.username}</p>
                        </div>
                      </label>

                      {/* Split Input amount */}
                      {isChecked && (
                        <div className="relative w-28 shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={splitAmounts[member._id] || ""}
                            onChange={(e) => handleAmountChange(member._id, e.target.value)}
                            className="w-full h-8 pl-6 pr-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-right text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] bg-surface-200/30 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-white/[0.08] text-gray-400 text-sm font-medium hover:bg-white/[0.04] hover:text-gray-200 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim() || !totalAmount}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
