import React, { useState, useEffect } from "react";
import { X, Plus, Info } from "lucide-react";
import { z } from "zod";
import { showToast } from "../../../components/toastStore";

// Zod Schema for validation
const groupSchema = z.object({
  name: z.string().trim().min(1, "Group Name is required").max(50, "Group Name must be 50 characters or less"),
  description: z.string().trim().max(200, "Description must be 200 characters or less").optional(),
});

/**
 * CreateGroupModal Component
 * Renders the modal overlay with a form to create a new group.
 */
export default function CreateGroupModal({ open, onClose, onSubmit, loading }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setValidationError("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate inputs
    const result = groupSchema.safeParse({ name, description });
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    // Call submit action
    const res = await onSubmit({ name: name.trim(), description: description.trim() });
    if (res?.success) {
      showToast("Group created successfully!", "success");
      onClose();
    } else {
      setValidationError(res?.error || "Failed to create group");
      showToast(res?.error || "Failed to create group", "error");
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
            Create New Group
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
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
                <Info size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Group Name input */}
            <div className="space-y-1.5">
              <label htmlFor="group-name" className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Group Name *
              </label>
              <input
                id="group-name"
                type="text"
                placeholder="e.g. Goa Trip, Flatmates, Weekend Trek"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-200"
                required
              />
            </div>

            {/* Description input */}
            <div className="space-y-1.5">
              <label htmlFor="group-desc" className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Description
              </label>
              <textarea
                id="group-desc"
                placeholder="Describe this group's expenses..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-200 resize-none"
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
              disabled={loading || !name.trim()}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
