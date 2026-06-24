"use client";

import React, { useEffect, useRef, useState } from "react";
import { onWin, type WinDetail } from "@/lib/celebrate";
import { useSettings } from "@/context/SettingsContext";

/**
 * Full-screen win celebration overlay. Listens for win events emitted from the
 * bet controls and plays a payout flash + count-up + emerald screen glow. Gated
 * by the `winCelebrationEnabled` setting. Mounted once near the app root.
 */

type Confetto = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
};

const COLORS = ["#34d399", "#10b981", "#fbbf24", "#f59e0b", "#ffffff"];

const WinCelebration: React.FC = () => {
  const { settings } = useSettings();
  const [win, setWin] = useState<WinDetail | null>(null);
  const [display, setDisplay] = useState(0);
  const [confetti, setConfetti] = useState<Confetto[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return onWin((detail) => {
      if (!settings.winCelebrationEnabled) return;
      if (detail.payout <= 0) return;

      setWin(detail);
      setConfetti(
        Array.from({ length: 32 }).map((_, i) => ({
          id: i + Math.random(),
          left: Math.random() * 100,
          delay: Math.random() * 0.25,
          duration: 1.1 + Math.random() * 0.9,
          rotate: Math.random() * 360,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 8,
        })),
      );

      // Count the payout up for a satisfying tick.
      const start = performance.now();
      const duration = 700;
      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(detail.payout * eased);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setWin(null), 2600);
    });
  }, [settings.winCelebrationEnabled]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!win) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden flex items-center justify-center">
      {/* Emerald screen glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.06) 40%, transparent 70%)",
          animation: "winFlash 2.6s ease-out forwards",
        }}
      />

      {/* Confetti */}
      {confetti.map((c) => (
        <span
          key={c.id}
          className="absolute top-[-5%]"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 0.5,
            background: c.color,
            borderRadius: 2,
            transform: `rotate(${c.rotate}deg)`,
            animation: `confettiFall ${c.duration}s linear ${c.delay}s forwards`,
          }}
        />
      ))}

      {/* Payout card */}
      <div
        className="relative text-center px-8 py-5"
        style={{ animation: "winPop 0.5s cubic-bezier(0.18,1.25,0.4,1) both" }}
      >
        <div className="text-emerald-300 font-orbitron uppercase tracking-[0.3em] text-xs sm:text-sm mb-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Cashed Out
        </div>
        <div className="text-5xl sm:text-7xl font-black font-orbitron text-white drop-shadow-[0_0_25px_rgba(16,185,129,0.7)] tabular-nums">
          +{display.toFixed(2)}
          <span className="text-2xl sm:text-3xl text-emerald-300 ml-2 align-top">
            USDC
          </span>
        </div>
        <div className="mt-1 text-amber-300 font-courier font-bold tracking-widest text-sm sm:text-lg drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
          @ {win.multiplier.toFixed(2)}x
        </div>
      </div>
    </div>
  );
};

export default WinCelebration;
