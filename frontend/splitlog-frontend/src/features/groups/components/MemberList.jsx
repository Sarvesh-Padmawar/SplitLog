import React from "react";
import { Trash2, Crown, Mail } from "lucide-react";

/**
 * MemberList Component
 * Displays the list of members in a group, showing role badges and remove options.
 */
export default function MemberList({ members, creatorId, currentUserId, onRemoveMember, actionLoading }) {
  // Check if current user is the creator of this group
  const isCurrentUserCreator = currentUserId === creatorId;

  return (
    <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Title */}
      <div className="px-6 py-4 border-b border-white/[0.06] bg-surface-200/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider font-brand">
          Group Members ({members?.length || 0})
        </h3>
      </div>

      {/* Members list */}
      <div className="divide-y divide-white/[0.04]">
        {members && members.length > 0 ? (
          members.map((member) => {
            const isMemberCreator = member._id === creatorId;
            const isCurrentUser = member._id === currentUserId;
            
            return (
              <div
                key={member._id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors duration-200"
              >
                {/* User avatar and details */}
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatar?.url ? (
                    <img
                      src={member.avatar.url}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-500/15 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 font-semibold font-brand shrink-0">
                      {member.name?.[0]?.toUpperCase() || "M"}
                    </div>
                  )}
                  
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-100 truncate">
                        {member.name} {isCurrentUser && <span className="text-gray-500 text-xs font-normal font-sans">(You)</span>}
                      </span>

                      {isMemberCreator && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Crown size={10} className="shrink-0" />
                          Creator
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                      <Mail size={12} className="shrink-0 text-gray-600" />
                      <span className="truncate">{member.email}</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-500">@{member.username}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Allow creator to remove other members */}
                {isCurrentUserCreator && !isMemberCreator && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
                        onRemoveMember(member._id);
                      }
                    }}
                    disabled={actionLoading}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Remove Member"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No members in this group.
          </div>
        )}
      </div>
    </div>
  );
}
