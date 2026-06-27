import crypto from 'crypto';
import { ethers } from 'ethers';
import { decrypt } from '../utils/encryption.js';

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(seed: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(seed));
}

export function generateCrashMultiplier(
  serverSeed: string,
  houseEdge = 0.03,
  minCrash = 1.01,
  maxCrash = 100.00
): number {
  const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 13), 16);
  const maxNumber = parseInt('fffffffffffff', 16);
  let random = hashNumber / maxNumber;

  // Apply house edge
  random = random * (1 - houseEdge);

  if (random === 0) random = 0.0001;
  const crashPoint = Math.floor((99 / (1 - random) / 100) * 100) / 100;

  return Math.max(minCrash, Math.min(maxCrash, crashPoint));
}

export function calculateCurrentMultiplier(elapsedMs: number, maxCrash = 100.00): number {
  const t = elapsedMs / 1000;
  return Math.min(1.0 + Math.pow(t, 1.5) / 8, maxCrash);
}

// Highest the ship climbs (percent from bottom); keeps it on-screen so it
// hovers at the top until the crash instead of flying off the top edge.
export const MAX_PLANE_Y = 88;

export function calculatePlanePosition(elapsedMs: number): { x: number; y: number } {
  const progress = Math.min(elapsedMs / 10000, 1);
  // Fixed horizontal center position
  const x = 50;
  // Vertical movement: y=0 at bottom, y=MAX_PLANE_Y near the top.
  const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad
  const y = eased * MAX_PLANE_Y;
  return { x, y };
}

import { Round } from '../entities/round.entity.js';

/**
 * Strips sensitive data like serverSeed from the round object before sending to clients.
 * Reveals decrypted serverSeed only after the round has CRASHED.
 */
export function sanitizeRound(round: Round | null, encryptionSecret?: string): Partial<Round> | null {
  if (!round) return null;
  const sanitized: Partial<Round> = { ...round };

  // Always remove the serverSeed if the round is not crashed
  if (sanitized.phase !== 'CRASHED') {
    sanitized.serverSeed = undefined;
  } else if (sanitized.serverSeed && sanitized.serverSeedIV && sanitized.serverSeedAuthTag && encryptionSecret) {
    // Decrypt the seed for reveal
    try {
      sanitized.serverSeed = decrypt(
        sanitized.serverSeed,
        sanitized.serverSeedIV,
        sanitized.serverSeedAuthTag,
        encryptionSecret
      );
    } catch (err) {
      // If decryption fails, we leave it as is or log it
    }
  }

  // Remove encryption metadata from public broadcast
  sanitized.serverSeedIV = undefined;
  sanitized.serverSeedAuthTag = undefined;

  return sanitized;
}
