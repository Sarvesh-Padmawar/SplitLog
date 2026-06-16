import React from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight, User } from "lucide-react";

/**
 * GroupCard Component
 * Displays summary details of a single group in the list view.
 */
export default function GroupCard({ group }) {
  const { _id, name, description, members, createdBy } = group;
  const memberCount = members?.length || 0;

  return (
    <Link
      to={`/groups/${_id}`}
      className="group block glass rounded-2xl p-6 hover:border-emerald-500/30 hover:shadow-glow hover:translate-y-[-2px] transition-all duration-300"
    >
      <div className="flex justify-between items-start gap-4">
        {/* Group details */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-100 group-hover:text-emerald-400 truncate transition duration-300">
              {name}
            </h3>
          </div>

          <p className="text-sm text-gray-400 line-clamp-2 min-h-[40px]">
            {description || "No description provided."}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-500">
            {/* Member count */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
              <Users size={12} className="text-emerald-500" />
              <span className="font-semibold text-gray-300">{memberCount}</span>
              <span>{memberCount === 1 ? "member" : "members"}</span>
            </div>

            {/* Created by */}
            {createdBy && (
              <div className="flex items-center gap-1">
                <User size={12} className="text-teal-500" />
                <span>By:</span>
                <span className="font-medium text-gray-400 truncate max-w-[120px]">
                  {createdBy.name || createdBy.username || "Unknown"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action button hover slide */}
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-gray-500 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-300 shrink-0 self-center">
          <ChevronRight size={18} className="transform group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
