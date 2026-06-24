/**
 * Lightweight haptic feedback helpers (mobile). Safe no-ops where the
 * Vibration API is unavailable (desktop, iOS Safari, reduced-motion users).
 */

function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

export const haptics = {
  /** Light tap — bet amount tweaks, preset taps. */
  tap() {
    if (canVibrate()) navigator.vibrate(8);
  },
  /** Medium buzz — bet placed. */
  place() {
    if (canVibrate()) navigator.vibrate(18);
  },
  /** Sharp double-buzz — cashed out / win. */
  win() {
    if (canVibrate()) navigator.vibrate([0, 25, 40, 45]);
  },
  /** Long buzz — crash with an active bet. */
  crash() {
    if (canVibrate()) navigator.vibrate([0, 60, 30, 60]);
  },
};
