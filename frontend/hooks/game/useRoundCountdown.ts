import { useEffect, useRef, useState } from "react";
import type { RoundData } from "@/types/game";
import { restartDelaySec } from "@/lib/game/timing";

export function useRoundCountdown(roundData: RoundData | null): number {
  const [countdown, setCountdown] = useState(0);
  const clockOffsetRef = useRef(0);

  useEffect(() => {
    if (roundData?.serverTime) {
      clockOffsetRef.current = Date.now() - roundData.serverTime;
    } else {
      clockOffsetRef.current = 0;
    }
  }, [roundData?.serverTime, roundData?.roundId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    if (!roundData) {
      setCountdown(0);
      return cleanup;
    }

    if (roundData.phase === "CRASHED") {
      let timeLeft = restartDelaySec(roundData);
      setCountdown(timeLeft);
      interval = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        setCountdown(timeLeft);
        if (timeLeft <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 1000);
      return cleanup;
    }

    if (roundData.phase === "BETTING") {
      const flyAt = roundData.flyStartTime
        ? Number(roundData.flyStartTime)
        : Date.now() - clockOffsetRef.current + 60_000;

      const update = () => {
        const adjustedNow = Date.now() - clockOffsetRef.current;
        const secsLeft = Math.max(0, Math.ceil((flyAt - adjustedNow) / 1000));
        setCountdown(secsLeft);
        if (secsLeft <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      update();
      interval = setInterval(update, 1000);
      return cleanup;
    }

    setCountdown(0);
    return cleanup;
  }, [
    roundData?.phase,
    roundData?.flyStartTime,
    roundData?.roundId,
    roundData?.roundRestartDelayMs,
    roundData?.serverTime,
  ]);

  return countdown;
}
