import { decrypt, encrypt } from '../../utils/encryption.js';
import { combineClientSeeds, createFinalSeed } from '../../utils/provably-fair.js';
import {
  generateCrashMultiplier,
  generateServerSeed,
  hashServerSeed,
} from '../game-utils.js';
import type { Round } from '../../entities/round.entity.js';
import type { PlayerBet } from '../../entities/player-bet.entity.js';
import type { CachedGameSettings } from './types.js';
import { logger } from '../../utils/logger.js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';

export interface PreparedRoundSecrets {
  serverSeed: string;
  serverSeedHash: string;
  encryptedSeed: string;
  serverSeedIV: string | null;
  serverSeedAuthTag: string | null;
}

export interface FlyingRoundSecrets {
  combinedClientSeedHash: string;
  finalSeed: string;
  targetCrash: number;
  flyingDurationMs: number;
}

export function prepareNewRoundSecrets(): PreparedRoundSecrets {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  if (!ENCRYPTION_SECRET) {
    logger.warn('ENCRYPTION_SECRET not set, storing server seed in plaintext');
    return {
      serverSeed,
      serverSeedHash,
      encryptedSeed: serverSeed,
      serverSeedIV: null,
      serverSeedAuthTag: null,
    };
  }

  const encrypted = encrypt(serverSeed, ENCRYPTION_SECRET);
  return {
    serverSeed,
    serverSeedHash,
    encryptedSeed: encrypted.encrypted,
    serverSeedIV: encrypted.iv,
    serverSeedAuthTag: encrypted.authTag,
  };
}

export function decryptRoundSeed(round: Round): string {
  if (!ENCRYPTION_SECRET || !round.serverSeedIV || !round.serverSeedAuthTag) {
    return round.serverSeed || '';
  }

  try {
    return decrypt(
      round.serverSeed!,
      round.serverSeedIV,
      round.serverSeedAuthTag,
      ENCRYPTION_SECRET,
    );
  } catch (err) {
    logger.error('Failed to decrypt server seed', {
      roundId: round.roundId,
      error: (err as Error).message,
    });
    return round.serverSeed || '';
  }
}

export function computeFlyingSecrets(
  round: Round,
  bets: PlayerBet[],
  settings: CachedGameSettings,
): FlyingRoundSecrets {
  const serverSeed = decryptRoundSeed(round);
  const clientSeeds = bets
    .map((b) => b.clientSeed)
    .filter((s): s is string => Boolean(s));

  const combinedClientSeedHash = combineClientSeeds(clientSeeds);
  const finalSeed = createFinalSeed(serverSeed, combinedClientSeedHash, round.roundId);
  const targetCrash = generateCrashMultiplier(
    finalSeed,
    settings.houseEdge,
    settings.minCrashMultiplier,
    settings.maxCrashMultiplier,
  );

  const flyingDurationMs = Math.min(
    settings.flyingDurationMs,
    Math.max(2000, targetCrash * 3000),
  );

  return {
    combinedClientSeedHash,
    finalSeed,
    targetCrash,
    flyingDurationMs,
  };
}
