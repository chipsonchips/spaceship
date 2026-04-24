"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { useMultiplierAnimation } from "@/hooks/useGame";
import usePlaneAnimation from "@/hooks/usePlaneAnimation";
import Image from "next/image";

const GameBoard: React.FC = () => {
  const { roundData } = useGameContext();
  const displayMultiplier = useMultiplierAnimation(roundData);

  const plane = usePlaneAnimation(roundData);

  return (
    <div className="">
      {/* Animated Radar Background - Full viewport coverage */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Radar grid */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
              linear-gradient(rgba(74, 222, 128, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(74, 222, 128, 0.1) 1px, transparent 1px)
            `,
              backgroundSize: "50px 50px",
              animation: "gridPulse 4s ease-in-out infinite",
            }}
          />
        </div>

        {/* Radar sweep effect - constrained to viewport */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,100vw)] h-[min(800px,100vh)] opacity-10">
          <div className="absolute inset-0 rounded-full border border-green-500/30" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(74, 222, 128, 0.3) 90deg, transparent 90deg)",
              animation: "radarSweep 4s linear infinite",
            }}
          />
        </div>

        {/* Concentric circles - responsive sizing */}
        {[
          { size: "min(200px, 30vw)", delay: 0 },
          { size: "min(400px, 60vw)", delay: 1 },
          { size: "min(600px, 90vw)", delay: 2 },
        ].map((circle, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-green-500/10"
            style={{
              width: circle.size,
              height: circle.size,
              animation: `pulse ${3 + circle.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center">
          <div
            className={`font-bold mb-1 tabular-nums tracking-tighter font-orbitron ${
              roundData?.phase === "CRASHED"
                ? "text-red-500"
                : displayMultiplier >= 5
                  ? "text-red-400"
                  : displayMultiplier >= 3
                    ? "text-orange-400"
                    : displayMultiplier >= 1.5
                      ? "text-yellow-400"
                      : "text-green-400"
            } transition-colors duration-300 text-6xl sm:text-7xl md:text-8xl lg:text-9xl`}
          >
            {roundData?.phase === "CRASHED" && roundData.crashMultiplier
              ? Number(roundData.crashMultiplier).toFixed(2)
              : typeof displayMultiplier === "number"
                ? Number(displayMultiplier).toFixed(2)
                : "1.00"}
            <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl align-top ml-1">
              x
            </span>
          </div>
          {roundData?.phase === "CRASHED" && (
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400 animate-pulse font-orbitron uppercase tracking-widest">
              CRASHED
            </div>
          )}
        </div>
      </div>

      {roundData &&
        (roundData.phase === "FLYING" ||
          roundData.phase === "CRASHED" ||
          roundData.phase === "BETTING") && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${plane.position.x}%`,
              bottom: `${plane.position.y}%`,
              transform: `translate(-50%, 50%) rotate(${plane.angle}deg)`,
              opacity: plane.opacity,
              willChange: "transform, opacity, left, bottom",
              zIndex: 20,
            }}
          >
            <div style={{ width: "clamp(40px, 12vw, 96px)", height: "auto" }}>
              <Image
                src="/plane.png"
                alt="Flying plane"
                width={64}
                height={64}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  zIndex: 200,
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default GameBoard;
