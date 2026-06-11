"use client";

import React, { useState, useEffect } from "react";
import { useGameContext } from "@/context/GameContext";
import { useBetValidation } from "@/hooks/useBetValidation";
import * as api from "@/lib/api";
import { getUserFriendlyErrorMessage } from "@/lib/error-messages";
import { ActiveBet } from "./ActiveBet";
import { BetPlacementForm } from "./BetPlacementForm";
import type { PlayerBet } from "@/types/game";

interface SingleBetPanelProps {
  explorerUrl: string;
  walletAddress: string | null | undefined;
  gameBalance: number | null;
  refreshBalance: () => Promise<{
    walletBalance: number;
    gameBalance: number;
  } | null>;
  panelId?: number;
}

export const SingleBetPanel: React.FC<SingleBetPanelProps> = ({
  explorerUrl,
  walletAddress,
  gameBalance,
  refreshBalance,
  panelId = 1,
}) => {
  const { roundData, cashOut, placeBet, optimisticBets, displayMultiplier } =
    useGameContext();

  // Track which bet ID belongs to this panel
  const [myBetId, setMyBetId] = useState<number | null>(null);

  // Find this panel's specific bet
  const myBet = React.useMemo(() => {
    if (!walletAddress || !roundData) return null;

    const allUserBets = [
      ...(roundData.players || []),
      ...optimisticBets.filter(
        (bet) =>
          (bet as PlayerBet & { roundId?: number }).roundId ===
          roundData.roundId,
      ),
    ].filter(
      (bet) => bet.address.toLowerCase() === walletAddress.toLowerCase(),
    );

    // If we have a tracked bet ID for this panel, return that specific bet
    if (myBetId !== null) {
      const trackedBet = allUserBets.find((bet) => bet.id === myBetId);
      if (trackedBet) return trackedBet;
    }

    // No bet for this panel
    return null;
  }, [roundData, walletAddress, optimisticBets, myBetId]);

  const [betAmount, setBetAmount] = useState("0.10");
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState<
    number | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeBetsRemaining, setFreeBetsRemaining] = useState<number>(0);
  const [freeBetMaxAmount, setFreeBetMaxAmount] = useState<number>(0.1);
  const [useFreeBet, setUseFreeBet] = useState(false);
  const [maxBetAmount, setMaxBetAmount] = useState<number>(0.5);
  const [lastBetAmount, setLastBetAmount] = useState<string | null>(null);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [optimisticCashOut, setOptimisticCashOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  const betValidation = useBetValidation(
    betAmount,
    useFreeBet ? freeBetMaxAmount : gameBalance || 0,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchFreeBetsInfo();
      fetchUserMaxBetAmount();
    }
  }, [walletAddress, roundData?.maxBetAmount]);

  useEffect(() => {
    if (!myBet) {
      setOptimisticCashOut(false);
    }
  }, [myBet?.id, roundData?.roundId]);

  // Reset bet tracking when round changes
  useEffect(() => {
    if (roundData?.roundId) {
      setMyBetId(null);
      setTxHash(null);
    }
  }, [roundData?.roundId]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(timer);
  }, [error]);

  const fetchFreeBetsInfo = async () => {
    try {
      if (!walletAddress) return;
      const userData = await api.fetchUserByAddress(walletAddress);
      if (userData?.user?.id) {
        const freeBetsData = await api.fetchFreeBetsForUser(userData.user.id);
        setFreeBetsRemaining(freeBetsData.freeBetsRemaining);
        setFreeBetMaxAmount(freeBetsData.freeBetMaxAmount);
      }
    } catch (err) {
      console.error("Failed to fetch free bets info:", err);
    }
  };

  const fetchUserMaxBetAmount = async () => {
    try {
      if (!walletAddress) return;
      const userData = await api.fetchUserByAddress(walletAddress);
      const globalMaxBet = Number(
        roundData?.maxBetAmount ??
          parseFloat(process.env.NEXT_PUBLIC_MAX_BET_AMOUNT || "10"),
      );
      if (userData?.user) {
        setMaxBetAmount(userData.user.maxBetAmount ?? globalMaxBet);
      } else {
        setMaxBetAmount(globalMaxBet);
      }
    } catch (err) {
      console.error("Failed to fetch user max bet amount:", err);
      const globalMaxBet = Number(
        roundData?.maxBetAmount ??
          parseFloat(process.env.NEXT_PUBLIC_MAX_BET_AMOUNT || "10"),
      );
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

    if (roundData?.phase !== "BETTING") {
      setError("Betting is currently closed. Wait for the next round.");
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
      if (!gameBalance || gameBalance <= 0) {
        setError("Insufficient game balance (Deposit USDC first)");
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
      if (res?.success && res.bet) {
        const placedBet = res.bet as PlayerBet;
        setTxHash(res.txHash || null);
        setLastBetAmount(amountToBet);
        setUseFreeBet(false);
        await fetchFreeBetsInfo();

        // Track this bet ID for this panel
        if (placedBet.id) {
          setMyBetId(placedBet.id);
        }
      } else {
        setError(res.error || "Failed to place bet");
      }
    } catch (err) {
      console.error("Error placing bet:", err);
      const friendlyError = getUserFriendlyErrorMessage(err);
      setError(friendlyError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashOut = async () => {
    if (!walletAddress || !myBet?.id) {
      setError("Cannot cash out at this time");
      return;
    }
    setError(null);
    setOptimisticCashOut(true);
    setIsCashingOut(true);

    try {
      const result = await cashOut(myBet.id);
      if (!result.success) {
        const friendlyError = getUserFriendlyErrorMessage(
          result.error || "Failed to cash out",
        );
        setError(friendlyError);
        setOptimisticCashOut(false);
      }
    } catch (err) {
      const friendlyError = getUserFriendlyErrorMessage(err);
      setError(friendlyError);
      setOptimisticCashOut(false);
    } finally {
      setIsCashingOut(false);
    }
  };

  const isConnected = mounted && !!walletAddress;
  const isBettingPhase = roundData?.phase === "BETTING";
  const canPlaceBet =
    isConnected &&
    isBettingPhase &&
    !myBet &&
    ((useFreeBet && freeBetsRemaining > 0) ||
      (!useFreeBet && gameBalance !== null && gameBalance > 0));

  return (
    <div className="space-y-2 sm:space-y-3">
      {myBet && (
        <ActiveBet
          bet={myBet}
          displayMultiplier={displayMultiplier}
          roundPhase={roundData?.phase || ""}
          isCashingOut={isCashingOut}
          optimisticCashOut={optimisticCashOut}
          onCashOut={handleCashOut}
        />
      )}

      {canPlaceBet && (
        <BetPlacementForm
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          autoCashoutMultiplier={autoCashoutMultiplier}
          onAutoCashoutChange={setAutoCashoutMultiplier}
          useFreeBet={useFreeBet}
          onUseFreeBetToggle={() => {
            setUseFreeBet(!useFreeBet);
            setBetAmount(freeBetMaxAmount.toString());
          }}
          freeBetsRemaining={freeBetsRemaining}
          freeBetMaxAmount={freeBetMaxAmount}
          maxBetAmount={maxBetAmount}
          lastBetAmount={lastBetAmount}
          isProcessing={isProcessing}
          canPlaceBet={canPlaceBet}
          isBettingPhase={isBettingPhase}
          validationError={betValidation.isValid ? null : betValidation.error}
          onPlaceBet={() => handlePlaceBet()}
          onRebet={() => {
            setBetAmount(lastBetAmount || "0.10");
            handlePlaceBet(lastBetAmount || undefined);
          }}
          explorerUrl={explorerUrl}
          txHash={txHash}
        />
      )}

      {isConnected && !canPlaceBet && roundData?.phase === "BETTING" && (
        <div className="bg-slate-800/60 border border-amber-500/30 rounded-lg p-3 text-center">
          <div className="text-amber-400 font-bold font-orbitron tracking-widest text-xs">
            {gameBalance === 0 && freeBetsRemaining === 0
              ? "INSUFFICIENT GAME BALANCE"
              : gameBalance === 0
                ? "INSUFFICIENT GAME BALANCE"
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
