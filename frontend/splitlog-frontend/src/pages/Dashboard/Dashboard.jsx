import React, { useState } from "react";
import SummaryCards from "../../features/dashboard/components/SummaryCards";
import GraphPlaceholder from "./GraphPlaceholder";
import RecentTransactions from "../../features/dashboard/components/RecentTransactions";
import AddExpenseModal from "../../features/expenses/components/AddExpenseModal";
import { getUser } from "../../utils/auth";
import { Plus } from "lucide-react";

function Dashboard() {
  const user = getUser();
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="w-full animate-fadeIn overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-16 py-5 space-y-6">
        {/* Greeting + Add Expense */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-brand font-bold text-gray-100">
              {greeting}, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here's your expense overview
            </p>
          </div>

          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>

        {/* Row 1 — Summary Cards */}
        <SummaryCards />

        {/* Row 2 — Chart + Transactions */}
        <div className="flex flex-col lg:flex-row gap-6 isolate">
          <div className="w-full lg:w-[38%] relative z-0 isolate overflow-hidden rounded-2xl">
            <GraphPlaceholder />
          </div>
          <div className="flex-1 relative z-0 isolate overflow-hidden rounded-2xl">
            <RecentTransactions />
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
      />
    </div>
  );
}

export default Dashboard;
