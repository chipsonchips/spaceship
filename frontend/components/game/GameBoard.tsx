"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGameContext } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useMultiplierAnimation } from "@/hooks/useGame";
import usePlaneAnimation from "@/hooks/usePlaneAnimation";
import { useSound } from "@/hooks/useSound";
import ParticleEffect from "./ParticleEffect";
import FlyingEffects from "./FlyingEffects";
import Image from "next/image";

const GameBoard: React.FC = () => {
  const { roundData } = useGameContext();
  const { settings } = useSettings();
  const displayMultiplier = useMultiplierAnimation(roundData);
  const plane = usePlaneAnimation(roundData);
  const { playCrash, playTakeoff } = useSound({
    enabled: settings.soundEnabled,
    volume: settings.soundVolume,
  });

  const [crashTrigger, setCrashTrigger] = useState(false);
  const [crashPosition, setCrashPosition] = useState({ x: 0, y: 0 });
  const prevPhaseRef = useRef<string | null>(null);
  const planeRef = useRef<HTMLDivElement>(null);

  // Trigger crash effects when phase changes to CRASHED
  useEffect(() => {
    if (roundData?.phase === "CRASHED" && prevPhaseRef.current !== "CRASHED") {
      if (settings.soundEnabled) {
        playCrash();
      }

      // Get plane position for particle effect
      if (settings.particleEffectsEnabled && planeRef.current) {
        const rect = planeRef.current.getBoundingClientRect();
        setCrashPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        setCrashTrigger(true);
        setTimeout(() => setCrashTrigger(false), 600);
      }
    }

    if (roundData?.phase === "FLYING" && prevPhaseRef.current !== "FLYING") {
      if (settings.soundEnabled) {
        playTakeoff();
      }
    }

    prevPhaseRef.current = roundData?.phase || null;
  }, [
    roundData?.phase,
    playCrash,
    playTakeoff,
    settings.soundEnabled,
    settings.particleEffectsEnabled,
  ]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-[10] ${
        roundData?.phase === "FLYING" && displayMultiplier > 5
          ? "animate-[cameraShake_0.2s_infinite]"
          : ""
      }`}
    >
      <ParticleEffect
        trigger={crashTrigger}
        x={crashPosition.x}
        y={crashPosition.y}
        type="crash"
      />
      <FlyingEffects roundData={roundData} multiplier={displayMultiplier} />
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
              animation: `gridPulse ${Math.max(1, 4 - (displayMultiplier - 1) * 0.5)}s ease-in-out infinite`,
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
              animation: `radarSweep ${Math.max(1, 4 - (displayMultiplier - 1) * 0.5)}s linear infinite`,
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
            } transition-colors duration-300 text-6xl sm:text-7xl md:text-8xl lg:text-9xl ${
              roundData?.phase === "FLYING" && settings.animationsEnabled
                ? "animate-pulse"
                : ""
            }`}
            style={{
              animation:
                roundData?.phase === "FLYING" && settings.animationsEnabled
                  ? `multiplierPulse ${Math.max(0.3, 1 - displayMultiplier * 0.1)}s ease-in-out infinite`
                  : "none",
            }}
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

      {/* Screen tint overlay for tension */}
      {roundData?.phase === "FLYING" && settings.screenTintEnabled && (
        <div
          className="fixed inset-0 pointer-events-none z-[5] transition-colors duration-300"
          style={{
            backgroundColor:
              displayMultiplier >= 5
                ? "rgba(239, 68, 68, 0.05)"
                : displayMultiplier >= 3
                  ? "rgba(234, 179, 8, 0.05)"
                  : displayMultiplier >= 1.5
                    ? "rgba(234, 179, 8, 0.02)"
                    : "rgba(74, 222, 128, 0.02)",
          }}
        />
      )}

      {roundData &&
        (roundData.phase === "FLYING" ||
          roundData.phase === "CRASHED" ||
          roundData.phase === "BETTING") && (
          <div
            className="absolute pointer-events-none"
            ref={planeRef}
            style={{
              left: `${plane.position.x}%`,
              bottom: `${plane.position.y}%`,
              transform: `translate(-50%, 50%) rotate(${plane.angle}deg)`,
              opacity: plane.opacity,
              willChange: "transform, opacity, left, bottom",
              zIndex: 20,
              transition:
                roundData.phase === "BETTING"
                  ? "none"
                  : "opacity 0.1s linear",
            }}
          >
            {/* Thruster Glow */}
            {roundData.phase === "FLYING" && (
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 w-10 h-20 pointer-events-none -z-10">
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0) 70%)",
                    filter: "blur(3px)",
                    animation: "thrusterPulse 0.1s infinite alternate",
                    opacity: Math.max(
                      0.5,
                      Math.min(1, 0.5 + (displayMultiplier - 1) * 0.1),
                    ),
                  }}
                />
              </div>
            )}

            <div
              style={{
                width: "clamp(40px, 12vw, 96px)",
                height: "auto",
                filter:
                  roundData.phase === "FLYING"
                    ? `drop-shadow(0 0 ${Math.min(20, displayMultiplier * 2)}px rgba(74, 222, 128, 0.5))`
                    : "none",
                animation:
                  roundData.phase === "BETTING"
                    ? "float 3s ease-in-out infinite"
                    : "none",
              }}
            >
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
