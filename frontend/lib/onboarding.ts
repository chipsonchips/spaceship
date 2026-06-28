/**
 * Onboarding content + targets — single source of truth for the first-time
 * user flow (welcome modal slides and the guided spotlight tour).
 *
 * Tour steps point at real UI elements via `data-onboarding="<id>"` selectors.
 * If a target isn't on screen for a given step, the tour falls back to a
 * centered tooltip with no spotlight.
 */

/** localStorage key — bump the suffix to re-show onboarding after big changes. */
export const ONBOARDING_STORAGE_KEY = "spaceship_onboarded_v1";

/** data-onboarding values used to anchor the spotlight tour. */
export const ONBOARDING_TARGETS = {
  connectWallet: "connect-wallet",
  fundsButton: "funds-button",
  betInput: "bet-input",
  placeBet: "place-bet",
} as const;

export interface WelcomeSlide {
  icon: string;
  title: string;
  body: string;
}

/** Slides for the "How to Play" welcome modal. */
export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    icon: "🚀",
    title: "Welcome to Spaceship",
    body: "Spaceship is a crash game. You bet USDC, the rocket takes off and a multiplier climbs higher and higher — but it can crash at any moment. Cash out before it does to multiply your bet.",
  },
  {
    icon: "🔗",
    title: "1 · Connect your wallet",
    body: "Tap CONNECT in the top bar and approve the signature request. You'll need USDC in your wallet — on Base or Celo — to play. You can buy or bridge USDC from any exchange and send it to your wallet address.",
  },
  {
    icon: "💰",
    title: "2 · Deposit into the game",
    body: "You have two balances: your on-chain Wallet balance and your in-game balance. Tap the WALLET / GAME pill above the bet panel to open the deposit dialog, then deposit USDC into the game. You bet from your Game balance.",
  },
  {
    icon: "🎯",
    title: "3 · Place your bet",
    body: "Before the rocket takes off, enter an amount (or tap a quick-amount button) and hit PLACE BET. You can optionally set an auto cash-out multiplier so the game banks your winnings automatically.",
  },
  {
    icon: "🏁",
    title: "4 · Cash out before the crash",
    body: "Once flying, the multiplier rises fast. Hit CASH OUT to lock in your bet × the current multiplier. Wait too long and the rocket crashes — you lose that bet. Quick reflexes pay off!",
  },
];

export interface TourStep {
  id: string;
  /** data-onboarding selector to spotlight. Omit for a centered step. */
  target?: string;
  title: string;
  body: string;
  /** Skip this step entirely when false. */
  showWhen?: (ctx: TourContext) => boolean;
}

export interface TourContext {
  isConnected: boolean;
  gameBalance: number | null;
}

/** Ordered steps for the guided spotlight tour. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "intro",
    title: "🚀 Quick tour",
    body: "Spaceship is a crash game — bet USDC, watch the multiplier climb, and cash out before the rocket explodes. Let's walk through it.",
  },
  {
    id: "connect",
    target: ONBOARDING_TARGETS.connectWallet,
    title: "Connect your wallet",
    body: "Start here. Connect a wallet that holds USDC on Base or Celo and approve the signature to sign in.",
    showWhen: (ctx) => !ctx.isConnected,
  },
  {
    id: "deposit",
    target: ONBOARDING_TARGETS.fundsButton,
    title: "Deposit USDC to play",
    body: "This pill shows your Wallet balance and your in-game balance. Tap it to open the deposit dialog and move USDC into the game — you bet from your Game balance.",
  },
  {
    id: "bet",
    target: ONBOARDING_TARGETS.betInput,
    title: "Set your bet",
    body: "Enter how much USDC to bet, or use the quick-amount buttons. Betting is only open before the rocket takes off.",
  },
  {
    id: "place",
    target: ONBOARDING_TARGETS.placeBet,
    title: "Lock it in",
    body: "Hit PLACE BET before takeoff. Want it hands-free? Set an auto cash-out multiplier and the game cashes out for you.",
  },
  {
    id: "cashout",
    title: "🏁 Cash out in time",
    body: "Once flying, the multiplier climbs — tap CASH OUT to bank your bet × the current multiplier. Wait too long and it crashes, and the bet is lost. Good luck!",
  },
];

/** Resolve the active tour steps for the current app state. */
export function getActiveTourSteps(ctx: TourContext): TourStep[] {
  return TOUR_STEPS.filter((s) => (s.showWhen ? s.showWhen(ctx) : true));
}
