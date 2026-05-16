"use client";

import React, { useState } from "react";

interface VerificationData {
  roundId: number;
  verified: boolean;
  serverSeed: string;
  serverSeedHash: string;
  clientSeeds: string[];
  combinedClientSeedHash: string;
  finalSeed: string;
  claimedCrashPoint: number;
  actualCrashPoint: number;
  error?: string;
}

const FairnessVerifier: React.FC = () => {
  const [roundId, setRoundId] = useState("");
  const [result, setResult] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!roundId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/verify/${roundId}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError("Failed to connect to verification server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-orbitron uppercase tracking-widest">
          Enter Round ID to Verify
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={roundId}
            onChange={(e) => setRoundId(e.target.value)}
            placeholder="e.g. 1234"
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
          />
          <button
            onClick={handleVerify}
            disabled={loading || !roundId}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95"
          >
            {loading ? "..." : "Verify"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-courier">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            result.verified 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <span className="text-xl">
              {result.verified ? "✅" : "❌"}
            </span>
            <div>
              <p className="font-bold font-orbitron text-sm uppercase tracking-wider">
                {result.verified ? "Provably Fair" : "Verification Failed"}
              </p>
              <p className="text-xs opacity-70 font-courier">
                Round {result.roundId} outcome is {result.verified ? "valid" : "invalid"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
              <p className="text-slate-500 mb-1 font-orbitron uppercase tracking-tighter">Claimed</p>
              <p className="text-lg font-black text-slate-200">{Number(result.claimedCrashPoint).toFixed(2)}x</p>
            </div>
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
              <p className="text-slate-500 mb-1 font-orbitron uppercase tracking-tighter">Actual</p>
              <p className="text-lg font-black text-emerald-400">{Number(result.actualCrashPoint).toFixed(2)}x</p>
            </div>
          </div>

          <div className="space-y-3">
            <DataRow label="Server Seed" value={result.serverSeed} />
            <DataRow label="Server Seed Hash" value={result.serverSeedHash} />
            <DataRow label="Combined Client Seed" value={result.combinedClientSeedHash} />
            <DataRow label="Final Combined Seed" value={result.finalSeed} />
            <div className="space-y-1">
               <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest pl-1">Client Seeds ({result.clientSeeds.length})</p>
               <div className="max-h-24 overflow-y-auto bg-slate-950/50 border border-slate-800/50 rounded-lg p-2 space-y-1">
                 {result.clientSeeds.length > 0 ? result.clientSeeds.map((s, i) => (
                   <p key={i} className="text-[10px] font-mono text-slate-400 break-all">{s}</p>
                 )) : (
                   <p className="text-[10px] font-mono text-slate-600 italic">No player seeds contributed</p>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-[10px] text-slate-500 font-orbitron uppercase tracking-widest pl-1">{label}</p>
    <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-2">
      <p className="text-[10px] font-mono text-slate-400 break-all">{value}</p>
    </div>
  </div>
);

export default FairnessVerifier;
