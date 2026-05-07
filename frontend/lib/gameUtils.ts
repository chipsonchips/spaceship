export function calculateGameStats(
  history: Array<{ crashMultiplier: number }>
) {
  if (history.length === 0) {
    return {
      averageCrash: 0,
      highestCrash: 0,
      lowestCrash: 0,
      volatility: "low" as const,
    };
  }

  const multipliers = history.map((h) => h.crashMultiplier);
  const average = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
  const highest = Math.max(...multipliers);
  const lowest = Math.min(...multipliers);

  // Calculate standard deviation for volatility
  const variance =
    multipliers.reduce((sum, x) => sum + Math.pow(x - average, 2), 0) /
    multipliers.length;
  const stdDev = Math.sqrt(variance);
  const volatilityRatio = stdDev / average;

  let volatility: "low" | "medium" | "high" = "low";
  if (volatilityRatio > 0.5) volatility = "high";
  else if (volatilityRatio > 0.25) volatility = "medium";

  return {
    averageCrash: average,
    highestCrash: highest,
    lowestCrash: lowest,
    volatility,
  };
}

export function findPlayerBet(
  players: Array<{ address: string;[key: string]: any }>,
  playerAddress: string | null
) {
  if (!playerAddress) return null;
  return (
    players.find(
      (p) => p.address?.toLowerCase() === playerAddress.toLowerCase()
    ) || null
  );
}

export function formatAddress(address: string | null): string {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSDC(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0.00";
  return amount.toFixed(2);
}

export function getPhaseColor(phase: string | null): string {
  switch (phase) {
    case "BETTING":
      return "text-green-400";
    case "FLYING":
      return "text-blue-400";
    case "CRASHED":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function getMultiplierRiskLevel(
  multiplier: number
): "safe" | "medium" | "risky" {
  if (multiplier < 1.5) return "safe";
  if (multiplier < 3) return "medium";
  return "risky";
}

export function getMultiplierColor(multiplier: number): string {
  if (multiplier >= 5) return "bg-red-600/30 text-red-300";
  if (multiplier >= 3) return "bg-orange-600/30 text-orange-300";
  if (multiplier >= 2) return "bg-yellow-600/30 text-yellow-300";
  return "bg-green-600/30 text-green-300";
}

export function isValidBetAmount(
  amount: number,
  balance: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: "Bet amount must be positive" };
  }
  if (amount > balance) {
    return { valid: false, error: "Insufficient balance" };
  }
  if (amount < 0.01) {
    return { valid: false, error: "Minimum bet is 0.01 USDC" };
  }
  if (amount > 10000) {
    return { valid: false, error: "Maximum bet is 10,000 USDC" };
  }
  return { valid: true };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function amountInWei(amount: number): bigint {
  // Convert the amount to a string to handle decimal places accurately
  const [whole, fraction = ''] = amount.toString().split('.');
  // Ensure we have exactly 6 decimal places
  const paddedFraction = fraction.padEnd(6, '0').slice(0, 6);
  const amountString = whole + paddedFraction;
  return BigInt(amountString);
}


const gameUtils = {
  calculateGameStats,
  findPlayerBet,
  formatAddress,
  formatUSDC,
  getPhaseColor,
  getMultiplierRiskLevel,
  getMultiplierColor,
  isValidBetAmount,
  delay,
  amountInWei,
};

export default gameUtils;
