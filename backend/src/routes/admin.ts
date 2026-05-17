import { Router, Request, Response } from 'express';
import { ChainService } from '../services/chain.service.js';
import { getChainConfig } from '../config/chains.js';
import { logger } from '../utils/logger.js';
import { authenticateTokenOrAdminSecret, requireAdmin } from '../middleware/authMiddleware.js';
import { auditLogService } from '../services/audit-log.service.js';
import { AdminActionType } from '../entities/admin-log.entity.js';

const router = Router();


// Helper to get chain service for a specific chain
const getChainServiceForRequest = (req: Request): ChainService => {
  const chainId = req.body?.chainId || req.query?.chainId;
  const numChainId = chainId ? Number(chainId) : 8453; // Default to Base mainnet
  return new ChainService(numChainId);
};

// GET /api/admin/house/balance - Get current house balance
router.get('/house/balance', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const balance = await chainService.getHouseBalance();
    const chainConfig = getChainConfig(chainService.chainId);

    res.json({
      success: true,
      balance,
      balanceFormatted: `${balance.toFixed(2)} USDC`,
      chain: chainConfig.label,
      chainId: chainService.chainId
    });
  } catch (err) {
    logger.error('Failed to get house balance', { error: (err as Error).message });
    res.status(500).json({
      success: false,
      error: "failed to get house balance"
    });
  }
});

// POST /api/admin/house/withdraw - Withdraw house profits to owner
router.post('/house/withdraw', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount - must be a positive number'
      });
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);

    // Get current balance before withdrawal
    const currentBalance = await chainService.getHouseBalance();

    if (amount > currentBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Current balance: ${currentBalance} USDC, Requested: ${amount} USDC`
      });
    }

    const txHash = await chainService.withdrawHouseProfits(amount);

    // Log admin action
    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.HOUSE_WITHDRAW,
      `Withdrew ${amount} USDC on ${chainConfig.label}`,
      { amount, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    res.json({
      success: true,
      txHash,
      amount,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Successfully withdrew ${amount} USDC to owner wallet on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to withdraw house profits', { error: (err as Error).message });
    res.status(500).json({
      success: false,
      error: (err as Error).message
    });
  }
});

// GET /api/admin/contract/status - Get contract status
router.get('/contract/status', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const status = await chainService.getContractStatus();

    res.json({
      success: true,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      ...status
    });
  } catch (err) {
    logger.error('Failed to get contract status', {
      error: (err as Error).message,
      stack: (err as Error).stack
    });
    res.status(500).json({
      success: false,
      error: (err as Error).message
    });
  }
});

// POST /api/admin/contract/pause - Pause contract
router.post('/contract/pause', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.pauseContract();

    // Log admin action
    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.CONTRACT_PAUSE,
      `Paused contract on ${chainConfig.label}`,
      { chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    res.json({
      success: true,
      txHash,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Contract paused successfully on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to pause contract', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/contract/unpause - Unpause contract
router.post('/contract/unpause', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.unpauseContract();

    // Log admin action
    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.CONTRACT_UNPAUSE,
      `Unpaused contract on ${chainConfig.label}`,
      { chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    res.json({
      success: true,
      txHash,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Contract unpaused successfully on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to unpause contract', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/contract/operator - Set server operator
router.post('/contract/operator', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string' || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.setServerOperator(address);

    // Log admin action
    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.OPERATOR_SET,
      `Set server operator to ${address} on ${chainConfig.label}`,
      { address, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    res.json({
      success: true,
      txHash,
      address,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Server operator updated to ${address} on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to set server operator', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/house/fund - Fund the house
router.post('/house/fund', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount - must be a positive number'
      });
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.fundHouse(amount);

    // Log admin action
    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.HOUSE_FUND,
      `Funded house with ${amount} USDC on ${chainConfig.label}`,
      { amount, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    res.json({
      success: true,
      txHash,
      amount,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Successfully funded house with ${amount} USDC on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to fund house', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/eth/withdraw - Withdraw ETH from contract
router.post('/eth/withdraw', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { to, amount } = req.body;

    if (!to || typeof to !== 'string' || !to.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient address'
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount - must be a positive number'
      });
    }

    const chainService = getChainServiceForRequest(req);
    const chainConfig = getChainConfig(chainService.chainId);
    const txHash = await chainService.withdrawETH(to, amount);

    // Log admin action
    await auditLogService.logAction(
      req.userId || null,
      AdminActionType.ETH_WITHDRAW,
      `Withdrew ${amount} ETH to ${to} on ${chainConfig.label}`,
      { to, amount, chainId: chainService.chainId, txHash },
      req.ip || null,
      chainService.chainId
    );

    res.json({
      success: true,
      txHash,
      to,
      amount,
      chain: chainConfig.label,
      chainId: chainService.chainId,
      message: `Successfully withdrew ${amount} ETH to ${to} on ${chainConfig.label}`
    });
  } catch (err) {
    logger.error('Failed to withdraw ETH', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/admin/settlements/pending - Get pending settlements
router.get('/settlements/pending', authenticateTokenOrAdminSecret, requireAdmin, async (req: Request, res: Response) => {
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

    res.json({
      success: true,
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
    res.status(500).json({
      success: false,
      error: (err as Error).message
    });
  }
});

export default router;
