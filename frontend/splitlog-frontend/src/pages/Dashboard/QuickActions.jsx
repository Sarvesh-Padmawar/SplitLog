import { Plus, Handshake } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4 animate-slideUp">
      <h3 className="text-lg font-semibold text-gray-100">
        Quick Actions
      </h3>

      <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-medium text-sm hover:from-emerald-400 hover:to-teal-400 shadow-glow hover:shadow-glow-lg transition-all duration-300">
        <Plus className="w-4 h-4" />
        Add Expense
      </button>

      <button className="flex items-center justify-center gap-2 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl font-medium text-sm hover:bg-emerald-500/10 transition-all duration-300">
        <Handshake className="w-4 h-4" />
        Settle Up
      </button>
    </div>
  );
}
