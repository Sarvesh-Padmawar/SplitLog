import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchChartData } from "../../features/dashboard/services/dashboardService";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="text-emerald-400 font-semibold">₹{payload[0].value}</p>
    </div>
  );
};

/* Loading skeleton */
function Skeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full h-40 rounded-xl bg-white/5 animate-pulse" />
    </div>
  );
}

export default function DashboardHistory() {
  const [activeTab, setActiveTab] = useState("trend");
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData()
      .then(({ trend, categories }) => {
        setTrendData(trend);
        setCategoryData(categories);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalExpenses = categoryData.reduce((sum, i) => sum + i.value, 0);

  return (
    <div className="glass rounded-2xl p-5 h-[48vh] min-h-[350px] flex flex-col animate-slideUp isolate relative z-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">History</h2>

        {/* Tabs */}
        <div className="flex bg-white/[0.05] rounded-lg p-1">
          {["trend", "categories"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeTab === tab
                  ? "bg-emerald-500/20 text-emerald-400 shadow"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "trend" ? "Trend" : "Categories"}
            </button>
          ))}
        </div>
      </div>

      {/* ================= TREND ================= */}
      {activeTab === "trend" && (
        <div className="flex-1 min-h-0">
          {loading ? (
            <Skeleton />
          ) : trendData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">No expense history yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart
                data={trendData}
                margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="amountFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tickFormatter={(v) => (v === 0 ? "" : `₹${v}`)}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#amountFill)"
                  dot={{ r: 3, fill: "#10b981", stroke: "#0b0f1a", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#10b981", stroke: "#0b0f1a", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ================= CATEGORIES ================= */}
      {activeTab === "categories" && (
        <div className="flex-1 flex flex-col items-center min-h-0 relative">
          {loading ? (
            <Skeleton />
          ) : categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">No expense history yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={45}
                    outerRadius={68}
                    dataKey="value"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryData.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center total */}
              <div className="absolute top-[68px] text-center">
                <p className="text-[10px] text-gray-500">Total</p>
                <p className="text-sm font-semibold text-gray-100">
                  ₹{totalExpenses.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Legend */}
              <div className="w-full mt-2 flex-1 overflow-y-auto max-h-[100px] pr-1 space-y-1.5 no-scrollbar">
                {categoryData.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-gray-400">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-200">
                      ₹{c.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
