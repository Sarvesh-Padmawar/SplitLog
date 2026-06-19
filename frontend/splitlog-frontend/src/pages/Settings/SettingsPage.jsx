import React, { useState } from "react";
import { User as UserIcon, ShieldAlert, Save, ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../modules/auth/hooks/useAuth";
import { userApi } from "../../modules/users/api/user.api";
import { showToast } from "../../components/toastStore";

/**
 * SettingsPage Component
 * Exposes profile information settings (name, username, email) and password management.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, setAuthUser } = useAuth();
  
  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Name cannot be empty.", "error");
      return;
    }

    setProfileLoading(true);
    try {
      const data = await userApi.updateProfile({ name });
      setAuthUser(data.user);
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update profile.", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All password fields are required.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    setPasswordLoading(true);
    try {
      await userApi.updatePassword({ currentPassword, newPassword });
      showToast("Password changed successfully!", "success");
      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to change password.", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const isGoogleUser = user?.provider === "google";

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-16 py-8 animate-fadeIn">
      {/* Back Link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-emerald-400 mb-6 transition-colors duration-200"
      >
        <ArrowLeft size={14} strokeWidth={2.5} />
        Back
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal profile and account credentials.
        </p>
      </div>

      {/* Settings Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Card Overview */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/[0.04] flex flex-col items-center text-center space-y-4 h-fit">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-semibold border border-emerald-500/20 shadow-glow">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-md font-bold text-gray-100">{user?.name || "User"}</h2>
              <p className="text-xs text-gray-500">@{user?.username || "username"}</p>
            </div>
            <div className="w-full pt-4 border-t border-white/[0.04]">
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <p className="text-[10px] text-emerald-400 mt-1 uppercase font-semibold tracking-wider">
                {isGoogleUser ? "Google Account" : "Password Account"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Card 1: Profile Details */}
          <div className="glass rounded-2xl p-6 border border-white/[0.04]">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 pb-3 border-b border-white/[0.04]">
                <UserIcon size={16} className="text-emerald-400" />
                Profile Details
              </h3>

              {/* Display Name */}
              <div className="space-y-2">
                <label htmlFor="display-name" className="block text-xs font-semibold text-gray-400">
                  Display Name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface-200 border border-white/[0.06] focus:border-emerald-500/40 text-gray-100 text-sm placeholder-gray-600 focus:outline-none transition-all duration-200"
                  placeholder="Enter your name"
                  required
                />
              </div>

              {/* Username (Immutable) */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-xs font-semibold text-gray-400">
                  Username (Locked)
                </label>
                <input
                  id="username"
                  type="text"
                  value={user?.username || ""}
                  disabled
                  className="w-full h-11 px-4 rounded-xl bg-surface-300 border border-white/[0.04] text-gray-500 text-sm cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1.5">
                  <ShieldAlert size={12} className="text-gray-500" />
                  Usernames are permanent and cannot be changed after registration.
                </p>
              </div>

              {/* Email Address (Immutable in Phase 1) */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-400">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full h-11 px-4 rounded-xl bg-surface-300 border border-white/[0.04] text-gray-500 text-sm cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Email change will be supported in the next update.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t border-white/[0.04]">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50"
                >
                  <Save size={16} />
                  {profileLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Change Password */}
          <div className="glass rounded-2xl p-6 border border-white/[0.04]">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 pb-3 border-b border-white/[0.04]">
              <Lock size={16} className="text-emerald-400" />
              Update Password
            </h3>

            {isGoogleUser ? (
              <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/90 text-xs leading-relaxed">
                Your SplitLog account is linked with Google OAuth. Your password and credentials are managed directly through Google Settings and cannot be modified here.
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <label htmlFor="current-password" className="block text-xs font-semibold text-gray-400">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-surface-200 border border-white/[0.06] focus:border-emerald-500/40 text-gray-100 text-sm placeholder-gray-600 focus:outline-none transition-all duration-200"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label htmlFor="new-password" className="block text-xs font-semibold text-gray-400">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-surface-200 border border-white/[0.06] focus:border-emerald-500/40 text-gray-100 text-sm placeholder-gray-600 focus:outline-none transition-all duration-200"
                    placeholder="Enter new password (min. 6 characters)"
                    required
                  />
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-400">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-surface-200 border border-white/[0.06] focus:border-emerald-500/40 text-gray-100 text-sm placeholder-gray-600 focus:outline-none transition-all duration-200"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-4 border-t border-white/[0.04]">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
