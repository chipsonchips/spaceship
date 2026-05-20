import type { PlayerBet, RoundData } from "@/types/game";

type OptimisticBet = PlayerBet & { roundId?: number };

export function usePlayerBet(
  roundData: RoundData | null,
  playerAddress: string | null,
  optimisticBets: OptimisticBet[] = [],
): PlayerBet | null {
  if (!playerAddress) return null;

  const serverBet = roundData?.players.find(
    (p) => p.address.toLowerCase() === playerAddress.toLowerCase(),
  );
  if (serverBet) return serverBet;

  return (
    optimisticBets.find(
      (p) =>
        p.address.toLowerCase() === playerAddress.toLowerCase() &&
        p.roundId === roundData?.roundId,
    ) ?? null
  );
}
