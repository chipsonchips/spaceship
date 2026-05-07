import { Router } from 'express';
import { AppDataSource } from '../config/database.js';
import { Round } from '../entities/round.entity.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { verifyCrashPoint, combineClientSeeds } from '../utils/provably-fair.js';
import { generateCrashMultiplier } from '../services/game-utils.js';
import { decrypt } from '../utils/encryption.js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';

const router = Router();

/**
 * GET /api/verify/:roundId
 * Verify the fairness of a completed round
 */
router.get('/:roundId', async (req, res) => {
  try {
    const roundId = parseInt(req.params.roundId);

    const roundRepo = AppDataSource.getRepository(Round);
    const betRepo = AppDataSource.getRepository(PlayerBet);

    const round = await roundRepo.findOne({ 
      where: { roundId },
      relations: ['players']
    });

    if (!round) {
      return res.status(404).json({ success: false, error: "Round not found" });
    }

    if (round.phase !== 'CRASHED' || !round.serverSeed) {
      return res.status(400).json({
        success: false,
        error: "Round not completed or server seed not available",
      });
    }

    // 1. Decrypt server seed for verification
    let serverSeed = round.serverSeed;
    if (ENCRYPTION_SECRET && round.serverSeedIV && round.serverSeedAuthTag) {
      try {
        serverSeed = decrypt(
          round.serverSeed,
          round.serverSeedIV,
          round.serverSeedAuthTag,
          ENCRYPTION_SECRET
        );
      } catch (err) {
        return res.status(500).json({ success: false, error: "Failed to decrypt server seed for verification" });
      }
    }

    // 2. Get all client seeds
    const clientSeeds = round.players
      .map((b) => b.clientSeed)
      .filter((s) => s !== null && s !== undefined) as string[];

    // 3. Verify
    const verification = verifyCrashPoint(
      serverSeed,
      round.serverSeedHash!,
      clientSeeds,
      roundId, // nonce
      Number(round.crashMultiplier || 0),
      generateCrashMultiplier
    );

    res.json({
      success: true,
      data: {
        roundId,
        verified: verification.valid,
        serverSeed: serverSeed,
        serverSeedHash: round.serverSeedHash,
        clientSeeds,
        combinedClientSeedHash: round.combinedClientSeedHash,
        finalSeed: round.finalSeed,
        claimedCrashPoint: Number(round.crashMultiplier),
        actualCrashPoint: verification.actualCrashPoint,
        error: verification.error,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Verification failed: " + (error as Error).message });
  }
});

export default router;
