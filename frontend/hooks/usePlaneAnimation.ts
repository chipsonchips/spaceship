import { useEffect, useRef, useState } from "react";
import { RoundData } from "@/types/game";
import { PlaneState } from "@/types/game";

// Mirror backend implementation so client can predict/smooth locally
export function calculatePlanePosition(elapsedMs: number): {
  x: number;
  y: number;
} {
  const progress = Math.min(elapsedMs / 10000, 1);
  // Fixed horizontal center position
  const x = 50;
  // Vertical movement: y=0 at bottom, y=100 at top
  // Start at 0 (bottom) and move to 100 (top)
  const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad
  const y = eased * 100;
  return { x, y };
}

export default function usePlaneAnimation(roundData: RoundData | null) {
  const [position, setPosition] = useState({ x: 50, y: 0 });
  const [angle, setAngle] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef<number | null>(null);
  const prevYRef = useRef<number>(0);
  const angleRef = useRef<number>(0);
  const crashRef = useRef<{ start?: number }>({});

  useEffect(() => {

    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (!roundData) {
      stop();
      setPosition({ x: 50, y: 0 });
      setAngle(0);
      setOpacity(1);
      prevYRef.current = 0;
      angleRef.current = 0;
      return;
    }

    if (roundData.phase === "BETTING") {
      if (!crashRef.current.start) {
        crashRef.current.start = Date.now();
      }

      const animateBetting = () => {
        const now = Date.now();
        const elapsed = now - (crashRef.current.start || now);

        const tx = 50; 
        const t = (elapsed / 1000);
        const ty = 2 + Math.sin(t * 1.5) * 2; 

        const ta = Math.sin(t * 1.5) * 5; 

        setPosition({ x: tx, y: ty });
        setAngle(ta);
        setOpacity(1);

        rafRef.current = requestAnimationFrame(animateBetting);
      };

      rafRef.current = requestAnimationFrame(animateBetting);
      return () => stop();
    }

    if (roundData.phase === "FLYING") {
      crashRef.current = {};
      
      // Calculate elapsed time from currentMultiplier to avoid client/server clock desync
      const serverElapsed = Math.pow((roundData.currentMultiplier - 1.0) * 5, 2/3) * 1000;
      const flyStart = Date.now() - serverElapsed;
      
      prevYRef.current = 0;
      angleRef.current = 0;

      const animate = () => {
        const now = Date.now();
        const elapsed = Math.max(0, now - flyStart);
        const predicted = calculatePlanePosition(elapsed);

        // Calculate rotation based on vertical movement direction
        const dy = predicted.y - prevYRef.current;

        let targetAngle = 0;
        if (dy > 0) {
          const climbSpeed = Math.min(dy * 1.5, 5);
          targetAngle = 0 - climbSpeed;
        } else if (dy < 0) {
          targetAngle = 0 + 3;
        }

        const smoothedAngle = angleRef.current + (targetAngle - angleRef.current) * 0.08;
        angleRef.current = smoothedAngle;

        const nx = 50; 
        const ny = predicted.y;

        prevYRef.current = ny;

        setPosition({ x: nx, y: ny });
        setAngle(smoothedAngle);
        setOpacity(1);

        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
      return () => stop();
    }

    // CRASHED PHASE: Fall and spin animation
    if (roundData.phase === "CRASHED") {
      stop();
      const crashStart = Date.now();
      crashRef.current.start = crashStart;

      const startPos = roundData.planePosition || position;
      const startAngle = angle;

      const duration = 1000; // ms

      const tick = () => {
        const now = Date.now();
        const t = Math.min(1, (now - crashStart) / duration);

        // Exponential fall down (accelerating)
        const fallProgress = t * t; // Quadratic easing
        const y = startPos.y - fallProgress * (startPos.y + 20); // Fall below screen

        // Rotate plane to point downward and spin
        // From current angle to 135 degrees (pointing down-right) + extra spin
        const ang = startAngle + (135 - startAngle) * t + (t * 180); // Spin 180 degrees extra

        // Fade out
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

    return undefined;
  }, [roundData]);

  return { position, angle, opacity };
}
