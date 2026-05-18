import { Router } from 'express';
import { GameEngine } from '../services/game-engine.service.js';
import { RoundService } from '../services/round.service.js';
import { sanitizeRound } from '../services/game-utils.js';
import { betRateLimiter, cashoutRateLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { PlayerBet } from '../entities/player-bet.entity.js';
import { AppDataSource } from '../config/database.js';

export const createRoundsRouter = (gameEngine: GameEngine) => {
  const router = Router();
  const roundService = new RoundService();

  router.get('/settings', async (req, res) => {
    try {
      const { gameSettingsService } = await import('../services/game-settings.service.js');
      const settings = await gameSettingsService.getSettings();
      res.json({
        success: true,
        settings: {
          minBetAmount: Number(settings.minBetAmount),
          maxBetAmount: Number(settings.maxBetAmount),
          bettingDurationMs: settings.bettingDurationMs,
          flyingDurationMs: settings.flyingDurationMs,
          roundRestartDelayMs: settings.roundRestartDelayMs,
          houseEdge: Number(settings.houseEdge),
          minCrashMultiplier: Number(settings.minCrashMultiplier),
          maxCrashMultiplier: Number(settings.maxCrashMultiplier),
        }
      });
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to fetch settings';
      console.error('Get public settings error:', err);
      res.status(500).json({ success: false, error: errorMsg });
    }
  });

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

  router.post('/:roundId/bets', authenticateToken, betRateLimiter, async (req, res) => {
    try {
      const { address, amount, chainId, useFreeBet, autoCashoutMultiplier, clientSeed } = req.body;

      if (!address || amount === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields: address, amount' });
      }

      if (!req.user || !req.user.address) {
        return res.status(401).json({ success: false, error: 'Authentication and linked wallet required' });
      }

      if (req.user.address.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Unauthorized: cannot place a bet for another address' });
      }

      const saved = await gameEngine.placeBet(address, amount, chainId, useFreeBet || false, autoCashoutMultiplier, clientSeed);
      res.json({ success: true, bet: saved });
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to place bet';
      console.error('Place bet error:', err);
      res.status(500).json({ success: false, error: errorMsg });
    }
  });

  router.post('/bets/:betId/cashout', authenticateToken, cashoutRateLimiter, async (req, res) => {
    try {
      const betId = parseInt(req.params.betId as string, 10);
      const { chainId } = req.body;

      if (!chainId) {
        return res.status(400).json({ success: false, error: 'Missing required field: chainId' });
      }

      if (!req.user || !req.user.address) {
        return res.status(401).json({ success: false, error: 'Authentication and linked wallet required' });
      }

      // Verify the bet owner before cashing out
      const betRepo = AppDataSource.getRepository(PlayerBet);
      const bet = await betRepo.findOne({ where: { id: betId } });
      if (!bet) {
        return res.status(404).json({ success: false, error: 'Bet not found' });
      }

      if (bet.address.toLowerCase() !== req.user.address.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Unauthorized: cannot cash out someone else\'s bet' });
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
