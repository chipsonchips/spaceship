import { useEffect, useRef, useState } from "react";
import type { RoundData } from "@/types/game";

const DEFAULT_BETTING_LOCK_MS = 2000;

/**
 * Returns whether bets can currently be placed. Betting is open during the
 * BETTING phase, but closes `bettingLockMs` (default 2s) before takeoff so the
 * last moments before the round flies are locked. Mirrors the backend
 * enforcement in `bet-handler.service.ts`.
 */
export function useBettingOpen(roundData: RoundData | null): boolean {
  const [open, setOpen] = useState(false);
  const clockOffsetRef = useRef(0);

  useEffect(() => {
    clockOffsetRef.current = roundData?.serverTime
      ? Date.now() - roundData.serverTime
      : 0;
  }, [roundData?.serverTime, roundData?.roundId]);

  useEffect(() => {
    if (roundData?.phase !== "BETTING") {
      setOpen(false);
      return;
    }

    const lockMs = roundData.bettingLockMs ?? DEFAULT_BETTING_LOCK_MS;
    const flyAt = roundData.flyStartTime
      ? Number(roundData.flyStartTime)
      : Date.now() - clockOffsetRef.current + 60_000;
    const lockAt = flyAt - lockMs;

    let interval: ReturnType<typeof setInterval> | null = null;
    const cleanup = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const update = () => {
      const adjustedNow = Date.now() - clockOffsetRef.current;
      const isOpen = adjustedNow < lockAt;
      setOpen(isOpen);
      if (!isOpen) cleanup();
    };

    update();
    interval = setInterval(update, 200);
    return cleanup;
  }, [
    roundData?.phase,
    roundData?.flyStartTime,
    roundData?.bettingLockMs,
    roundData?.roundId,
    roundData?.serverTime,
  ]);

  return open;
}
