import { useEffect, useState } from "react";
import api from "../../shared/services/axios";
import DashboardLeft from "./DashbordLeft";
import DashboardRight from "./DashboardRight";
import { extractData } from "../../shared/utils/apiHelper";

export default function FriendsDashboard() {
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [mode, setMode] = useState("pending");

  /* ================= FETCH FRIENDS + LEDGER ================= */
  const fetchFriends = async () => {
    try {
      setLoadingFriends(true);
      const [friendsRes, ledgerRes] = await Promise.all([
        api.get("/friends"),
        api.get("/ledger"),
      ]);

      // Build a map of friendId → balance from ledger
      const balanceMap = {};
      ledgerRes.data.forEach((entry) => {
        balanceMap[entry.friend._id] = {
          youOwe: entry.youOwe,
          theyOwe: entry.theyOwe,
          netBalance: entry.netBalance,
        };
      });

      // Merge balance data into friends
      const friendsData = extractData(friendsRes);
      const enrichedFriends = (Array.isArray(friendsData) ? friendsData : []).map((f) => ({
        ...f,
        youOwe: balanceMap[f._id]?.youOwe || 0,
        theyOwe: balanceMap[f._id]?.theyOwe || 0,
        netBalance: balanceMap[f._id]?.netBalance || 0,
        balance: balanceMap[f._id]?.netBalance || 0,
      }));

      setFriends(enrichedFriends);
    } catch (err) {
      console.error("Failed to fetch friends", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  return (
    <div className="grid grid-cols-12 gap-6 px-6 lg:px-16 py-6 max-w-7xl mx-auto animate-fadeIn isolate ">
      {/* LEFT */}
      <DashboardLeft
        friends={friends}
        loadingFriends={loadingFriends}
      />

      {/* RIGHT */}
      <DashboardRight
        mode={mode}
        setMode={setMode}
        fetchFriends={fetchFriends}
        friends={friends}
      />
    </div>
  );
}

