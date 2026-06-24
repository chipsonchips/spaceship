/**
 * Tiny decoupled event bus for win celebrations. Bet components emit a win from
 * wherever a cash-out resolves; a single <WinCelebration /> overlay listens and
 * renders the moment — no prop drilling or shared context required.
 */

export const WIN_EVENT = "spaceship:win";

export interface WinDetail {
  payout: number;
  amount: number;
  multiplier: number;
}

export function emitWin(detail: WinDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WinDetail>(WIN_EVENT, { detail }));
}

export function onWin(handler: (detail: WinDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<WinDetail>).detail);
  window.addEventListener(WIN_EVENT, listener);
  return () => window.removeEventListener(WIN_EVENT, listener);
}
