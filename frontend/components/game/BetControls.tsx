"use client";

import React, { useState, useEffect } from "react";
import { useGameContext } from "@/context/GameContext";
import { useBetValidation } from "@/hooks/useBetValidation";
import useUSDC from "@/hooks/useUSDC";
import useChainInfo from "@/hooks/useChainInfo";
import AutoCashout from "./AutoCashout";
import { useMultiplierAnimation, usePlayerBet } from "@/hooks/useGame";
import * as api from "@/lib/api";

const BetControls: React.FC = () => {
  const { roundData, cashOut, placeBet, optimisticBets } = useGameContext();
  const { walletBalance, walletAddress, refreshBalance } = useUSDC();
  const { chainLabel, explorerUrl } = useChainInfo();

  const myBet = usePlayerBet(roundData, walletAddress || null, optimisticBets);

  const [betAmount, setBetAmount] = useState("0.10");
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState<
    number | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeBetsRemaining, setFreeBetsRemaining] = useState<number>(0);
  const [freeBetMaxAmount, setFreeBetMaxAmount] = useState<number>(0.1);
  const [freeBetsExpiresAt, setFreeBetsExpiresAt] = useState<string | null>(
    null,
  );
  const [useFreeBet, setUseFreeBet] = useState(false);
  const [maxBetAmount, setMaxBetAmount] = useState<number>(0.5);

  const betValidation = useBetValidation(
    betAmount,
    useFreeBet ? freeBetMaxAmount : walletBalance || 0,
  );

  // Fetch free bets info when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      fetchFreeBetsInfo();
      fetchUserMaxBetAmount();
    }
  }, [walletAddress, roundData?.maxBetAmount]);

  const fetchFreeBetsInfo = async () => {
    try {
      if (!walletAddress) return;
      const userData = await api.fetchUserByAddress(walletAddress);

      if (userData?.user?.id) {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const freeBetsRes = await fetch(
          `${apiBase}/api/free-bets/user/${userData.user.id}`,
        );
        if (freeBetsRes.ok) {
          const freeBetsData = await freeBetsRes.json();
          setFreeBetsRemaining(freeBetsData.freeBetsRemaining);
          setFreeBetMaxAmount(freeBetsData.freeBetMaxAmount);
          setFreeBetsExpiresAt(freeBetsData.expiresAt);
        } else {
          console.error(
            "Failed to fetch free bets:",
            freeBetsRes.status,
            await freeBetsRes.text(),
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch free bets info:", err);
    }
  };

  const fetchUserMaxBetAmount = async () => {
    try {
      if (!walletAddress) return;
      const userData = await api.fetchUserByAddress(walletAddress);

      const globalMaxBet = Number(roundData?.maxBetAmount ?? parseFloat(
        process.env.NEXT_PUBLIC_MAX_BET_AMOUNT || "10"
      ));

      if (userData?.user) {
        // Use user's maxBetAmount if set, otherwise use global default
        setMaxBetAmount(userData.user.maxBetAmount ?? globalMaxBet);
      } else {
        setMaxBetAmount(globalMaxBet);
      }
    } catch (err) {
      console.error("Failed to fetch user max bet amount:", err);
      // Fallback to global default
      const globalMaxBet = Number(roundData?.maxBetAmount ?? parseFloat(
        process.env.NEXT_PUBLIC_MAX_BET_AMOUNT || "10"
      ));
      setMaxBetAmount(globalMaxBet);
    }
  };

  const handlePlaceBet = async (overrideAmount?: string) => {
    const amountToBet =
      typeof overrideAmount === "string" ? overrideAmount : betAmount;

    if (!walletAddress) {
      setError("Please connect your wallet to place bets");
      return;
    }

    if (useFreeBet) {
      if (freeBetsRemaining <= 0) {
        setError("No free bets remaining");
        return;
      }
      if (parseFloat(amountToBet) > freeBetMaxAmount) {
        setError(`Free bet amount exceeds maximum of ${freeBetMaxAmount} USDC`);
        return;
      }
    } else {
      if (!walletBalance || walletBalance <= 0) {
        setError("Insufficient USDC balance");
        return;
      }
      if (parseFloat(amountToBet) > maxBetAmount) {
        setError(`Bet amount exceeds maximum of ${maxBetAmount} USDC`);
        return;
      }
    }

    const minBet = Number(roundData?.minBetAmount ?? 0.1);
    if (parseFloat(amountToBet) < minBet) {
      setError(`Minimum bet is ${minBet.toFixed(2)} USDC`);
      return;
    }

    if (typeof overrideAmount !== "string" && !betValidation.isValid) {
      setError(betValidation.error);
      return;
    }

    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const res = await placeBet(
        walletAddress,
        parseFloat(amountToBet),
        useFreeBet,
        autoCashoutMultiplier || undefined,
      );
      if (!useFreeBet) {
        await refreshBalance();
      }
      if (res?.success) {
        setTxHash(res.txHash || null);
        setLastBetAmount(amountToBet); // Track last bet
        setBetAmount("0.10");
        setUseFreeBet(false);
        setAutoCashoutMultiplier(null);
        // Refresh free bets info
        await fetchFreeBetsInfo();
      } else {
        setError(res.error || "Failed to place bet");
      }
    } catch (err) {
      setIsProcessing(false);
      console.error("Error placing bet:", err);
      setError((err as Error).message || "Failed to place bet");
    } finally {
      setIsProcessing(false);
    }
  };

  const [isCashingOut, setIsCashingOut] = useState(false);
  const [optimisticCashOut, setOptimisticCashOut] = useState(false);
  const [cashoutTimer, setCashoutTimer] = useState<number | null>(null);

  useEffect(() => {
    if (!myBet) {
      setOptimisticCashOut(false);
      setCashoutTimer(null);
    }
  }, [myBet?.id, roundData?.roundId]);

  const handleCashOut = async () => {
    if (!walletAddress || !myBet?.id) {
      setError("Cannot cash out at this time");
      return;
    }
    setError(null);

    setOptimisticCashOut(true);
    setIsCashingOut(true);
    setCashoutTimer(3); // Show timer for 3 seconds

    try {
      const result = await cashOut(myBet.id);
      if (!result.success) {
        setError(result.error || "Failed to cash out");
        setOptimisticCashOut(false);
        setCashoutTimer(null);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to cash out");
      setOptimisticCashOut(false);
      setCashoutTimer(null);
    } finally {
      setIsCashingOut(false);
    }
  };

  // Timer countdown for cashout message
  useEffect(() => {
    if (cashoutTimer === null || cashoutTimer <= 0) return;

    const interval = setInterval(() => {
      setCashoutTimer((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cashoutTimer]);

  // Auto-clear error messages after 2 seconds
  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [error]);

  const [mounted, setMounted] = useState(false);
  const [lastBetAmount, setLastBetAmount] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isConnected = mounted && !!walletAddress;
  const canPlaceBet =
    isConnected &&
    roundData?.phase === "BETTING" &&
    !myBet &&
    ((useFreeBet && freeBetsRemaining > 0) ||
      (!useFreeBet && walletBalance && walletBalance > 0));

  // Calculate potential payout for mobile display
  const displayMultiplier = useMultiplierAnimation(roundData);
  const potentialPayout =
    myBet && roundData?.phase === "FLYING"
      ? Number(myBet.amount) * Number(displayMultiplier)
      : 0;

  return (
    <div className="relative bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 p-2 sm:p-5 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.5)] space-y-2 sm:space-y-3 rounded-t-2xl sm:rounded-2xl">
      {/* Header Info */}
      <div className="flex items-center justify-between text-[9px] sm:text-xs text-slate-400 font-orbitron tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse"></span>
          <span className="hidden sm:inline">
            {mounted ? chainLabel : "Loading..."}
          </span>
          <span className="sm:hidden">
            {mounted ? chainLabel.split(" ")[0] : "..."}
          </span>
        </span>
        <div className="flex gap-1.5 sm:gap-2">
          <span className="bg-slate-800/80 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-700/50 text-emerald-400 text-[10px] sm:text-xs font-bold flex items-center gap-1">
            <span className="text-slate-500 text-[9px] sm:text-[10px]">💰</span>
            <span className="hidden sm:inline">
              {mounted ? walletBalance?.toFixed(2) || "0.00" : "0.00"}
            </span>
            <span className="sm:hidden">
              {mounted ? walletBalance?.toFixed(1) || "0" : "0"}
            </span>
            <span className="text-[8px] sm:text-[9px] text-emerald-500/70">
              USDC
            </span>
          </span>
          {freeBetsRemaining > 0 && (
            <span className="bg-blue-900/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30 text-blue-400 text-[10px] sm:text-xs font-bold flex items-center gap-1">
              <span className="text-blue-500 text-[9px] sm:text-[10px]">
                🎟️
              </span>
              {freeBetsRemaining}
              <span className="hidden sm:inline text-[9px] text-blue-500/70">
                FREE
              </span>
            </span>
          )}
        </div>
      </div>

      {myBet && (
        <div className="bg-gradient-to-b from-emerald-900/30 to-slate-900/80 border border-emerald-500/30 rounded-xl p-2.5 sm:p-4 shadow-inner relative overflow-hidden group">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>

          <div className="relative flex flex-row items-center justify-between mb-2 mt-0.5 sm:flex-col sm:justify-center sm:mb-3">
            <div className="text-left sm:text-center">
              <div className="text-[10px] font-orbitron text-emerald-400/80 uppercase tracking-widest mb-0 sm:mb-1 font-semibold flex items-center gap-2 flex-wrap">
                <span>ACTIVE BET</span>
                {myBet.status === "PENDING" && (
                  <span className="text-amber-500 animate-pulse text-[8px] sm:text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    VALIDATING...
                  </span>
                )}
                {myBet.status === "FAILED" && (
                  <span className="text-red-500 text-[8px] sm:text-[9px] bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    FAILED
                  </span>
                )}
              </div>
              {myBet.status === "FAILED" && myBet.validationError && (
                <div className="text-[8px] text-red-400 font-medium max-w-[150px] leading-tight mt-1">
                  {myBet.validationError}
                </div>
              )}
              {myBet.autoCashoutMultiplier && (
                <div className="inline-block mt-0.5 sm:mt-1.5 bg-slate-800/80 border border-emerald-500/30 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] text-emerald-400 font-bold font-courier">
                  Auto: {myBet.autoCashoutMultiplier}x
                </div>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] text-right sm:text-center">
              {Number(myBet.amount).toFixed(2)}{" "}
              <span className="text-xs sm:text-sm text-emerald-200">USDC</span>
            </div>
          </div>

          {(myBet.cashedOut || optimisticCashOut) && myBet.payout && (
            <div className="text-center mb-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 backdrop-blur-sm">
              <div className="text-emerald-400 font-black text-xl font-orbitron mb-0.5">
                {optimisticCashOut && isCashingOut
                  ? "CASHING OUT..."
                  : `+ ${Number(myBet.payout).toFixed(2)} USDC`}
              </div>
              <div className="text-[10px] text-emerald-300 font-bold font-courier uppercase tracking-wide">
                {optimisticCashOut && isCashingOut
                  ? "Processing Network Tx..."
                  : `Secured at ${myBet.cashoutMultiplier}x`}
              </div>
            </div>
          )}

          {roundData?.phase === "FLYING" &&
            !myBet.cashedOut &&
            !optimisticCashOut && (
              <button
                onClick={handleCashOut}
                disabled={isCashingOut}
                className="w-full relative group/btn overflow-hidden rounded-lg font-black font-orbitron uppercase tracking-widest text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 transition-all bg-[length:200%_auto] hover:bg-right"></div>
                <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-150%] group-hover/btn:translate-x-[150%] transition-all duration-700 ease-out z-10"></div>
                <div className="relative px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] z-20 gap-0.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-lg sm:text-xl leading-none group-hover/btn:scale-110 transition-transform">
                      💰
                    </span>
                    <span className="text-base sm:text-lg">
                      {isCashingOut ? "PROCESSING..." : "CASH OUT"}
                    </span>
                    <span className="hidden sm:inline-block text-base sm:text-lg">
                      NOW
                    </span>
                  </div>
                  {!isCashingOut && (
                    <div className="sm:hidden text-2xl font-black drop-shadow-md leading-none mt-0.5">
                      {potentialPayout.toFixed(2)}{" "}
                      <span className="text-[10px] align-top text-white/80">
                        USDC
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )}
        </div>
      )}

      {canPlaceBet && (
        <div className="space-y-2 sm:space-y-3">
          {freeBetsRemaining > 0 && (
            <div className="bg-slate-800/60 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-blue-300 font-bold font-orbitron text-xs flex items-center gap-1.5">
                  <span>🎟️</span> Use Free Bet
                </div>
                <div className="text-[10px] text-blue-400/70 font-courier mt-0.5">
                  Max Cover: {freeBetMaxAmount} USDC
                </div>
              </div>
              <button
                onClick={() => {
                  setUseFreeBet(!useFreeBet);
                  setBetAmount(freeBetMaxAmount.toString());
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                  useFreeBet
                    ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                    useFreeBet ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          <div>
            <div className="relative group">
              <div className="relative flex items-center bg-slate-800/80 border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all overflow-hidden">
                <div className="flex items-center justify-center text-emerald-400 mr-2 font-bold text-sm sm:text-base select-none">
                  $
                </div>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  step="0.10"
                  min="0.10"
                  max={
                    useFreeBet
                      ? freeBetMaxAmount.toString()
                      : Math.min(walletBalance || 0, maxBetAmount).toString()
                  }
                  className="w-full bg-transparent text-white text-lg sm:text-2xl font-bold font-orbitron focus:outline-none placeholder-slate-600"
                  placeholder="0.00"
                />
                <span className="text-slate-500 text-[10px] sm:text-xs font-bold font-courier ml-2 select-none tracking-wider">
                  USDC
                </span>
                {lastBetAmount && (
                  <button
                    onClick={() => {
                      setBetAmount(lastBetAmount);
                      handlePlaceBet(lastBetAmount);
                    }}
                    disabled={isProcessing || !canPlaceBet}
                    className="ml-2 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-black font-orbitron uppercase text-[10px] sm:text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    title={`Rebet previous amount: ${lastBetAmount} USDC`}
                  >
                    REBET
                  </button>
                )}
              </div>
            </div>
            {!betValidation.isValid && (
              <div className="text-red-400 text-[10px] mt-1.5 font-bold flex items-start gap-1 px-1">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <span>{betValidation.error}</span>
              </div>
            )}
            <div className="text-[10px] text-slate-500 mt-1 font-courier flex justify-between px-1 uppercase tracking-wide">
              <span>
                {useFreeBet
                  ? `Max Allowed: ${freeBetMaxAmount}`
                  : `Max Bet: ${maxBetAmount} USDC`}{" "}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {["0.5", "1", "5", "10"].map((amount) => {
              const amountNum = parseFloat(amount);
              const isDisabled = useFreeBet
                ? amountNum > freeBetMaxAmount
                : amountNum > maxBetAmount;
              return (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={isDisabled}
                  className={`relative rounded-md py-1.5 text-xs font-bold font-orbitron transition-all ${
                    isDisabled
                      ? "bg-slate-800/30 border border-slate-700/30 text-slate-600 cursor-not-allowed"
                      : "bg-slate-800/80 border border-slate-600/60 text-emerald-100 hover:border-emerald-500/50 hover:bg-slate-700 focus:outline-none"
                  }`}
                >
                  <span className="text-[9px] text-emerald-500 absolute top-0.5 left-1 opacity-50">
                    +
                  </span>
                  {amount}
                </button>
              );
            })}
          </div>

          <AutoCashout
            value={autoCashoutMultiplier}
            onChange={setAutoCashoutMultiplier}
            disabled={isProcessing}
          />

          <button
            onClick={() => handlePlaceBet()}
            disabled={!betValidation.isValid || isProcessing}
            className="w-full mt-1 relative group/play overflow-hidden rounded-lg font-black font-orbitron uppercase tracking-widest text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500"></div>
            <div className="absolute inset-0 bg-black opacity-0 group-active/play:opacity-10 transition-opacity"></div>
            <div className="relative px-3 py-2.5 sm:px-4 sm:py-3.5 flex items-center justify-center text-slate-950 shadow-[inset_0_1px_rgba(255,255,255,0.4)] z-20">
              {isProcessing ? "PROCESSING..." : `PLACE BET`}
            </div>
          </button>

          {txHash && (
            <div className="mt-3 text-[10px] font-courier flex items-center justify-center gap-1.5 bg-emerald-900/20 py-1.5 px-2 rounded-md border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400/80">Confirmed:</span>
              <a
                target="_blank"
                rel="noreferrer"
                href={`${explorerUrl}/tx/${txHash}`}
                className="text-emerald-300 underline text-[10px]"
              >
                {txHash.slice(0, 8)}...{txHash.slice(-6)}
              </a>
            </div>
          )}
        </div>
      )}

      {isConnected && !canPlaceBet && roundData?.phase === "BETTING" && (
        <div className="bg-slate-800/60 border border-amber-500/30 rounded-lg p-3 text-center">
          <div className="text-amber-400 font-bold font-orbitron tracking-widest text-xs">
            {walletBalance === 0 && freeBetsRemaining === 0
              ? "INSUFFICIENT BALANCE"
              : walletBalance === 0
                ? "INSUFFICIENT BALANCE"
                : myBet
                  ? "BET REGISTERED"
                  : "BETTING CLOSED"}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-slate-800/60 border border-emerald-500/30 rounded-lg p-6 text-center">
          <div className="text-2xl mb-2 animate-bounce">⚡</div>
          <div className="text-emerald-400 font-black mb-1 font-orbitron uppercase tracking-widest text-lg">
            CONNECT WALLET
          </div>
          <p className="text-[10px] text-emerald-200/60 font-courier">
            Authenticate to prepare for takeoff
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-md p-2.5 flex items-start gap-2 mt-2">
          <span className="text-sm mt-0.5">⚠️</span>
          <div className="text-red-300 text-[10px] font-medium leading-relaxed font-inter">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default BetControls;
