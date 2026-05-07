import crypto from 'crypto';
import { ethers } from 'ethers';

/**
 * Combine multiple client seeds into one hash.
 * This ensures that even if one player is compromised, the total entropy is still mixed.
 */
export function combineClientSeeds(clientSeeds: string[]): string {
  if (clientSeeds.length === 0) {
    // If no players, use a default seed (still mixed with server seed later)
    return ethers.keccak256(ethers.toUtf8Bytes("no-players"));
  }

  // Sort seeds for deterministic ordering
  const sorted = [...clientSeeds].sort();
  const combined = sorted.join("");
  return ethers.keccak256(ethers.toUtf8Bytes(combined));
}

/**
 * Create final seed from server seed + combined client seeds + nonce (roundId).
 */
export function createFinalSeed(
  serverSeed: string,
  combinedClientSeedHash: string,
  nonce: number,
): string {
  const data = `${serverSeed}:${combinedClientSeedHash}:${nonce}`;
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Verification logic to prove a round was fair.
 */
export function verifyCrashPoint(
  serverSeed: string,
  serverSeedHash: string,
  clientSeeds: string[],
  nonce: number,
  claimedCrashPoint: number,
  algorithm: (seed: string) => number
): { valid: boolean; actualCrashPoint: number; error?: string } {
  // 1. Verify server seed hash
  const computedHash = ethers.keccak256(ethers.toUtf8Bytes(serverSeed));
  if (computedHash !== serverSeedHash) {
    return {
      valid: false,
      actualCrashPoint: 0,
      error: "Server seed hash mismatch",
    };
  }

  // 2. Combine client seeds
  const combinedClientSeedHash = combineClientSeeds(clientSeeds);

  // 3. Create final seed
  const finalSeed = createFinalSeed(serverSeed, combinedClientSeedHash, nonce);

  // 4. Calculate crash point using the provided algorithm
  const actualCrashPoint = algorithm(finalSeed);

  // 5. Compare
  const valid = Math.abs(actualCrashPoint - claimedCrashPoint) < 0.001;

  return {
    valid,
    actualCrashPoint,
    error: valid ? undefined : "Crash point mismatch",
  };
}
