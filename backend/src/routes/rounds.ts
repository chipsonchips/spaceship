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
      if (!round) {
        return res.status(404).json({ success: false, error: 'No active round' });
      }
      res.json({ success: true, round: sanitizeRound(round, process.env.ENCRYPTION_SECRET) });
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to fetch current round';
      console.error('Get current round error:', err);
      res.status(500).json({ success: false, error: errorMsg });
    }
  });

  router.post('/:roundId/bets', betRateLimiter, async (req, res) => {
    try {
      const { address, amount, chainId, useFreeBet, autoCashoutMultiplier, clientSeed } = req.body;

      if (!address || amount === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields: address, amount' });
      }

      const saved = await gameEngine.placeBet(address, amount, chainId, useFreeBet || false, autoCashoutMultiplier, clientSeed);
      res.json({ success: true, bet: saved });
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to place bet';
      console.error('Place bet error:', err);
      res.status(500).json({ success: false, error: errorMsg });
    }
  });

  router.post('/bets/:betId/cashout', cashoutRateLimiter, async (req, res) => {
    try {
      const betId = parseInt(req.params.betId as string, 10);
      const { chainId } = req.body;

      if (!chainId) {
        return res.status(400).json({ success: false, error: 'Missing required field: chainId' });
      }

      const updated = await gameEngine.cashOutById(betId, chainId);
      res.json({ success: true, bet: updated });
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to cash out';
      console.error('Cashout error:', err);
      res.status(500).json({ success: false, error: errorMsg });
    }
  });

  return router;
};
