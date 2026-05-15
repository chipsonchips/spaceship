"use client";

import React, { useMemo } from "react";
import { RoundData } from "@/types/game";

interface FlyingEffectsProps {
  roundData: RoundData | null;
  multiplier: number;
}

const FlyingEffects: React.FC<FlyingEffectsProps> = ({
  roundData,
  multiplier,
}) => {
  const isFlying = roundData?.phase === "FLYING";

  // Create stable star positions
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 5,
    }));
  }, []);

  // Create speed lines that appear at higher multipliers
  const speedLines = useMemo(() => {
    if (multiplier < 1.5) return [];
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.5,
      height: 50 + Math.random() * 150,
    }));
  }, [multiplier > 1.5]);

  if (!isFlying) return null;

  const speedScale = Math.min(3, 1 + (multiplier - 1) * 0.2);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[5]">
      {/* Parallax Stars/Particles */}
      <div
        className="absolute inset-0"
        style={{ opacity: Math.min(0.5, 0.2 + (multiplier - 1) * 0.1) }}
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationName: "parallaxScroll",
              animationDuration: `${star.duration / speedScale}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDelay: `-${star.delay}s`,
              boxShadow: "0 0 4px rgba(255, 255, 255, 0.8)",
            }}
          />
        ))}
      </div>

      {/* Speed Lines */}
      {multiplier > 2 && (
        <div className="absolute inset-0">
          {speedLines.map((line) => (
            <div
              key={line.id}
              className="absolute bg-gradient-to-t from-white/0 via-white/40 to-white/0 w-[2px]"
              style={{
                left: line.left,
                height: line.height,
                animationName: "speedLine",
                animationDuration: `${line.duration / speedScale}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                animationDelay: `${line.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Dynamic Glow/Vignette that intensifies with multiplier */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, transparent 40%, rgba(0, 0, 0, ${Math.min(0.6, (multiplier - 1) * 0.05)}) 100%)`,
        }}
      />
    </div>
  );
};

export default FlyingEffects;
