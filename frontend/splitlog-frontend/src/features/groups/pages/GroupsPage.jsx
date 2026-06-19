import React, { useEffect, useState } from "react";
import { Plus, FolderPlus, AlertCircle, RefreshCw } from "lucide-react";
import { useGroups } from "../hooks/useGroups";
import GroupCard from "../components/GroupCard";
import CreateGroupModal from "../components/CreateGroupModal";
import { SkeletonCard } from "../../../components/Skeleton";
import { useSocket } from "../../../services/socket/useSocket";

/**
 * GroupsPage Component
 * Main page view that lists all groups and allows opening the create group modal.
 */
export default function GroupsPage() {
  const { socket } = useSocket();
  const { groups, loading, error, fetchGroups, createGroup, actionLoading } = useGroups();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Listen for group update socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("group_created", fetchGroups);
    socket.on("group_added", fetchGroups);
    socket.on("group_removed", fetchGroups);
    socket.on("group_updated", fetchGroups);

    return () => {
      socket.off("group_created", fetchGroups);
      socket.off("group_added", fetchGroups);
      socket.off("group_removed", fetchGroups);
      socket.off("group_updated", fetchGroups);
    };
  }, [socket, fetchGroups]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-16 py-8 animate-fadeIn">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-brand font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Groups
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your shared expense groups and split bills with friends.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create Group
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        // Loading Skeleton Cards Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        // Error Warning State
        <div className="glass rounded-2xl p-8 text-center max-w-lg mx-auto border border-red-500/10">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-200">Failed to load groups</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">{error}</p>
          <button
            onClick={fetchGroups}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] hover:border-emerald-500/30 text-gray-400 hover:text-emerald-400 text-sm font-medium transition-all duration-200"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      ) : groups.length === 0 ? (
        // Empty State CTA
        <div className="glass rounded-2xl p-12 text-center max-w-md mx-auto border border-white/[0.04] space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mx-auto shadow-glow">
            <FolderPlus size={28} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-brand font-bold text-gray-200">No groups yet</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Groups make it easy to track shared trips, flat expenses, or restaurant dinners with friends.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-400 font-semibold text-sm transition-all duration-200"
          >
            <Plus size={14} />
            Create Your First Group
          </button>
        </div>
      ) : (
        // Groups Grid Layout
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createGroup}
        loading={actionLoading}
      />
    </div>
  );
}
