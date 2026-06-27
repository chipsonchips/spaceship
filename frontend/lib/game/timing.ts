import type { RoundData } from "@/types/game";

/** Mirrors backend `calculateCurrentMultiplier`. */
export function multiplierAtElapsedMs(
  elapsedMs: number,
  maxCrash = 100,
): number {
  const t = elapsedMs / 1000;
  return Math.min(1.0 + Math.pow(t, 1.5) / 8, maxCrash);
}

/** Mirrors backend `calculatePlanePosition`. */
export function calculatePlanePosition(elapsedMs: number): {
  x: number;
  y: number;
} {
  const progress = Math.min(elapsedMs / 10_000, 1);
  const eased = 1 - Math.pow(1 - progress, 2);
  // Top out below 100% so the ship hovers fully visible at the top until the
  // crash, instead of flying off the top edge.
  return { x: 50, y: eased * MAX_PLANE_Y };
}

/** Highest the ship climbs (percent from bottom); keeps it on-screen. */
export const MAX_PLANE_Y = 88;

/** Client clock anchor aligned with server `flyStartTime` + `serverTime`. */
export function flyStartFromRound(round: RoundData): number {
  if (round.flyStartTime) {
    const clockOffset = round.serverTime ? Date.now() - round.serverTime : 0;
    return Number(round.flyStartTime) + clockOffset;
  }
  const mult = Number(round.currentMultiplier) || 1;
  const serverElapsed = Math.pow((mult - 1.0) * 8, 2 / 3) * 1000;
  return Date.now() - serverElapsed;
}

export function serverAdjustedNow(round: RoundData): number {
  const offset = round.serverTime ? Date.now() - round.serverTime : 0;
  return Date.now() - offset;
}

export function bettingDurationSec(round: RoundData): number {
  if (round.bettingDurationMs) {
    return Math.max(1, Math.ceil(round.bettingDurationMs / 1000));
  }
  if (round.flyStartTime && round.startTime) {
    return Math.max(
      1,
      Math.ceil((Number(round.flyStartTime) - Number(round.startTime)) / 1000),
    );
  }
  return 10;
}

export function restartDelaySec(round: RoundData): number {
  return Math.max(1, Math.ceil(Number(round.roundRestartDelayMs || 5000) / 1000));
}
