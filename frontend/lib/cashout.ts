/**
 * Visual urgency for the CASH OUT button. As the multiplier climbs the button
 * shifts colour (green → amber → orange → red) and pulses faster, building the
 * "cash out now!" tension that makes crash games feel alive.
 */

export interface CashoutUrgency {
  /** Tailwind gradient classes for the button background. */
  gradient: string;
  /** Box-shadow glow colour (rgba). */
  glow: string;
  /** Pulse animation duration in seconds (smaller = more frantic). */
  pulse: number;
  /** Tier label, useful for accessibility / debugging. */
  tier: "calm" | "warm" | "hot" | "critical";
}

export function getCashoutUrgency(multiplier: number): CashoutUrgency {
  if (multiplier >= 5) {
    return {
      gradient: "from-red-600 via-rose-500 to-red-600",
      glow: "rgba(244,63,94,0.55)",
      pulse: 0.5,
      tier: "critical",
    };
  }
  if (multiplier >= 3) {
    return {
      gradient: "from-orange-600 via-red-500 to-orange-600",
      glow: "rgba(249,115,22,0.45)",
      pulse: 0.7,
      tier: "hot",
    };
  }
  if (multiplier >= 1.8) {
    return {
      gradient: "from-amber-500 via-orange-500 to-amber-500",
      glow: "rgba(245,158,11,0.4)",
      pulse: 0.95,
      tier: "warm",
    };
  }
  return {
    gradient: "from-emerald-600 via-green-500 to-emerald-600",
    glow: "rgba(16,185,129,0.4)",
    pulse: 1.3,
    tier: "calm",
  };
}
