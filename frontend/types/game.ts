export type GamePhase = "BETTING" | "FLYING" | "CRASHED";

export interface PlayerBet {
  id?: number;
  address: string;
  amount: number;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  payout: number | null;
  txHash?: string | null;
  autoCashoutMultiplier?: number | null;
}

export interface RoundData {
  roundId: number;
  phase: GamePhase;
  startTime: number;
  flyStartTime: number | null;
  crashMultiplier: number | null;
  currentMultiplier: number;
  serverSeed?: string;
  serverSeedHash?: string;
  totalBets: number;
  totalPayouts: number;
  settled: boolean;
  players: PlayerBet[];
  planePosition: { x: number; y: number };
  serverTime?: number;
  minBetAmount?: number;
  maxBetAmount?: number;
  roundRestartDelayMs?: number;
  bettingDurationMs?: number;
  flyingDurationMs?: number;
  houseEdge?: number;
  minCrashMultiplier?: number;
  maxCrashMultiplier?: number;
}

export interface GameHistory {
  roundId: number;
  crashMultiplier: number;
  timestamp: number;
  totalBets: number;
  totalPayouts: number;
  winnersCount: number;
}

export interface LeaderboardEntry {
  address: string;
  username?: string | null;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  biggestWin: number;
  biggestMultiplier: number;
}

export interface PlaneState {
  x: number;
  y: number;
  ts: number;
  angle?: number;
}