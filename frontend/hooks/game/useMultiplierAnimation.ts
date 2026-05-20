import { useEffect, useRef, useState } from "react";
import type { RoundData } from "@/types/game";
import { flyStartFromRound, multiplierAtElapsedMs } from "@/lib/game/timing";

export function useMultiplierAnimation(roundData: RoundData | null): number {
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const rafRef = useRef<number | null>(null);
  const flyStartRef = useRef(Date.now());
  const maxCrashRef = useRef(100);

  useEffect(() => {
    if (roundData?.phase === "FLYING") {
      flyStartRef.current = flyStartFromRound(roundData);
      maxCrashRef.current = Number(roundData.maxCrashMultiplier) || 100;
    }
  }, [roundData?.phase, roundData?.roundId, roundData?.flyStartTime]);

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const phase = roundData?.phase;

    if (phase === "FLYING") {
      const animate = () => {
        const elapsed = Math.max(0, Date.now() - flyStartRef.current);
        setDisplayMultiplier(
          multiplierAtElapsedMs(elapsed, maxCrashRef.current),
        );
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return stop;
    }

    stop();
    if (phase === "CRASHED") {
      setDisplayMultiplier(Number(roundData?.crashMultiplier || 1.0));
    } else {
      setDisplayMultiplier(1.0);
    }
  }, [roundData?.phase, roundData?.crashMultiplier, roundData?.roundId]);

  return displayMultiplier;
}
