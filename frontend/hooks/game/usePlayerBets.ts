import type { PlayerBet, RoundData } from "@/types/game";

type OptimisticBet = PlayerBet & { roundId?: number };

export function usePlayerBets(
    roundData: RoundData | null,
    playerAddress: string | null,
    optimisticBets: OptimisticBet[] = [],
): PlayerBet[] {
    if (!playerAddress) return [];

    const serverBets =
        roundData?.players.filter(
            (p) => p.address.toLowerCase() === playerAddress.toLowerCase(),
        ) || [];

    const optimisticPlayerBets = optimisticBets.filter(
        (p) =>
            p.address.toLowerCase() === playerAddress.toLowerCase() &&
            p.roundId === roundData?.roundId,
    );

    // Merge server bets with optimistic bets (avoid duplicates)
    const allBets = [...serverBets];
    optimisticPlayerBets.forEach((optBet) => {
        if (!serverBets.some((sb) => sb.id === optBet.id)) {
            allBets.push(optBet);
        }
    });

    return allBets;
}
