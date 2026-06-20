import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Folder, Info, AlertTriangle, Shield, Receipt, Plus, DollarSign, ArrowRight, CheckCircle2 } from "lucide-react";
import { useGroups } from "../hooks/useGroups";
import { useAuth } from "../../../modules/auth/hooks/useAuth";
import { useSocket } from "../../../services/socket/useSocket";
import { showToast } from "../../../components/toastStore";
import MemberList from "../components/MemberList";
import AddMemberModal from "../components/AddMemberModal";
import CreateGroupExpenseModal from "../components/CreateGroupExpenseModal";
import { SkeletonRow } from "../../../components/Skeleton";

const CATEGORIES = [
  { value: "food", emoji: "🍔" },
  { value: "travel", emoji: "✈️" },
  { value: "rent", emoji: "🏠" },
  { value: "shopping", emoji: "🛍️" },
  { value: "other", emoji: "📌" },
];

/**
 * GroupDetailsPage Component
 * Shows details of a specific group, listing group expenses, group balances, group members, and owner tools.
 */
export default function GroupDetailsPage() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useAuth();
  
  const {
    groupDetails,
    loadingDetails,
    detailsError,
    fetchGroupDetails,
    addMember,
    removeMember,
    groupExpenses,
    loadingExpenses,
    expensesError,
    fetchGroupExpenses,
    createGroupExpense,
    groupBalances,
    groupSettlements,
    totalGroupExpenses,
    loadingBalances,
    balancesError,
    fetchGroupBalances,
    actionLoading,
    leaveGroup,
    settleUpGroup,
  } = useGroups();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses"); // "expenses" or "balances"

  // Fetch group details and expenses on mount and when groupId changes
  useEffect(() => {
    if (groupId) {
      fetchGroupDetails(groupId).catch(() => {});
      fetchGroupExpenses(groupId).catch(() => {});
    }
  }, [groupId, fetchGroupDetails, fetchGroupExpenses]);

  // Fetch balances whenever the tab switches to "balances"
  useEffect(() => {
    if (groupId && activeTab === "balances") {
      fetchGroupBalances(groupId).catch(() => {});
    }
  }, [groupId, activeTab, fetchGroupBalances]);

  // Listen to socket events for real-time group and expense sync
  useEffect(() => {
    if (!socket || !groupId) return;

    const refreshGroupData = () => {
      fetchGroupExpenses(groupId).catch(() => {});
      if (activeTab === "balances") {
        fetchGroupBalances(groupId).catch(() => {});
      }
    };

    const handleGroupUpdated = (updatedGroup) => {
      const gid = updatedGroup?._id || updatedGroup?.id || updatedGroup;
      if (gid?.toString() === groupId.toString()) {
        fetchGroupDetails(groupId).catch(() => {});
        refreshGroupData();
      }
    };

    const handleGroupRemoved = (payload) => {
      const gid = payload?.groupId || payload?.id || payload;
      if (gid?.toString() === groupId.toString()) {
        showToast("You have been removed from this group.", "info");
        navigate("/groups");
      }
    };

    const handleExpenseEvent = (expense) => {
      const expGroup = expense?.group?._id || expense?.group;
      if (!expGroup || expGroup.toString() === groupId.toString()) {
        refreshGroupData();
      }
    };

    socket.on("group_updated", handleGroupUpdated);
    socket.on("group_removed", handleGroupRemoved);
    socket.on("expense_created", handleExpenseEvent);
    socket.on("expense_updated", handleExpenseEvent);
    socket.on("expense_deleted", handleExpenseEvent);

    return () => {
      socket.off("group_updated", handleGroupUpdated);
      socket.off("group_removed", handleGroupRemoved);
      socket.off("expense_created", handleExpenseEvent);
      socket.off("expense_updated", handleExpenseEvent);
      socket.off("expense_deleted", handleExpenseEvent);
    };
  }, [socket, groupId, activeTab, fetchGroupDetails, fetchGroupExpenses, fetchGroupBalances, navigate]);

  if (loadingDetails) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-16 py-8 space-y-6 animate-fadeIn">
        {/* Back Link skeleton */}
        <div className="h-4 w-32 skeleton" />
        
        {/* Header card skeleton */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="h-6 w-48 skeleton" />
          <div className="h-4 w-96 skeleton" />
        </div>

        {/* Member/Expenses list skeletons */}
        <div className="glass rounded-2xl p-6 space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (detailsError || !groupDetails) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-400 mx-auto shadow-glow-red mb-6">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-xl font-brand font-bold text-gray-200">Group not accessible</h2>
        <p className="text-sm text-gray-500 mt-2 mb-8">
          {detailsError || "The group you are looking for does not exist or you do not have permission to access it."}
        </p>
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-white/[0.08] hover:border-emerald-500/30 text-gray-400 hover:text-emerald-400 text-sm font-medium transition-all duration-200"
        >
          <ArrowLeft size={14} />
          Back to Groups
        </Link>
      </div>
    );
  }

  const { name, description, createdBy, members } = groupDetails;
  
  // Resolve creator and check ownership
  const creatorId = createdBy;
  const currentUserId = user?.id || user?._id;
  const isCurrentUserCreator = currentUserId === creatorId;

  // Handle member actions
  const handleAddMember = async (userIdToAdd) => {
    const res = await addMember(groupId, userIdToAdd);
    if (res.success && activeTab === "balances") {
      fetchGroupBalances(groupId).catch(() => {});
    }
    return res;
  };

  const handleRemoveMember = async (userIdToRemove) => {
    const res = await removeMember(groupId, userIdToRemove);
    if (res.success) {
      // Refresh expenses and balances to keep synced
      fetchGroupExpenses(groupId).catch(() => {});
      if (activeTab === "balances") {
        fetchGroupBalances(groupId).catch(() => {});
      }
    }
    return res;
  };

  // Handle expense actions
  const handleCreateExpense = async (payload) => {
    const res = await createGroupExpense(groupId, payload);
    if (res.success) {
      // Refresh expenses and balances
      fetchGroupExpenses(groupId).catch(() => {});
      if (activeTab === "balances") {
        fetchGroupBalances(groupId).catch(() => {});
      }
    }
    return res;
  };

  // Handle leave group action
  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    const res = await leaveGroup(groupId);
    if (res.success) {
      showToast("You have left the group successfully.", "success");
      navigate("/groups");
    } else {
      showToast(res.error || "Failed to leave group.", "error");
    }
  };

  // Handle group settle up action
  const handleSettleUpGroup = async (toUserId, amount, toUserName) => {
    if (!window.confirm(`Record a payment of ₹${amount.toFixed(2)} to ${toUserName}? This will create a pending verification request.`)) return;
    const res = await settleUpGroup(groupId, { toUserId, amount });
    if (res.success) {
      showToast("Settlement request recorded successfully! Waiting for recipient verification.", "success");
      fetchGroupBalances(groupId).catch(() => {});
    } else {
      showToast(res.error || "Failed to settle up.", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-16 py-8 animate-fadeIn space-y-6">
      {/* Back to Groups Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-400 transition-colors duration-200"
        >
          <ArrowLeft size={16} />
          <span>Back to Groups</span>
        </Link>

        {/* Tab Navigation Toggle Control */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05] w-full max-w-[240px]">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 border ${
              activeTab === "expenses"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15 shadow-glow"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.02] border-transparent"
            }`}
          >
            <Receipt size={13} />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("balances")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 border ${
              activeTab === "balances"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15 shadow-glow"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.02] border-transparent"
            }`}
          >
            <DollarSign size={13} />
            Balances
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Group Header & Expenses or Balances list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Header Card */}
          <div className="glass rounded-2xl p-6 border border-white/[0.06] relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
            
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <Folder size={22} />
              </div>
              
              <div className="space-y-1 min-w-0">
                <h2 className="text-xl font-brand font-bold text-gray-100 truncate">
                  {name}
                </h2>
                <p className="text-sm text-gray-400">
                  {description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Owner Metadata Info */}
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Shield size={13} className="text-emerald-500" />
                <span>Group Access Mode:</span>
                <span className="font-semibold text-emerald-400">Members-Only</span>
              </div>
              
              {isCurrentUserCreator && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider scale-95">
                  You created this group
                </span>
              )}
            </div>
          </div>

          {/* TAB 1: EXPENSES VIEW */}
          {activeTab === "expenses" && (
            <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Section Header */}
              <div className="px-6 py-4 border-b border-white/[0.06] bg-surface-200/50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-brand flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-500" />
                  Expenses
                </h3>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-400 text-xs font-semibold transition"
                >
                  <Plus size={14} />
                  Add Expense
                </button>
              </div>

              {/* Expenses List body */}
              <div className="divide-y divide-white/[0.04]">
                {loadingExpenses ? (
                  <div className="p-6 space-y-4">
                    <SkeletonRow />
                    <SkeletonRow />
                  </div>
                ) : expensesError ? (
                  <div className="p-6 text-center text-sm text-red-400 flex items-center justify-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{expensesError}</span>
                  </div>
                ) : groupExpenses.length === 0 ? (
                  <div className="px-6 py-12 text-center space-y-3">
                    <p className="text-sm text-gray-500 font-sans">No expenses recorded for this group yet.</p>
                    <button
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 text-xs font-semibold transition animate-fadeIn"
                    >
                      Add First Expense
                    </button>
                  </div>
                ) : (
                  groupExpenses.map((expense) => {
                    const categoryObj = CATEGORIES.find(c => c.value === expense.category) || { emoji: "📌", label: "Other" };
                    const formattedDate = new Date(expense.date || expense.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    });

                    return (
                      <Link
                        key={expense._id}
                        to={`/expense/${expense._id}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.04] transition-all duration-200 border-l-2 border-transparent hover:border-emerald-500 animate-fadeIn"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Category Emoji Badge */}
                          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-lg shrink-0">
                            {categoryObj.emoji}
                          </div>

                          {/* Title and metadata */}
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-gray-100 truncate group-hover:text-emerald-400">
                              {expense.description}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              Paid by <span className="text-gray-400 font-medium">{expense.paidBy?.name || "Unknown"}</span> • {formattedDate}
                            </p>
                          </div>
                        </div>

                        {/* Expense Amount & Perspective */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-emerald-400 font-sans">
                            ₹{expense.totalAmount?.toFixed(2)}
                          </span>
                          <p className={`text-[10px] font-semibold font-sans mt-0.5 ${expense.currentUserRole === "payer" ? "text-emerald-500" : "text-amber-500"}`}>
                            {expense.currentUserRole === "payer" 
                              ? `You paid ₹${expense.totalAmount?.toFixed(2)}` 
                              : `Your share ₹${expense.currentUserShare?.toFixed(2)}`}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BALANCES VIEW */}
          {activeTab === "balances" && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="glass rounded-2xl p-6 border border-white/[0.06] flex items-center justify-between relative overflow-hidden bg-gradient-to-r from-surface-100 to-surface-50 animate-fadeIn">
                <div className="space-y-1 relative z-10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Group Expenses</p>
                  <p className="text-3xl font-brand font-bold text-gray-100 font-sans">
                    ₹{totalGroupExpenses?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 relative z-10 shrink-0">
                  <Receipt size={22} />
                </div>
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* Grid: Member Balances & settlements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Member Balances List */}
                <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col animate-fadeIn">
                  <div className="px-5 py-4 border-b border-white/[0.06] bg-surface-200/50">
                    <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-brand">
                      Member Balances
                    </h3>
                  </div>

                  <div className="divide-y divide-white/[0.04] flex-1">
                    {loadingBalances ? (
                      <div className="p-5 space-y-4">
                        <SkeletonRow />
                        <SkeletonRow />
                      </div>
                    ) : balancesError ? (
                      <div className="p-5 text-xs text-red-400 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{balancesError}</span>
                      </div>
                    ) : groupBalances.length === 0 ? (
                      <p className="p-5 text-center text-xs text-gray-500 font-sans">No member balances calculated</p>
                    ) : (
                      groupBalances.map(({ user: balanceUser, balance }) => {
                        const isPositive = balance > 0.01;
                        const isNegative = balance < -0.01;
                        
                        return (
                          <div key={balanceUser._id} className="flex justify-between items-center px-5 py-4 hover:bg-white/[0.01] transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-200 truncate">{balanceUser.name}</p>
                              <p className="text-[10px] text-gray-500 truncate">{balanceUser.email}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={`text-sm font-bold font-sans ${isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-gray-500"}`}>
                                {isPositive ? "+" : ""}₹{Math.abs(balance).toFixed(2)}
                              </p>
                              <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">
                                {isPositive ? "Should receive" : isNegative ? "Owes" : "Settled"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Optimized Settlements Recommendations */}
                <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col animate-fadeIn">
                  <div className="px-5 py-4 border-b border-white/[0.06] bg-surface-200/50">
                    <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-brand">
                      Recommended Settlements
                    </h3>
                  </div>

                  <div className="divide-y divide-white/[0.04] p-4 space-y-3 flex-1 overflow-y-auto max-h-[350px] dark-scrollbar">
                    {loadingBalances ? (
                      <div className="space-y-4 py-2">
                        <SkeletonRow />
                        <SkeletonRow />
                      </div>
                    ) : balancesError ? (
                      <div className="text-xs text-red-400 flex items-center gap-1.5 py-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{balancesError}</span>
                      </div>
                    ) : groupSettlements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-12 space-y-3 animate-fadeIn">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow">
                          <CheckCircle2 size={22} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-300">All Settled Up!</p>
                          <p className="text-xs text-gray-500 max-w-[180px] mx-auto leading-relaxed">
                            No optimized transactions needed inside this group.
                          </p>
                        </div>
                      </div>
                    ) : (
                      groupSettlements.map((settlement, idx) => {
                        const isDebtor = settlement.from._id.toString() === currentUserId.toString();
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2 hover:border-emerald-500/10 hover:shadow-glow transition-all duration-200 animate-fadeIn"
                          >
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="font-semibold text-gray-300 truncate max-w-[100px]">{settlement.from.name}</span>
                              <span className="flex items-center gap-1 font-bold text-emerald-500 uppercase tracking-wider text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 shrink-0">
                                owes <ArrowRight size={10} />
                              </span>
                              <span className="font-semibold text-gray-300 truncate max-w-[100px]">{settlement.to.name}</span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.02]">
                              <span className="text-[10px] text-gray-500 uppercase font-semibold">Amount to Pay</span>
                              <span className="text-sm font-bold text-emerald-400 font-sans">
                                ₹{settlement.amount.toFixed(2)}
                              </span>
                            </div>

                            {isDebtor && (
                              <button
                                onClick={() => handleSettleUpGroup(settlement.to._id, settlement.amount, settlement.to.name)}
                                disabled={actionLoading}
                                className="w-full mt-2 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/15 text-emerald-400 text-xs font-semibold transition-all duration-200 disabled:opacity-50"
                              >
                                Settle Up
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Actions & Member Panel */}
        <div className="space-y-6">
          {/* Admin Panel */}
          {isCurrentUserCreator ? (
            <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
              <h3 className="font-brand font-semibold text-gray-200 text-sm uppercase tracking-wider">
                Group Admin Tools
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                As the group creator, you can invite new members to this group using their User ID, or remove existing members.
              </p>
              
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300"
              >
                <UserPlus size={16} />
                Add Group Member
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="glass rounded-2xl p-6 border border-white/[0.06] flex items-start gap-3">
                <Info size={16} className="text-gray-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Member Access
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    You are viewing this group as a member. Only the creator has privileges to add or remove members.
                  </p>
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
                <h3 className="font-brand font-semibold text-gray-200 text-sm uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  Leave Group
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You can leave this group if your balance is exactly settled up (₹0.00). If you owe money or are owed money, you must settle up first.
                </p>
                
                <button
                  onClick={handleLeaveGroup}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 text-red-400 font-semibold text-sm transition-all duration-300 disabled:opacity-50"
                >
                  Leave Group
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <MemberList
            members={members}
            creatorId={creatorId}
            currentUserId={currentUserId}
            onRemoveMember={handleRemoveMember}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMember}
        groupMembers={members}
        loading={actionLoading}
      />

      {/* Create Group Expense Modal */}
      <CreateGroupExpenseModal
        open={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleCreateExpense}
        members={members}
        loading={actionLoading}
      />
    </div>
  );
}
