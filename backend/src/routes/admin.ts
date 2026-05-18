import { Router, Request, Response } from 'express';
import { ChainService } from '../services/chain.service.js';
import { getChainConfig } from '../config/chains.js';
import { logger } from '../utils/logger.js';
import { authenticateTokenOrAdminSecret, requireAdmin } from '../middleware/authMiddleware.js';
import { auditLogService } from '../services/audit-log.service.js';
import { AdminActionType } from '../entities/admin-log.entity.js';

const router = Router();

const getChainServiceForRequest = (req: Request): ChainService => {
  const chainId = req.body?.chainId || req.query?.chainId;
  const numChainId = chainId ? Number(chainId) : 8453;
  return new ChainService(numChainId);
};

const isValidAddress = (address: string): boolean =>
  typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address);

const isValidAmount = (amount: unknown): boolean =>
  typeof amount === 'number' && amount > 0;

const sendError = (res: Response, statusCode: number, error: string) =>
  res.status(statusCode).json({ success: false, error });

const sendSuccess = (res: Response, data: Record<string, unknown>) =>
  res.json({ success: true, ...data });

router.get('/house/balance', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const balance = await chainService.getHouseBalance();
    const chainConfig = getChainConfig(chainService.chainId);

    sendSuccess(res, {
      balance,
      balanceFormatted: `${balance.toFixed(2)} USDC`,
      chain: chainConfig.label,
      chainId: chainService.chainId
    });
  } catch (err) {
    logger.error('Failed to get house balance', { error: (err as Error).message });
    sendError(res, 500, 'failed to get house balance');
  }
});

router.post('/house/withdraw', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!isValidAmount(amount)) {
      return sendError(res, 400, 'Invalid amount - must be a positive number');
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const currentBalance = await chainService.getHouseBalance();

    if (amount > currentBalance) {
      return sendError(res, 400, `Insufficient balance. Current balance: ${currentBalance} USDC, Requested: ${amount} USDC`);
    }

    const txHash = await chainService.withdrawHouseProfits(amount);

    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.HOUSE_WITHDRAW,
      `Withdrew ${amount} USDC on ${chainConfig.label}`,
      { amount, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    sendSuccess(res, {
      txHash,
      amount,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Successfully withdrew ${amount} USDC to owner wallet on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to withdraw house profits', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

router.get('/contract/status', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const status = await chainService.getContractStatus();

    sendSuccess(res, {
      chain: chainConfig.label,
      chainId: chainService.chainId,
      ...status
    });
  } catch (err) {
    logger.error('Failed to get contract status', {
      error: (err as Error).message,
      stack: (err as Error).stack
    });
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/contract/pause', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.pauseContract();

    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.CONTRACT_PAUSE,
      `Paused contract on ${chainConfig.label}`,
      { chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    sendSuccess(res, {
      txHash,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Contract paused successfully on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to pause contract', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/contract/unpause', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.unpauseContract();

    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.CONTRACT_UNPAUSE,
      `Unpaused contract on ${chainConfig.label}`,
      { chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    sendSuccess(res, {
      txHash,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Contract unpaused successfully on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to unpause contract', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/contract/operator', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!isValidAddress(address)) {
      return sendError(res, 400, 'Invalid address format');
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.setServerOperator(address);

    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.OPERATOR_SET,
      `Set server operator to ${address} on ${chainConfig.label}`,
      { address, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    sendSuccess(res, {
      txHash,
      address,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Server operator updated to ${address} on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to set server operator', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/house/fund', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!isValidAmount(amount)) {
      return sendError(res, 400, 'Invalid amount - must be a positive number');
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.fundHouse(amount);

    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.HOUSE_FUND,
      `Funded house with ${amount} USDC on ${chainConfig.label}`,
      { amount, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    sendSuccess(res, {
      txHash,
      amount,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Successfully funded house with ${amount} USDC on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to fund house', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

router.post('/eth/withdraw', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { to, amount } = req.body;

    if (!isValidAddress(to)) {
      return sendError(res, 400, 'Invalid recipient address');
    }

    if (!isValidAmount(amount)) {
      return sendError(res, 400, 'Invalid amount - must be a positive number');
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.withdrawETH(to, amount);

    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.ETH_WITHDRAW,
      `Withdrew ${amount} ETH to ${to} on ${chainConfig.label}`,
      { to, amount, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    sendSuccess(res, {
      txHash,
      to,
      amount,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Successfully withdrew ${amount} ETH to ${to} on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to withdraw ETH', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

router.get('/settlements/pending', authenticateTokenOrAdminSecret, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { AppDataSource } = await import('../config/database.js');
    const { PlayerBet } = await import('../entities/player-bet.entity.js');
    const { SettlementStatus } = await import('../entities/player-bet.entity.js');

    const betRepo = AppDataSource.getRepository(PlayerBet);

    const pendingSettlements = await betRepo.find({
      where: {
        cashedOut: true,
        settlementStatus: SettlementStatus.PENDING_FUNDS
      },
      relations: ['round'],
      order: { createdAt: 'DESC' },
      take: 100
    });

    const totalPending = pendingSettlements.reduce((sum, bet) => sum + Number(bet.payout || 0), 0);

    sendSuccess(res, {
      count: pendingSettlements.length,
      totalPendingPayout: totalPending,
      settlements: pendingSettlements.map(bet => ({
        betId: bet.id,
        address: bet.address,
        payout: bet.payout,
        cashoutMultiplier: bet.cashoutMultiplier,
        chainId: bet.chainId,
        roundId: bet.round.roundId,
        timestamp: bet.timestamp,
        createdAt: bet.createdAt
      }))
    });
  } catch (err) {
    logger.error('Failed to get pending settlements', { error: (err as Error).message });
    sendError(res, 500, (err as Error).message);
  }
});

export default router;
