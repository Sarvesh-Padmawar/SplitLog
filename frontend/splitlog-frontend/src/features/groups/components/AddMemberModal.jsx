import React, { useState, useEffect } from "react";
import { X, UserPlus, Info } from "lucide-react";
import { z } from "zod";
import api from "../../../shared/services/axios";
import { extractData } from "../../../shared/utils/apiHelper";
import { showToast } from "../../../components/toastStore";

// Zod validation schema for raw userId
const memberSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required").length(24, "User ID must be a valid 24-character hex ID"),
});

/**
 * AddMemberModal Component
 * Renders the modal overlay for adding a member to the group.
 */
export default function AddMemberModal({ open, onClose, onSubmit, groupMembers, loading }) {
  const [userId, setUserId] = useState("");
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");

  // Fetch friends list when the modal is opened
  useEffect(() => {
    if (!open) {
      setUserId("");
      setSelectedFriendId("");
      setValidationError("");
      return;
    }

    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await api.get("/friends");
        const data = extractData(res);
        setFriends(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch friends", err);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [open]);

  if (!open) return null;

  // Filter friends to exclude those who are already group members
  const memberIds = new Set(groupMembers?.map((m) => m._id) || []);
  const addableFriends = friends.filter((friend) => !memberIds.has(friend._id));

  // Sync selected friend with userId input
  const handleFriendChange = (e) => {
    const friendId = e.target.value;
    setSelectedFriendId(friendId);
    setUserId(friendId);
    setValidationError("");
  };

  const handleManualIdChange = (e) => {
    const value = e.target.value;
    setUserId(value);
    setSelectedFriendId(""); // Deselect dropdown if typing manually
    setValidationError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate inputs
    const result = memberSchema.safeParse({ userId });
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    const res = await onSubmit(userId.trim());
    if (res?.success) {
      showToast("Member added successfully!", "success");
      onClose();
    } else {
      setValidationError(res?.error || "Failed to add member");
      showToast(res?.error || "Failed to add member", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md glass-strong rounded-2xl animate-slideUp overflow-hidden border border-white/[0.08] shadow-glass"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-surface-200/50">
          <h2 className="text-lg font-brand font-semibold text-gray-100 flex items-center gap-2">
            Add Group Member
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
          <div className="px-6 py-5 space-y-4">
            {validationError && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn animate-duration-200">
                <Info size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Option A: Select from Friends List */}
            <div className="space-y-1.5">
              <label htmlFor="friend-select" className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Select from Friends
              </label>
              {loadingFriends ? (
                <div className="w-full h-11 bg-white/[0.02] border border-white/[0.08] rounded-xl flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              ) : addableFriends.length > 0 ? (
                <select
                  id="friend-select"
                  value={selectedFriendId}
                  onChange={handleFriendChange}
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-200"
                >
                  <option value="" className="bg-surface-200 text-gray-500">
                    -- Pick a friend --
                  </option>
                  {addableFriends.map((friend) => (
                    <option key={friend._id} value={friend._id} className="bg-surface-200 text-gray-200">
                      {friend.name} (@{friend.username})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-gray-500">
                  No friends available to add (either all are already in this group, or your friends list is empty).
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]"></div>
              </div>
              <div className="relative bg-[#0d1522] px-3 text-[10px] uppercase font-bold text-gray-600 tracking-wider">
                Or enter manually
              </div>
            </div>

            {/* Option B: Enter User ID Manually */}
            <div className="space-y-1.5">
              <label htmlFor="manual-userid" className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                User ID *
              </label>
              <input
                id="manual-userid"
                type="text"
                placeholder="Enter 24-character User ID"
                value={userId}
                onChange={handleManualIdChange}
                maxLength={24}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-200"
                required
              />
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
              disabled={loading || !userId.trim()}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
