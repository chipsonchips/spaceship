"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RoundData } from "@/types/game";

interface SpaceBackgroundProps {
  roundData: RoundData | null;
  multiplier: number;
}

/**
 * Live, game-like space backdrop.
 *
 * Renders layered parallax starfields, drifting planets and tumbling
 * asteroids/meteor rocks. Everything scrolls downward (giving the sense the
 * ship is rushing upward through space) while the ship is FLYING, and freezes
 * in place while the ship is hovering (BETTING / CRASHED) — so the player feels
 * the difference between idling and blasting off.
 *
 * Drawn entirely with CSS gradients so it needs no image assets.
 */

type Star = {
  id: number;
  left: number;
  top: number;
  size: number;
  twinkle: number;
  delay: number;
  opacity: number;
};

type Planet = {
  id: number;
  left: number;
  top: number;
  size: number;
  gradient: string;
  glow: string;
  ring: boolean;
  drift: number;
  delay: number;
};

type Asteroid = {
  id: number;
  left: number;
  top: number;
  size: number;
  spin: number;
  delay: number;
  spread: number;
};

// Deterministic-ish random layers, generated once on mount.
function buildStars(count: number, maxSize: number): Star[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * maxSize + 0.6,
    twinkle: 2.5 + Math.random() * 3.5,
    delay: Math.random() * 5,
    opacity: 0.4 + Math.random() * 0.6,
  }));
}

const PLANET_PALETTES = [
  {
    gradient:
      "radial-gradient(circle at 32% 28%, #8ec5ff 0%, #3b82f6 38%, #1e3a8a 72%, #0b1530 100%)",
    glow: "rgba(59, 130, 246, 0.45)",
  },
  {
    gradient:
      "radial-gradient(circle at 30% 26%, #ffd9a0 0%, #f59e0b 36%, #b45309 70%, #3b1d05 100%)",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  {
    gradient:
      "radial-gradient(circle at 34% 30%, #c4b5fd 0%, #8b5cf6 40%, #5b21b6 74%, #1e1033 100%)",
    glow: "rgba(139, 92, 246, 0.4)",
  },
  {
    gradient:
      "radial-gradient(circle at 30% 28%, #99f6e4 0%, #2dd4bf 38%, #0f766e 72%, #042f2e 100%)",
    glow: "rgba(45, 212, 191, 0.4)",
  },
];

function buildPlanets(count: number): Planet[] {
  return Array.from({ length: count }).map((_, i) => {
    const palette = PLANET_PALETTES[i % PLANET_PALETTES.length];
    return {
      id: i,
      left: 8 + Math.random() * 84,
      top: Math.random() * 100,
      size: 90 + Math.random() * 150,
      gradient: palette.gradient,
      glow: palette.glow,
      ring: Math.random() > 0.55,
      drift: 14 + Math.random() * 12,
      delay: Math.random() * 6,
    };
  });
}

function buildAsteroids(count: number): Asteroid[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 10 + Math.random() * 26,
    spin: 6 + Math.random() * 10,
    delay: Math.random() * 6,
    spread: 0.5 + Math.random() * 0.5,
  }));
}

/**
 * A single scrolling parallax layer. The content is rendered twice (stacked)
 * inside a 200%-tall track that translates up by 50% over one loop, producing a
 * seamless infinite downward scroll. The scroll pauses when `playing` is false.
 */
const ScrollLayer: React.FC<{
  duration: number;
  playing: boolean;
  opacity?: number;
  children: React.ReactNode;
}> = ({ duration, playing, opacity = 1, children }) => (
  <div className="absolute inset-0 overflow-hidden" style={{ opacity }}>
    <div
      className="absolute left-0 top-0 w-full"
      style={{
        height: "200%",
        animationName: "spaceScroll",
        animationDuration: `${duration}s`,
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
        animationPlayState: playing ? "running" : "paused",
        willChange: "transform",
      }}
    >
      <div className="absolute left-0 top-0 h-1/2 w-full">{children}</div>
      <div className="absolute left-0 top-1/2 h-1/2 w-full">{children}</div>
    </div>
  </div>
);

/**
 * Scales the planets relative to the viewport width so they don't overwhelm
 * narrow phone screens. At our reference width (768px) planets render at their
 * full design size; below that they shrink proportionally (clamped so they
 * never disappear on very small screens or grow oversized on desktops).
 */
function usePlanetScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      setScale(Math.max(0.45, Math.min(1, width / 768)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({
  roundData,
  multiplier,
}) => {
  const isFlying = roundData?.phase === "FLYING";
  const planetScale = usePlanetScale();

  const farStars = useMemo(() => buildStars(45, 1.4), []);
  const midStars = useMemo(() => buildStars(30, 2.2), []);
  const nearStars = useMemo(() => buildStars(18, 3), []);
  const planets = useMemo(() => buildPlanets(3), []);
  const asteroids = useMemo(() => buildAsteroids(10), []);

  // Faster scroll as the multiplier climbs — the ship is accelerating.
  const speed = Math.min(5, 1 + (multiplier - 1) * 0.18);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep-space colour wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(30, 41, 99, 0.35) 0%, rgba(11, 15, 25, 0) 60%), radial-gradient(ellipse at 80% -10%, rgba(88, 28, 135, 0.25) 0%, rgba(11, 15, 25, 0) 55%)",
        }}
      />

      {/* Far starfield — slowest */}
      <ScrollLayer duration={90 / speed} playing={isFlying} opacity={0.7}>
        {farStars.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animation: `twinkle ${s.twinkle}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </ScrollLayer>

      {/* Planets — slow, with subtle drift + glow */}
      <ScrollLayer duration={60 / speed} playing={isFlying}>
        {planets.map((p) => {
          const size = p.size * planetScale;
          return (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: size,
              height: size,
              transform: "translate(-50%, -50%)",
              animationName: "planetDrift",
              animationDuration: `${p.drift}s`,
              animationTimingFunction: "ease-in-out",
              animationDelay: `${p.delay}s`,
              animationIterationCount: "infinite",
              animationPlayState: isFlying ? "running" : "paused",
            }}
          >
            {p.ring && (
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  width: size * 1.7,
                  height: size * 0.5,
                  transform: "translate(-50%, -50%) rotate(-20deg)",
                  borderRadius: "50%",
                  border: `${Math.max(2, size * 0.04)}px solid rgba(255,255,255,0.12)`,
                  boxShadow: `0 0 12px ${p.glow}`,
                }}
              />
            )}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: p.gradient,
                boxShadow: `0 0 ${size * 0.4}px ${p.glow}, inset -${size * 0.12}px -${size * 0.12}px ${size * 0.3}px rgba(0,0,0,0.55)`,
              }}
            />
          </div>
          );
        })}
      </ScrollLayer>

      {/* Mid starfield */}
      <ScrollLayer duration={55 / speed} playing={isFlying} opacity={0.85}>
        {midStars.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              boxShadow: "0 0 4px rgba(255,255,255,0.7)",
              animation: `twinkle ${s.twinkle}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </ScrollLayer>

      {/* Asteroids / meteor rocks — tumble as they pass */}
      <ScrollLayer duration={38 / speed} playing={isFlying}>
        {asteroids.map((a) => (
          <div
            key={a.id}
            className="absolute"
            style={{
              left: `${a.left}%`,
              top: `${a.top}%`,
              width: a.size,
              height: a.size,
              transform: "translate(-50%, -50%)",
              animationName: "asteroidSpin",
              animationDuration: `${a.spin / Math.max(1, speed * 0.6)}s`,
              animationTimingFunction: "linear",
              animationDelay: `${a.delay}s`,
              animationIterationCount: "infinite",
              animationPlayState: isFlying ? "running" : "paused",
            }}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #9ca3af 0%, #4b5563 45%, #1f2937 100%)",
                borderRadius: "42% 58% 63% 37% / 47% 38% 62% 53%",
                boxShadow:
                  "inset -2px -2px 4px rgba(0,0,0,0.6), 0 0 6px rgba(148,163,184,0.25)",
              }}
            />
          </div>
        ))}
      </ScrollLayer>

      {/* Near starfield — fastest, brightest */}
      <ScrollLayer duration={28 / speed} playing={isFlying}>
        {nearStars.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              boxShadow: "0 0 6px rgba(255,255,255,0.9)",
              animation: `twinkle ${s.twinkle}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </ScrollLayer>
    </div>
  );
};

export default SpaceBackground;
