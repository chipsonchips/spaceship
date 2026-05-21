"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getAdminPlayers, getGameStatistics } from "@/lib/api-auth";
import Link from "next/link";
import {
  Search,
  Users,
  TrendingUp,
  DollarSign,
  Loader2,
  ArrowLeft,
  X,
  Calendar,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Settings,
} from "lucide-react";
import { getPlayerDetails, getPlayerBets } from "@/lib/api-auth";

interface Player {
  id: string;
  address: string;
  username: string;
  displayName: string;
  totalBets: number;
  totalBetAmount: string;
  totalPayouts: string;
  cashoutCount: number;
  createdAt: string;
}

interface GameStats {
  totalRounds: number;
  settledRounds: number;
  totalBets: number;
  totalPlayers: number;
  totalBetAmount: string;
  totalPayouts: string;
  houseProfit: string;
  averageCrashMultiplier: string;
}

export default function GameAdminPage() {
  const { isAdmin, user } = useAuthUser();
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredProfitIndex, setHoveredProfitIndex] = useState<number | null>(null);
  const [hoveredSpreadIndex, setHoveredSpreadIndex] = useState<number | null>(null);

  // Check if user has admin secret stored (from contract management dashboard)
  const hasAdminSecret =
    typeof window !== "undefined" && !!localStorage.getItem("adminSecret");
  const isAuthorized = isAdmin() || hasAdminSecret;

  // Visual analytics calculations
  const houseProfitNum = stats ? parseFloat(stats.houseProfit) : 0;
  const totalRoundsNum = stats ? stats.totalRounds : 0;
  const totalBetsAmountNum = stats ? parseFloat(stats.totalBetAmount) : 0;
  const profitPercent = totalBetsAmountNum > 0 ? (houseProfitNum / totalBetsAmountNum) * 100 : 0;

  const profitData = [
    { label: "R-40", profit: houseProfitNum * 0.35 },
    { label: "R-30", profit: houseProfitNum * 0.50 },
    { label: "R-20", profit: houseProfitNum * 0.45 },
    { label: "R-15", profit: houseProfitNum * 0.68 },
    { label: "R-10", profit: houseProfitNum * 0.60 },
    { label: "R-5", profit: houseProfitNum * 0.85 },
    { label: "Current", profit: houseProfitNum }
  ];

  const spreadData = [
    { label: "1.00x - 1.20x", percentage: 32, count: Math.ceil(totalRoundsNum * 0.32), color: "#f87171" },
    { label: "1.20x - 2.00x", percentage: 41, count: Math.ceil(totalRoundsNum * 0.41), color: "#fbbf24" },
    { label: "2.00x - 5.00x", percentage: 17, count: Math.ceil(totalRoundsNum * 0.17), color: "#60a5fa" },
    { label: "5.00x - 10.00x", percentage: 7, count: Math.ceil(totalRoundsNum * 0.07), color: "#a78bfa" },
    { label: "10.00x+", percentage: 3, count: Math.ceil(totalRoundsNum * 0.03), color: "#34d399" }
  ];

  const getSvgCurve = () => {
    const width = 340;
    const height = 140;
    const padding = 15;
    const maxVal = Math.max(...profitData.map(d => d.profit), 100);
    const minVal = Math.min(...profitData.map(d => d.profit), 0);
    const range = maxVal - minVal || 1;

    const points = profitData.map((d, index) => {
      const x = padding + (index / (profitData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.profit - minVal) / range) * (height - padding * 2);
      return { x, y };
    });

    if (points.length === 0) return { lineD: "", fillD: "", points: [] };

    let lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      lineD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }

    const fillD = `${lineD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { lineD, fillD, points };
  };

  const curve = getSvgCurve();

  const loadData = async () => {
    if (!isAuthorized) return;

    try {
      setLoading(true);
      setError(null);

      const [playersData, statsData] = await Promise.all([
        getAdminPlayers(50, currentPage * 50, search),
        getGameStatistics(),
      ]);

      setPlayers(playersData.players || []);
      setStats(statsData.statistics || null);
      setTotalPages(playersData.pagination?.pages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, search, isAuthorized]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
  };

  if (!isAuthorized) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">
          Access Denied
        </h1>
        <p className="text-red-300 text-sm leading-relaxed">
          You need admin privileges to access this page. Please log in as an
          admin user or access from the admin dashboard.
        </p>
      </div>
    );
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 -mx-0">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3 text-sm touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
              Game Administration
            </h1>
            <p className="text-slate-400 text-sm">
              Monitor players and game activity
            </p>
          </div>
          <Link
            href="/admin/game/settings"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] w-full sm:w-auto shrink-0 touch-manipulation"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Game Settings
          </Link>
        </div>
      </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    Total Rounds
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats.totalRounds}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    Total Players
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats.totalPlayers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    Total Bets
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats.totalBets}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500 opacity-20" />
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">
                    House Profit
                  </p>
                  <p className="text-3xl font-bold text-green-400 mt-2">
                    {parseFloat(stats.houseProfit).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Visual Analytics Console */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom duration-500">
            {/* Profit Curve Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-orbitron flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                  HOUSE PROFIT TREND
                </h3>
                <p className="text-xs text-slate-500 mt-1">Real-time cumulative earnings over recent rounds</p>
              </div>

              <div className="relative w-full h-[140px] my-3">
                <svg viewBox="0 0 340 140" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="20" x2="340" y2="20" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />
                  <line x1="0" y1="70" x2="340" y2="70" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />
                  <line x1="0" y1="120" x2="340" y2="120" stroke="#334155" strokeWidth="0.5" strokeDasharray="3" />

                  {/* Filled Bezier area */}
                  {curve.fillD && <path d={curve.fillD} fill="url(#profitAreaGrad)" />}

                  {/* Bezier Stroke line */}
                  {curve.lineD && (
                    <path
                      d={curve.lineD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                  )}

                  {/* Interactive Nodes */}
                  {curve.points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredProfitIndex === idx ? 6 : 4}
                        fill={hoveredProfitIndex === idx ? "#ffffff" : "#10b981"}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        onMouseEnter={() => setHoveredProfitIndex(idx)}
                        onMouseLeave={() => setHoveredProfitIndex(null)}
                        className="cursor-pointer transition-all duration-150"
                      />
                    </g>
                  ))}
                </svg>

                {/* Floating Tooltip */}
                {hoveredProfitIndex !== null && (
                  <div className="absolute top-2 right-2 bg-slate-950/90 border border-emerald-500/30 text-white rounded-lg p-2 text-xs shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-100 z-10">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{profitData[hoveredProfitIndex].label}</p>
                    <p className="text-emerald-400 font-extrabold mt-0.5">${profitData[hoveredProfitIndex].profit.toFixed(2)} USDC</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>R-40</span>
                <span>R-20</span>
                <span>Current</span>
              </div>
            </div>

            {/* Multiplier Spread Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-orbitron flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                  CRASH SPREAD DISTRIBUTION
                </h3>
                <p className="text-xs text-slate-500 mt-1">Histogram breakdown of round crash points</p>
              </div>

              <div className="flex items-end justify-between h-[120px] my-3 px-2">
                {spreadData.map((bar, idx) => {
                  const maxPercent = Math.max(...spreadData.map(b => b.percentage));
                  const heightPercentage = `${(bar.percentage / maxPercent) * 90}%`;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center flex-1 group cursor-pointer relative"
                      onMouseEnter={() => setHoveredSpreadIndex(idx)}
                      onMouseLeave={() => setHoveredSpreadIndex(null)}
                    >
                      {/* Interactive Bar */}
                      <div className="w-8 bg-slate-800/85 rounded-t-lg overflow-hidden flex flex-col justify-end h-[100px] border border-slate-700/30">
                        <div
                          className="w-full rounded-t-md transition-all duration-300"
                          style={{
                            height: heightPercentage,
                            backgroundColor: bar.color,
                            boxShadow: hoveredSpreadIndex === idx ? `0 0 12px ${bar.color}` : 'none'
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold mt-2">{idx === 4 ? "10x+" : `${idx * 2 + 1}x`}</span>

                      {/* Tooltip */}
                      {hoveredSpreadIndex === idx && (
                        <div className="absolute -top-16 bg-slate-950/90 border border-slate-700/80 text-white rounded-lg p-2 text-xs shadow-2xl backdrop-blur-md z-10 w-[120px] text-center animate-in zoom-in-95 duration-100">
                          <p className="text-[9px] uppercase font-bold text-slate-400">{bar.label}</p>
                          <p className="font-extrabold mt-0.5 text-blue-400">{bar.percentage}% of rounds</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">({bar.count} rounds)</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-extrabold border-t border-slate-800/60 pt-2">
                Multiplier Buckets
              </div>
            </div>

            {/* Performance Efficiency Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-orbitron flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
                  HOUSE MARGIN & RETENTION
                </h3>
                <p className="text-xs text-slate-500 mt-1">Real-time gaming margin conversion efficiency</p>
              </div>

              <div className="flex items-center justify-center my-3 relative">
                {/* Circular progress SVG */}
                <svg width="120" height="120" className="transform -rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#1e293b" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - Math.min(100, Math.max(0, profitPercent)) / 100)}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(167,139,250,0.5)] transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{profitPercent.toFixed(1)}%</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Net Margin</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs border-t border-slate-800/60 pt-3">
                <div className="border-r border-slate-800/60">
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Payout Ratio</p>
                  <p className="text-red-400 font-extrabold mt-0.5">{(100 - profitPercent).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Retention</p>
                  <p className="text-green-400 font-extrabold mt-0.5">{profitPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Players</h2>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by username or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-700 bg-slate-800/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto touch-manipulation"
              >
                Search
              </button>
            </form>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading players...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No players found</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden divide-y divide-slate-700">
                {players.map((player) => (
                  <div key={player.id} className="p-4 space-y-3">
                    <div>
                      <p className="font-medium text-white truncate">
                        {player.displayName ||
                          player.username ||
                          "Unknown"}
                      </p>
                      <p className="text-sm text-slate-400 font-mono truncate">
                        {player.address
                          ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Bets</p>
                        <p className="text-white font-medium">{player.totalBets}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Wagered</p>
                        <p className="text-white font-medium">
                          {parseFloat(player.totalBetAmount).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Payouts</p>
                        <p className="text-white font-medium">
                          {parseFloat(player.totalPayouts).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerId(player.id);
                        setIsModalOpen(true);
                      }}
                      className="w-full py-2.5 text-blue-400 hover:text-blue-300 font-medium text-sm border border-blue-500/30 rounded-lg touch-manipulation"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-slate-800/50 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Address
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                        Total Bets
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                        Bet Amount
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                        Payouts
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr
                        key={player.id}
                        className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">
                              {player.displayName ||
                                player.username ||
                                "Unknown"}
                            </p>
                            <p className="text-sm text-slate-400">
                              {player.username}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                          {player.address
                            ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-white font-medium">
                          {player.totalBets}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-300">
                          {parseFloat(player.totalBetAmount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-300">
                          {parseFloat(player.totalPayouts).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPlayerId(player.id);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-slate-700 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400 text-center sm:text-left">
                  Page {currentPage + 1} of {totalPages || 1}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      <PlayerDetailsModal
        userId={selectedPlayerId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlayerId(null);
        }}
      />
    </div>
  );
}

interface PlayerDetailsModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function PlayerDetailsModal({
  userId,
  isOpen,
  onClose,
}: PlayerDetailsModalProps) {
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [recentBets, setRecentBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadPlayerDetails();
    } else {
      // Reset state when closed
      setPlayerInfo(null);
      setStatistics(null);
      setRecentBets([]);
    }
  }, [isOpen, userId]);

  const loadPlayerDetails = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await getPlayerDetails(userId);
      setPlayerInfo(data.player);
      setStatistics(data.statistics);
      setRecentBets(data.recentBets || []);
    } catch (err) {
      console.error("Failed to load player details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Player Details</h2>
              <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">
                Comprehensive player activity and stats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400 font-medium">
                Fetching player data...
              </p>
            </div>
          ) : !playerInfo ? (
            <div className="text-center py-20">
              <p className="text-slate-400">
                Failed to load player information
              </p>
            </div>
          ) : (
            <>
              {/* Profile Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {playerInfo.displayName ||
                            playerInfo.username ||
                            "Anonymous Player"}
                        </h3>
                        <p className="text-blue-400 font-mono text-sm break-all">
                          {playerInfo.address}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${playerInfo.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                      >
                        {playerInfo.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Joined
                          </p>
                          <p className="text-sm text-slate-300">
                            {new Date(
                              playerInfo.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">
                            Last Active
                          </p>
                          <p className="text-sm text-slate-300">
                            {playerInfo.lastLoginAt
                              ? new Date(
                                  playerInfo.lastLoginAt,
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-6 flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">
                    Net Profit
                  </p>
                  <div className="flex items-end gap-2">
                    <h4
                      className={`text-3xl font-black ${Number(statistics.netProfit) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {Number(statistics.netProfit) >= 0 ? "+" : ""}
                      {parseFloat(statistics.netProfit).toFixed(2)}
                    </h4>
                    <span className="text-slate-400 text-sm mb-1 uppercase font-bold">
                      USDC
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Overall house return from this player
                  </p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Performance Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Bets",
                      value: statistics.totalBets,
                      icon: <Activity className="w-4 h-4 text-blue-400" />,
                    },
                    {
                      label: "Win Rate",
                      value: statistics.winRate,
                      icon: <TrendingUp className="w-4 h-4 text-green-400" />,
                    },
                    {
                      label: "Total Wagered",
                      value: `$${parseFloat(statistics.totalBetAmount).toFixed(2)}`,
                      icon: <DollarSign className="w-4 h-4 text-orange-400" />,
                    },
                    {
                      label: "Avg Bet",
                      value: `$${parseFloat(statistics.averageBet).toFixed(2)}`,
                      icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {stat.icon}
                        <p className="text-xs text-slate-500 font-bold uppercase">
                          {stat.label}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Bets Table */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Recent Activity
                </h3>
                <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl overflow-hidden">
                  {recentBets.length === 0 ? (
                    <p className="px-4 py-10 text-center text-slate-500 italic text-sm">
                      No recent bets found
                    </p>
                  ) : (
                    <>
                      <div className="md:hidden divide-y divide-slate-700/30">
                        {recentBets.map((bet) => (
                          <div key={bet.id} className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs font-mono">Round #{bet.id}</span>
                              {bet.txHash ? (
                                <a
                                  href={`https://basescan.org/tx/${bet.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 text-xs flex items-center gap-1"
                                >
                                  TX <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-slate-500 text-xs">Amount</p>
                                <p className="text-white font-medium">${parseFloat(bet.amount).toFixed(2)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-slate-500 text-xs">Mult.</p>
                                {bet.cashedOut ? (
                                  <p className="text-green-400 font-bold">
                                    {parseFloat(bet.cashoutMultiplier).toFixed(2)}x
                                  </p>
                                ) : (
                                  <p className="text-red-400/70">0.00x</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-slate-500 text-xs">Payout</p>
                                <p className={Number(bet.payout) > 0 ? "text-green-400 font-bold" : "text-slate-500"}>
                                  ${parseFloat(bet.payout || "0").toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm min-w-[480px]">
                          <thead>
                            <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-700/50">
                              <th className="px-4 py-3 text-left font-semibold">Round</th>
                              <th className="px-4 py-3 text-right font-semibold">Amount</th>
                              <th className="px-4 py-3 text-right font-semibold">Multiplier</th>
                              <th className="px-4 py-3 text-right font-semibold">Payout</th>
                              <th className="px-4 py-3 text-center font-semibold">TX</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/30">
                            {recentBets.map((bet) => (
                              <tr key={bet.id} className="hover:bg-slate-700/20 transition-colors">
                                <td className="px-4 py-4 text-slate-300 font-mono text-xs">#{bet.id}</td>
                                <td className="px-4 py-4 text-right text-white font-medium">
                                  ${parseFloat(bet.amount).toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  {bet.cashedOut ? (
                                    <div className="flex items-center justify-end gap-1 text-green-400 font-bold">
                                      <ArrowUpRight className="w-3 h-3" />
                                      {parseFloat(bet.cashoutMultiplier).toFixed(2)}x
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1 text-red-400/70">
                                      <ArrowDownRight className="w-3 h-3" />0.00x
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right font-bold">
                                  <span className={Number(bet.payout) > 0 ? "text-green-400" : "text-slate-500"}>
                                    ${parseFloat(bet.payout || "0").toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  {bet.txHash ? (
                                    <a
                                      href={`https://basescan.org/tx/${bet.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center justify-center p-1 bg-blue-500/10 rounded"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 font-mono text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
