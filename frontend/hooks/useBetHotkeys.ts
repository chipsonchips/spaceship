import { useEffect, useRef } from "react";

interface BetHotkeyOptions {
  /** Place the current bet (during the betting phase). */
  onPlaceBet?: () => void;
  /** Cash out the active bet (while flying). */
  onCashOut?: () => void;
  /** Whether placing a bet is currently possible. */
  canPlaceBet: boolean;
  /** Whether cashing out is currently possible. */
  canCashOut: boolean;
  /** Disable all hotkeys (e.g. a request is in flight). */
  disabled?: boolean;
}

/**
 * Space / Enter as the universal action key: cash out while flying, otherwise
 * place a bet during the betting phase. Ignored while the user is typing in an
 * input so amount entry isn't hijacked.
 */
export function useBetHotkeys({
  onPlaceBet,
  onCashOut,
  canPlaceBet,
  canCashOut,
  disabled = false,
}: BetHotkeyOptions) {
  // Keep latest handlers/flags without re-binding the listener each render.
  const ref = useRef({
    onPlaceBet,
    onCashOut,
    canPlaceBet,
    canCashOut,
    disabled,
  });
  ref.current = { onPlaceBet, onCashOut, canPlaceBet, canCashOut, disabled };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      if (e.repeat) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const s = ref.current;
      if (s.disabled) return;

      if (s.canCashOut && s.onCashOut) {
        e.preventDefault();
        s.onCashOut();
      } else if (s.canPlaceBet && s.onPlaceBet) {
        e.preventDefault();
        s.onPlaceBet();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
