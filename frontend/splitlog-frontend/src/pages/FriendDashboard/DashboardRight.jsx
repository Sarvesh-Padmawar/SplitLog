import { useState, useEffect } from "react";
import { Search, UserPlus, Clock, Check, X } from "lucide-react";
import api from "../../shared/services/axios";
import { showToast } from "../../components/toastStore";
import { extractData } from "../../shared/utils/apiHelper";

function DashboardRight({ mode, setMode, fetchFriends, friends = [] }) {
  // Calculate owe summary totals from friends data
  const totalYouOwe = friends.reduce((sum, f) => sum + (Number(f.youOwe) || 0), 0);
  const totalTheyOwe = friends.reduce((sum, f) => sum + (Number(f.theyOwe) || 0), 0);
  const totalNet = totalTheyOwe - totalYouOwe;
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  /* ================= FETCH PENDING REQUESTS ================= */
  useEffect(() => {
    if (mode !== "pending") return;

    const fetchPendingRequests = async () => {
      try {
        setLoadingRequests(true);
        const res = await api.get("/friends/getrequests");
        const requests = extractData(res);
        setPendingRequests(Array.isArray(requests) ? requests : []);
      } catch (err) {
        console.error("Failed to fetch requests", err);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchPendingRequests();
  }, [mode]);

  /* ================= SEARCH USERS ================= */
  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearched(true);
    setSearchLoading(true);
    setSearchResult(null);
    setRequestSent(false);

    try {
      const res = await api.get(`/friends/search/${query}`);
      setSearchResult(res.data);
    } catch {
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  /* ================= SEND FRIEND REQUEST ================= */
  const sendFriendRequest = async (toUserId) => {
    if (sendingRequest) return;

    try {
      setSendingRequest(true);
      await api.post("/friends/sendrequest", { toUserId });
      setRequestSent(true);
      showToast("Friend request sent!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send request", "error");
    } finally {
      setSendingRequest(false);
    }
  };

  /* ================= ACCEPT / REJECT ================= */
  const acceptRequest = async (requestId) => {
    try {
      setActionLoadingId(requestId);
      await api.post("/friends/accept", { requestId });
      setPendingRequests((prev) =>
        prev.filter((req) => req._id !== requestId)
      );
      fetchFriends();
      showToast("Friend request accepted!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Accept failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      setActionLoadingId(requestId);
      await api.post("/friends/reject", { requestId });
      setPendingRequests((prev) =>
        prev.filter((req) => req._id !== requestId)
      );
      showToast("Request rejected", "info");
    } catch (err) {
      showToast(err.response?.data?.message || "Reject failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="col-span-12 lg:col-span-4 w-full min-w-0">
      <div className="glass rounded-2xl h-[75vh] p-5 flex flex-col gap-4 isolate relative z-0 overflow-hidden">
        <div className="glass rounded-xl p-4 flex flex-col flex-1 min-h-0 min-w-0">
          {/* TOGGLE */}
          <div className="flex bg-white/[0.04] rounded-xl p-1 mb-4 shrink-0">
            <button
              onClick={() => setMode("pending")}
              className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all duration-200 ${
                mode === "pending"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending
              {pendingRequests.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-400 font-semibold">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setMode("search");
                setQuery("");
                setSearched(false);
                setSearchResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all duration-200 ${
                mode === "search"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Search
            </button>
          </div>

          {/* CONTENT — both views always mounted, toggled via display */}
          <div className="flex-1 min-h-0 min-w-0 relative">

            {/* ── SEARCH ── */}
            <div
              className="flex flex-col absolute inset-0"
              style={{ display: mode === "search" ? "flex" : "none" }}
            >
              <div className="flex gap-2 mb-3 shrink-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search by username"
                    className="h-10 pl-10 pr-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-gray-100 placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:from-emerald-400 hover:to-teal-400 transition-all shrink-0"
                >
                  Search
                </button>
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex-1 overflow-y-auto no-scrollbar min-h-0">
                {!searched && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Search className="w-8 h-8 text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500">Search for users to add</p>
                  </div>
                )}

                {searched && searchLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                  </div>
                )}

                {searched && !searchLoading && !searchResult && (
                  <p className="text-sm text-gray-500 text-center mt-6">
                    No user found
                  </p>
                )}

                {searchResult && (
                  <div className="glass rounded-xl p-3 flex justify-between items-center text-sm animate-fadeIn">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 text-emerald-400 flex items-center justify-center font-semibold text-sm border border-emerald-500/20 shrink-0">
                        {searchResult.name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-100 truncate">
                          {searchResult.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          @{searchResult.username}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        sendFriendRequest(searchResult._id)
                      }
                      disabled={sendingRequest || requestSent}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        requestSent
                          ? "bg-white/[0.05] text-gray-500"
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {requestSent
                        ? "Sent ✓"
                        : sendingRequest
                        ? "Sending..."
                        : "+ Add"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── PENDING ── */}
            <div
              className="absolute inset-0"
              style={{ display: mode === "pending" ? "block" : "none" }}
            >
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 h-full overflow-y-auto no-scrollbar">
                {loadingRequests ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Clock className="w-8 h-8 text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req._id}
                        className="glass rounded-xl p-3 flex justify-between items-center text-sm animate-fadeIn"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-400 flex items-center justify-center font-semibold text-sm border border-indigo-500/20 shrink-0">
                            {req.name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-100 truncate">
                              {req.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              @{req.username}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => acceptRequest(req._id)}
                            disabled={actionLoadingId === req._id}
                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => rejectRequest(req._id)}
                            disabled={actionLoadingId === req._id}
                            className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* OWE SUMMARY */}
        <div className="glass rounded-xl p-4 shrink-0">
          <p className="text-sm font-medium text-gray-300 mb-3">
            Owe Summary
          </p>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">You owe</span>
            <span className="font-semibold text-red-400">₹{totalYouOwe.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">You get</span>
            <span className="font-semibold text-emerald-400">₹{totalTheyOwe.toFixed(2)}</span>
          </div>

          <div className="h-px bg-white/[0.06] my-3" />

          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-300">Net</span>
            <span className={`font-semibold ${totalNet > 0 ? 'text-emerald-400' : totalNet < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {totalNet === 0 ? '₹0 — All settled' : totalNet > 0 ? `You get ₹${totalNet.toFixed(2)}` : `You owe ₹${Math.abs(totalNet).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardRight;
