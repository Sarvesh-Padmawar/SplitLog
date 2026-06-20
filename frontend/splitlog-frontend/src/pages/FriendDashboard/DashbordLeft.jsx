import FriendCard from "../../features/friends/components/FriendCard";
import { SkeletonCard } from "../../components/Skeleton";
import { Users } from "lucide-react";

function DashboardLeft({ friends, loadingFriends }) {
  return (
    <div className="col-span-12 lg:col-span-8 w-full">
      <div className="glass rounded-2xl h-[75vh] p-5 flex flex-col isolate relative z-0 overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/15">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100">Your Friends</h2>
          {!loadingFriends && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-gray-400 font-medium">
              {friends.length}
            </span>
          )}
        </div>

        {/* Friend Cards */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-1 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingFriends ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : friends.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">No friends yet</p>
                <p className="text-xs text-gray-600 mt-1">Search for users to add friends</p>
              </div>
            ) : (
              friends.map((friend) => {
                return (
                  <FriendCard
                    key={friend._id}
                    friend={{
                      _id: friend._id,
                      name: friend.name,
                      username: friend.username,
                      avatar: friend.avatar,
                      youOwe: friend.youOwe || 0,
                      theyOwe: friend.theyOwe || 0,
                      netBalance: friend.netBalance || 0,
                      pendingExpenses: friend.pendingExpenses || 0,
                      lastActivity: friend.lastActivity,
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLeft;
