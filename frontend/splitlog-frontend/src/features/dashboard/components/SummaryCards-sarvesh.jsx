import React, { useState, useEffect } from "react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Banknote,
} from "lucide-react";
import { fetchSummary } from "../services/dashboardService";

export default function SummaryCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v) =>
    v === undefined || v === null
      ? "—"
      : `₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <Card
          title="NET BALANCE"
          amount={loading ? null : fmt(data?.netBalance)}
          subtitle="Overall balance"
          variant="net"
          icon={<Wallet className="w-5 h-5" />}
          loading={loading}
          positive={data?.netBalance >= 0}
        />
        <Card
          title="YOU OWE"
          amount={loading ? null : fmt(data?.youOwe)}
          subtitle="Outstanding debts"
          variant="owe"
          icon={<TrendingDown className="w-5 h-5" />}
          loading={loading}
        />
        <Card
          title="YOU GET"
          amount={loading ? null : fmt(data?.youGet)}
          subtitle="Money owed to you"
          variant="get"
          icon={<TrendingUp className="w-5 h-5" />}
          loading={loading}
        />
        <Card
          title="THIS MONTH"
          amount={loading ? null : fmt(data?.thisMonth)}
          subtitle="My share after splits"
          variant="monthExpense"
          icon={<CreditCard className="w-5 h-5" />}
          loading={loading}
        />
        <Card
          title="YOU PAID"
          amount={loading ? null : fmt(data?.youPaid)}
          subtitle="All spendings"
          variant="monthPaid"
          icon={<Banknote className="w-5 h-5" />}
          loading={loading}
        />
      </div>
    </div>
  );
}

function Card({ title, amount, subtitle, variant, icon, loading }) {
  const config = {
    net: {
      bg: "glass",
      border: "border-t-2 border-t-emerald-500",
      iconBg: "bg-emerald-500/20 text-emerald-400",
      amount: "text-emerald-400",
      title: "text-emerald-400/80",
      subtitle: "text-gray-500",
      glow: "hover:shadow-glow",
    },
    owe: {
      bg: "glass",
      border: "border-t-2 border-t-red-500",
      iconBg: "bg-red-500/20 text-red-400",
      amount: "text-red-400",
      title: "text-red-400/80",
      subtitle: "text-gray-500",
      glow: "hover:shadow-glow-red",
    },
    get: {
      bg: "glass",
      border: "border-t-2 border-t-emerald-400",
      iconBg: "bg-emerald-500/20 text-emerald-400",
      amount: "text-emerald-400",
      title: "text-emerald-400/80",
      subtitle: "text-gray-500",
      glow: "hover:shadow-glow",
    },
    monthExpense: {
      bg: "glass",
      border: "border-t-2 border-t-indigo-500",
      iconBg: "bg-indigo-500/20 text-indigo-400",
      amount: "text-gray-100",
      title: "text-gray-400",
      subtitle: "text-gray-500",
      glow: "hover:shadow-glow",
    },
    monthPaid: {
      bg: "glass",
      border: "border-t-2 border-t-violet-500",
      iconBg: "bg-violet-500/20 text-violet-400",
      amount: "text-gray-100",
      title: "text-gray-400",
      subtitle: "text-gray-500",
      glow: "hover:shadow-glow",
    },
  };

  const c = config[variant];

  return (
    <div
      className={`
        rounded-2xl p-5 min-h-[130px]
        flex flex-col justify-between
        ${c.bg} ${c.border} ${c.glow}
        hover:scale-[1.03]
        transition-all duration-300 ease-out
        animate-slideUp
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold tracking-wider uppercase ${c.title}`}>
          {title}
        </p>
        <div className={`p-2 rounded-lg ${c.iconBg}`}>{icon}</div>
      </div>

      {loading ? (
        <div className="h-7 w-24 rounded-md bg-white/10 animate-pulse" />
      ) : (
        <p className={`text-2xl font-bold ${c.amount}`}>{amount}</p>
      )}

      <p className={`text-xs mt-1 ${c.subtitle}`}>{subtitle}</p>
    </div>
  );
}
