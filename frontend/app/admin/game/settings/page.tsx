"use client";

import { useState, useEffect } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface GameSettings {
  minBetAmount: number;
  maxBetAmount: number;
  bettingDurationMs: number;
  flyingDurationMs: number;
}

export default function GameSettingsPage() {
  const { isAuthenticated, adminSecret } = useAdminAuth();
  const { tokens } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [settings, setSettings] = useState<GameSettings>({
    minBetAmount: 0.1,
    maxBetAmount: 10,
    bettingDurationMs: 10000,
    flyingDurationMs: 20000,
  });

  const [formData, setFormData] = useState<GameSettings>(settings);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};

    // Prefer JWT token if available (wallet auth)
    if (tokens?.accessToken) {
      headers["Authorization"] = `Bearer ${tokens.accessToken}`;
    }
    // Fall back to admin secret (legacy auth)
    else if (adminSecret) {
      headers["Authorization"] = `Bearer ${adminSecret}`;
    }
    // Last resort: use env admin secret
    else if (process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      headers["X-Admin-Secret"] = process.env.NEXT_PUBLIC_ADMIN_SECRET;
    }

    return headers;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/admin");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, tokens, adminSecret]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/admin/game/settings`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      const fetchedSettings = data.settings || {
        minBetAmount: 0.1,
        maxBetAmount: 10,
        bettingDurationMs: 30000,
        flyingDurationMs: 20000,
      };

      // Ensure all values are valid numbers
      const validSettings: GameSettings = {
        minBetAmount: Number(fetchedSettings.minBetAmount) || 0.1,
        maxBetAmount: Number(fetchedSettings.maxBetAmount) || 10,
        bettingDurationMs: Number(fetchedSettings.bettingDurationMs) || 30000,
        flyingDurationMs: Number(fetchedSettings.flyingDurationMs) || 20000,
      };

      setSettings(validSettings);
      setFormData(validSettings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof GameSettings, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Validate inputs
      if (formData.minBetAmount <= 0) {
        throw new Error("Minimum bet amount must be greater than 0");
      }
      if (formData.maxBetAmount <= formData.minBetAmount) {
        throw new Error("Maximum bet amount must be greater than minimum");
      }
      if (formData.bettingDurationMs < 5000) {
        throw new Error("Betting duration must be at least 5 seconds");
      }
      if (formData.flyingDurationMs < 1000) {
        throw new Error("Flying duration must be at least 1 second");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/admin/game/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      const data = await response.json();
      setSettings(data.settings);
      setMessage({ type: "success", text: "Settings saved successfully!" });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(settings);
    setMessage(null);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
        <Link
          href="/admin/game"
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-orbitron tracking-wide text-white">
            GAME<span className="text-emerald-500">SETTINGS</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Configure global game parameters and bet limits
          </p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
          <p className="text-slate-400 mt-3">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bet Limits Section */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold font-orbitron tracking-wide text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
              BET LIMITS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Minimum Bet Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Minimum Bet Amount (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.minBetAmount || 0.1}
                  onChange={(e) =>
                    handleChange(
                      "minBetAmount",
                      parseFloat(e.target.value) || 0.1,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Minimum amount players can bet per round
                </p>
              </div>

              {/* Maximum Bet Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Maximum Bet Amount (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.maxBetAmount || 10}
                  onChange={(e) =>
                    handleChange(
                      "maxBetAmount",
                      parseFloat(e.target.value) || 10,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Hard cap on bet amounts
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-300">
                <strong>Note:</strong> Individual users can have their own bet
                limits set via the Users admin panel. These global settings
                apply to all players unless overridden.
              </p>
            </div>
          </div>

          {/* Game Timing Section */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold font-orbitron tracking-wide text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
              GAME TIMING
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Betting Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Betting Duration (milliseconds)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="5000"
                  value={formData.bettingDurationMs ?? 30000}
                  onChange={(e) =>
                    handleChange(
                      "bettingDurationMs",
                      parseInt(e.target.value) || 30000,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Time allowed for players to place bets (
                  {((formData.bettingDurationMs ?? 30000) / 1000).toFixed(1)}s)
                </p>
              </div>

              {/* Flying Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Flying Duration (milliseconds)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={formData.flyingDurationMs ?? 20000}
                  onChange={(e) =>
                    handleChange(
                      "flyingDurationMs",
                      parseInt(e.target.value) || 20000,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Maximum flight time before crash (
                  {((formData.flyingDurationMs ?? 20000) / 1000).toFixed(1)}s)
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-300">
                <strong>Warning:</strong> Changing timing parameters affects all
                active and future rounds. Changes take effect immediately.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg text-slate-300 font-medium transition-all disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>

          {/* Summary */}
          <div className="bg-slate-950 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3">
              Current Configuration
            </p>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Min Bet</p>
                <p className="text-emerald-400 font-semibold">
                  ${(settings.minBetAmount ?? 0.1).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Max Bet</p>
                <p className="text-emerald-400 font-semibold">
                  ${(settings.maxBetAmount ?? 10).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Betting Time</p>
                <p className="text-emerald-400 font-semibold">
                  {((settings.bettingDurationMs ?? 30000) / 1000).toFixed(1)}s
                </p>
              </div>
              <div>
                <p className="text-slate-500">Flying Time</p>
                <p className="text-emerald-400 font-semibold">
                  {((settings.flyingDurationMs ?? 20000) / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
