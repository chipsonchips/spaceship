"use client";

import React, { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ParticleEffectProps {
  trigger: boolean;
  x: number;
  y: number;
  particleCount?: number;
  type?: "crash" | "cashout";
}

const ParticleEffect: React.FC<ParticleEffectProps> = ({
  trigger,
  x,
  y,
  particleCount = 20,
  type = "crash",
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    setIsActive(true);
    const newParticles: Particle[] = Array.from({ length: particleCount }).map(
      (_, i) => {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 2 + Math.random() * 3;
        return {
          id: i,
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 1,
          maxLife: 1,
          size: 4 + Math.random() * 6,
        };
      },
    );

    setParticles(newParticles);

    const animationDuration = 600;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / animationDuration;

      if (progress >= 1) {
        setParticles([]);
        setIsActive(false);
        return;
      }

      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          life: 1 - progress,
        })),
      );

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [trigger, x, y, particleCount]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${
            type === "crash"
              ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              : "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
          }`}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.life * 0.8,
            transform: `translate(-50%, -50%)`,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
};

export default ParticleEffect;
