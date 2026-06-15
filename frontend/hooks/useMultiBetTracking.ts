import { useState, useCallback, useEffect } from "react";
import type { PlayerBet } from "@/types/game";

/**
 * Hook for tracking which bet belongs to which panel in multi-bet mode
 * Each panel gets assigned a specific bet ID that it manages independently
 */
export function useMultiBetTracking(
    panelId: number,
    roundId: number | undefined,
    walletAddress: string | null | undefined,
    allBets: PlayerBet[],
) {
    const [trackedBetId, setTrackedBetId] = useState<number | null>(null);

    // Reset tracking when round changes
    useEffect(() => {
        if (roundId) {
            setTrackedBetId(null);
        }
    }, [roundId]);

    // Track a new bet for this panel
    const trackBet = useCallback((betId: number) => {
        setTrackedBetId(betId);
    }, []);

    // Get this panel's specific bet
    const myBet = allBets.find((bet) => bet.id === trackedBetId) || null;

    // Check if this panel can place a bet (no active bet)
    const canPlaceBet = !myBet;

    return {
        myBet,
        canPlaceBet,
        trackBet,
        trackedBetId,
    };
}
