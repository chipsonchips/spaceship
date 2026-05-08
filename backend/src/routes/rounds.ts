import { Router } from 'express';
import { GameEngine } from '../services/game-engine.service.js';
import { RoundService } from '../services/round.service.js';
import { sanitizeRound } from '../services/game-utils.js';
import { betRateLimiter, cashoutRateLimiter } from '../middleware/rateLimiter.js';

export const createRoundsRouter = (gameEngine: GameEngine) => {
  const router = Router();
  const roundService = new RoundService();

  router.get('/current', async (req, res) => {
    try {
      const round = await roundService.getCurrentRound();
      res.json({ success: true, round: sanitizeRound(round, process.env.ENCRYPTION_SECRET) });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  router.post('/:roundId/bets', betRateLimiter, async (req, res) => {
    try {
      const { address, amount, chainId, useFreeBet, autoCashoutMultiplier } = req.body;
      const saved = await gameEngine.placeBet(address, amount, chainId, useFreeBet || false, autoCashoutMultiplier);
      res.json({ success: true, bet: saved });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  router.post('/bets/:betId/cashout', cashoutRateLimiter, async (req, res) => {
    try {
      const betId = parseInt(req.params.betId as string, 10);
      const { chainId } = req.body;
      const updated = await gameEngine.cashOutById(betId, chainId);
      res.json({ success: true, bet: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  return router;
};
