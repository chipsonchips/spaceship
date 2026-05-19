import { useEffect, useRef, useState } from "react";
import { RoundData } from "@/types/game";

// Mirror backend implementation so client can predict/smooth locally
export function calculatePlanePosition(elapsedMs: number): {
  x: number;
  y: number;
} {
  const progress = Math.min(elapsedMs / 10000, 1);
  const x = 50;
  const eased = 1 - Math.pow(1 - progress, 2);
  const y = eased * 100;
  return { x, y };
}

function flyStartFromRound(round: RoundData): number {
  if (round.flyStartTime) {
    const clockOffset = round.serverTime ? Date.now() - round.serverTime : 0;
    return Number(round.flyStartTime) + clockOffset;
  }
  const mult = Number(round.currentMultiplier) || 1;
  const serverElapsed = Math.pow((mult - 1.0) * 5, 2 / 3) * 1000;
  return Date.now() - serverElapsed;
}

export default function usePlaneAnimation(roundData: RoundData | null) {
  const [position, setPosition] = useState({ x: 50, y: 0 });
  const [angle, setAngle] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef<number | null>(null);
  const prevYRef = useRef<number>(0);
  const angleRef = useRef<number>(0);
  const bettingStartRef = useRef<number | null>(null);
  const positionRef = useRef(position);

  positionRef.current = position;

  const phase = roundData?.phase;
  const roundId = roundData?.roundId;

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (!roundData || !phase) {
      stop();
      setPosition({ x: 50, y: 0 });
      setAngle(0);
      setOpacity(1);
      prevYRef.current = 0;
      angleRef.current = 0;
      bettingStartRef.current = null;
      return;
    }

    if (phase === "BETTING") {
      if (!bettingStartRef.current) {
        bettingStartRef.current = Date.now();
      }

      const animateBetting = () => {
        const elapsed = Date.now() - (bettingStartRef.current || Date.now());
        const t = elapsed / 1000;
        setPosition({ x: 50, y: 2 + Math.sin(t * 1.5) * 2 });
        setAngle(Math.sin(t * 1.5) * 5);
        setOpacity(1);
        rafRef.current = requestAnimationFrame(animateBetting);
      };

      rafRef.current = requestAnimationFrame(animateBetting);
      return () => {
        stop();
        bettingStartRef.current = null;
      };
    }

    bettingStartRef.current = null;

    if (phase === "FLYING") {
      const flyStart = flyStartFromRound(roundData);
      prevYRef.current = calculatePlanePosition(
        Math.max(0, Date.now() - flyStart),
      ).y;
      angleRef.current = 0;

      const animate = () => {
        const elapsed = Math.max(0, Date.now() - flyStart);
        const predicted = calculatePlanePosition(elapsed);
        const dy = predicted.y - prevYRef.current;

        let targetAngle = 0;
        if (dy > 0) {
          targetAngle = 0 - Math.min(dy * 1.5, 5);
        } else if (dy < 0) {
          targetAngle = 3;
        }

        const smoothedAngle =
          angleRef.current + (targetAngle - angleRef.current) * 0.08;
        angleRef.current = smoothedAngle;
        prevYRef.current = predicted.y;

        setPosition({ x: 50, y: predicted.y });
        setAngle(smoothedAngle);
        setOpacity(1);
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
      return () => stop();
    }

    if (phase === "CRASHED") {
      const crashStart = Date.now();
      const startPos = roundData.planePosition ?? positionRef.current;
      const startAngle = angleRef.current;
      const duration = 1000;

      const tick = () => {
        const t = Math.min(1, (Date.now() - crashStart) / duration);
        const fallProgress = t * t;
        const y = startPos.y - fallProgress * (startPos.y + 20);
        const ang = startAngle + (135 - startAngle) * t + t * 180;
        const op = 1 - t;

        setPosition({ x: startPos.x, y });
        setAngle(ang);
        setOpacity(op);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => stop();
    }

    return () => stop();
  }, [phase, roundId, roundData?.flyStartTime]);

  return { position, angle, opacity };
}
