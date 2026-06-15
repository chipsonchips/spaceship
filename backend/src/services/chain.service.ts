import { ethers, type InterfaceAbi, FetchRequest, NonceManager } from 'ethers';
import https from 'node:https';
import { computePlayersMerkleRoot } from './merkle.js';
import spaceshipAbi from '../abi/spaceship.json' with { type: 'json' };
import { getChainConfig } from '../config/chains.js';

const spaceshipAbiTyped = spaceshipAbi as unknown as InterfaceAbi;

// Shared HTTP/HTTPS agent configured to force IPv4 connection.
// This works around Node.js v18/v20 happy eyeballs and undici IPv6 connection timeout issues.
const ipv4Agent = new https.Agent({
  family: 4,
  keepAlive: true,
});
import type { Round } from '../entities/round.entity.js';
import type { PlayerBet } from '../entities/player-bet.entity.js';
import { logger } from '../utils/logger.js';

export class ChainService {
  provider: ethers.JsonRpcProvider;
  signer: NonceManager;
  contract: ethers.Contract;
  chainId: number;
  private providerReady = false;
  private baseSigner: ethers.Wallet;
  private contractAddress: string;

  constructor(chainId: number) {
    const chainConfig = getChainConfig(chainId);
    this.chainId = chainConfig.chainId;
    const key = process.env.BACKEND_PRIVATE_KEY;

    if (!key)
      throw new Error('ChainService missing env var: BACKEND_PRIVATE_KEY');

    const rpc = chainConfig.rpcUrl;
    const addr = chainConfig.contractAddress;
    this.contractAddress = addr;

    logger.info(`ChainService connecting to ${chainConfig.label} (chainId=${chainConfig.chainId})`, {
      rpc,
      contractAddress: addr,
    });

    // Create a FetchRequest with our custom IPv4 agent to bypass IPv6 timeout issues
    const fetchReq = new FetchRequest(rpc);
    fetchReq.getUrlFunc = FetchRequest.createGetUrlFunc({
      agent: ipv4Agent,
    });

    this.provider = new ethers.JsonRpcProvider(fetchReq);
    this.baseSigner = new ethers.Wallet(key, this.provider);
    this.signer = new NonceManager(this.baseSigner);
    this.contract = new ethers.Contract(addr, spaceshipAbiTyped, this.signer);

    // Initialize provider connection in background
    this.initializeProvider().catch((err) => {
      logger.warn(`ChainService provider initialization warning for ${chainConfig.label}`, {
        error: (err as Error).message,
      });
    });
  }

  private async resetNonce(): Promise<void> {
    try {
      // Recreate the NonceManager to reset the nonce tracking
      this.signer = new NonceManager(this.baseSigner);
      this.contract = new ethers.Contract(this.contractAddress, spaceshipAbiTyped, this.signer);

      const address = await this.baseSigner.getAddress();
      const onChainNonce = await this.provider.getTransactionCount(address, 'latest');

      logger.info('Nonce reset', { address, onChainNonce });
    } catch (err) {
      logger.error('Failed to reset nonce', { error: (err as Error).message });
    }
  }

  private isNonceError(error: unknown): boolean {
    const errorMsg = (error as Error).message || '';
    return errorMsg.includes('nonce') ||
      errorMsg.includes('NONCE') ||
      errorMsg.includes('nonce too low') ||
      errorMsg.includes('nonce has already been used');
  }

  private async initializeProvider() {
    try {
      // Test the connection by getting the network
      const network = await this.provider.getNetwork();
      logger.info(`ChainService provider ready for ${network.name} (chainId=${network.chainId})`);
      this.providerReady = true;
    } catch (err) {
      logger.warn('ChainService provider initialization failed', {
        error: (err as Error).message,
      });
      this.providerReady = false;
    }
  }

  private async ensureProviderReady(maxRetries = 3) {
    if (this.providerReady) return;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.initializeProvider();
        if (this.providerReady) return;
      } catch (err) {
        logger.warn(`Provider ready check attempt ${i + 1}/${maxRetries} failed`, {
          error: (err as Error).message,
        });
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    }

    logger.warn('Provider may not be ready, proceeding anyway');
  }

  /**
   * Build a snapshot for a settled round and submit to chain.
   * Note: rounds' numeric fields are converted to on-chain units here (USDC with 6 decimals, crash scaled by 100).
   */
  async validatePlayerFunds(player: string, amount: number) {
    try {
      await this.ensureProviderReady(2);

      const betAmountUint = BigInt(Math.round(amount * 1e6)); // USDC 6 decimals

      const balance = await this.contract.playerBalances(player);

      if (BigInt(balance) < betAmountUint) {
        return { ok: false, reason: `Insufficient game balance. Have ${Number(balance) / 1e6}, need ${amount}. Please deposit funds.` };
      }

      return { ok: true };
    } catch (err) {
      logger.error('Failed to validate player funds', { error: (err as Error).message, player, amount });
      return { ok: false, reason: 'Failed to verify game balance: ' + (err as Error).message };
    }
  }

  async getTransactionReceipt(txHash: string) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (err) {
      logger.error('Failed to get transaction receipt', { txHash, error: (err as Error).message });
      return null;
    }
  }

  async submitRoundSnapshot(round: Round, players: PlayerBet[]) {
    if (players.length === 0) {
      logger.warn('Cannot submit snapshot: no players in round', {
        roundId: round.roundId
      });
      return;
    }
    try {
      // Ensure provider is ready before attempting transaction
      await this.ensureProviderReady(2);

      const playersMerkleRoot = computePlayersMerkleRoot(players);

      logger.debug('Computed players merkle root', { playersMerkleRoot });

      const crashScaled = round.crashMultiplier
        ? Math.round(Number(round.crashMultiplier) * 100)
        : 0;
      const totalBetsUint = BigInt(Math.round(Number(round.totalBets || 0) * 1e6));
      const totalPayoutsUint = BigInt(Math.round(Number(round.totalPayouts || 0) * 1e6));
      const numPlayers = Number(round.players?.length || players.length || 0);

      const serverSeedHash = round.serverSeedHash
        ? round.serverSeedHash
        : ethers.ZeroHash;

      const snapshotHash = ethers.keccak256(
        ethers.solidityPacked(
          ['uint256', 'bytes32', 'uint256', 'uint256', 'bytes32', 'uint32'],
          [
            BigInt(round.roundId),
            serverSeedHash,
            BigInt(crashScaled),
            totalBetsUint,
            playersMerkleRoot,
            numPlayers,
          ]
        )
      );

      logger.debug('Computed snapshot hash', { snapshotHash });

      // submit transaction (fire-and-forget style but return the tx promise)
      logger.info('Submitting round snapshot tx', {
        roundId: round.roundId,
        playersMerkleRoot,
        totalBetsUint,
        totalPayoutsUint,
        numPlayers,
        serverSeedHash,
        crashScaled,
        snapshotHash,
      });
      const tx = await this.contract.snapshotRound(
        BigInt(round.roundId),
        snapshotHash,
        playersMerkleRoot,
        totalBetsUint,
        totalPayoutsUint,
        numPlayers
      );

      logger.debug('Round snapshot transaction created', { txHash: tx.hash });

      logger.info('Submitted round snapshot tx', {
        roundId: round.roundId,
        txHash: tx.hash,
      });
      await tx.wait();
      logger.info('Snapshot tx confirmed', { roundId: round.roundId, txHash: tx.hash });
      return tx;
    } catch (err) {
      const errorMsg = (err as Error).message;

      // Reset nonce if we detect a nonce error
      if (this.isNonceError(err)) {
        logger.warn('Nonce error detected, resetting nonce manager', { error: errorMsg });
        await this.resetNonce();
      }

      logger.error('Failed to submit round snapshot', { error: errorMsg });
      throw err;
    }
  }
  async placeBetFor(roundId: number, player: string, amount: number) {
    try {
      // Amount is in USDC (6 decimals)
      const betAmount = BigInt(Math.round(amount * 1e6));
      logger.debug('Placing bet on chain', { roundId, player, amount, betAmount: betAmount.toString() });

      logger.info('Placing bet on chain', { roundId, player, amount, betAmount: betAmount.toString() });

      // Log contract details for debugging
      const contractAddr = await this.contract.getAddress();
      logger.info('Contract details', {
        contractAddress: contractAddr,
        chainId: (await this.provider.getNetwork()).chainId.toString(),
        serverOperator: await this.contract.serverOperator()
      });

      const tx = await this.contract.placeBetFor(BigInt(roundId), player, betAmount);
      logger.info('Place bet tx submitted', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      const errorMsg = (err as Error).message;

      // Reset nonce if we detect a nonce error
      if (this.isNonceError(err)) {
        logger.warn('Nonce error detected, resetting nonce manager', { error: errorMsg });
        await this.resetNonce();
      }

      logger.error('Failed to place bet on chain', {
        error: errorMsg,
        player,
        amount,
        roundId
      });
      throw err;
    }
  }

  async cashOutFor(roundId: number, player: string, payout: number, multiplier: number) {
    try {
      // Ensure provider is ready before attempting transaction
      await this.ensureProviderReady(2);

      // Multiplier is scaled by 100 (e.g. 1.05x -> 105)
      const scaledMultiplier = BigInt(Math.round(multiplier * 100));
      // Payout is in USDC (6 decimals)
      const payoutAmount = BigInt(Math.round(payout * 1e6));

      logger.info('Cashing out on chain', { roundId, player, payout, multiplier, scaledMultiplier: scaledMultiplier.toString() });

      const tx = await this.contract.cashOutFor(BigInt(roundId), player, payoutAmount, scaledMultiplier);
      logger.info('Cashout tx submitted', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      const errorMsg = (err as Error).message;

      // Reset nonce if we detect a nonce error
      if (this.isNonceError(err)) {
        logger.warn('Nonce error detected, resetting nonce manager', { error: errorMsg });
        await this.resetNonce();
      }

      logger.error('Failed to cash out on chain', { error: errorMsg });
      throw err;
    }
  }

  async withdrawHouseProfits(amount: number) {
    try {
      // Amount is in USDC (6 decimals)
      const withdrawAmount = BigInt(Math.round(amount * 1e6));

      logger.info('Withdrawing house profits', { amount, withdrawAmount: withdrawAmount.toString() });

      const tx = await this.contract.withdrawHouseProfits(withdrawAmount);
      logger.info('Withdrawal tx submitted', { txHash: tx.hash });

      await tx.wait();
      logger.info('Withdrawal tx confirmed', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      logger.error('Failed to withdraw house profits', { error: (err as Error).message });
      throw err;
    }
  }

  async getHouseBalance() {
    try {
      const chainConfig = getChainConfig(this.chainId);
      const usdcToken = chainConfig.usdcAddress;

      if (!usdcToken) {
        throw new Error(`USDC address not configured for chain ${this.chainId}`);
      }

      const usdcContract = new ethers.Contract(
        usdcToken,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );

      const contractAddress = await this.contract.getAddress();
      const balance = await usdcContract.balanceOf(contractAddress);

      // Convert from USDC decimals (6) to human readable
      const balanceInUsdc = Number(balance) / 1e6;

      logger.info('House balance retrieved', { balance: balanceInUsdc, contractAddress, usdcToken });

      return balanceInUsdc;
    } catch (err) {
      logger.error('Failed to get house balance', {
        error: (err as Error).message,
        stack: (err as Error).stack
      });
      return 0;
    }
  }

  async getContractStatus() {
    try {
      const contractAddress = await this.contract.getAddress();
      const ethBalance = await this.provider.getBalance(contractAddress);

      let owner = "0x0000000000000000000000000000000000000000";
      let serverOperator = "0x0000000000000000000000000000000000000000";
      let isPaused = false;
      let usdcToken = "0x0000000000000000000000000000000000000000";
      let usdcBalance = 0;

      try {
        owner = await this.contract.owner();
      } catch (err) {
        logger.warn('Failed to get owner', { error: (err as Error).message });
      }

      try {
        serverOperator = await this.contract.serverOperator();
      } catch (err) {
        logger.warn('Failed to get serverOperator', { error: (err as Error).message });
      }

      try {
        isPaused = await this.contract.paused();
      } catch (err) {
        logger.warn('Failed to get paused status', { error: (err as Error).message });
      }

      try {
        usdcToken = await this.contract.usdcToken();
        usdcBalance = await this.getHouseBalance();
      } catch (err) {
        logger.warn('Failed to get USDC info', { error: (err as Error).message });
      }

      return {
        owner,
        serverOperator,
        isPaused,
        contractAddress,
        ethBalance: Number(ethBalance) / 1e18,
        usdcBalance,
        usdcToken
      };
    } catch (err) {
      logger.error('Failed to get contract status', {
        error: (err as Error).message,
        stack: (err as Error).stack
      });
      throw err;
    }
  }

  async pauseContract() {
    try {
      logger.info('Pausing contract');
      const tx = await this.contract.pause();
      await tx.wait();
      logger.info('Contract paused', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to pause contract', { error: (err as Error).message });
      throw err;
    }
  }

  async unpauseContract() {
    try {
      logger.info('Unpausing contract');
      const tx = await this.contract.unpause();
      await tx.wait();
      logger.info('Contract unpaused', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to unpause contract', { error: (err as Error).message });
      throw err;
    }
  }

  async setServerOperator(newOperator: string) {
    try {
      logger.info('Setting server operator', { newOperator });
      const tx = await this.contract.setServerOperator(newOperator);
      await tx.wait();
      logger.info('Server operator updated', { txHash: tx.hash, newOperator });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to set server operator', { error: (err as Error).message });
      throw err;
    }
  }

  async fundHouse(amount: number) {
    try {
      const fundAmount = BigInt(Math.round(amount * 1e6));
      logger.info('Funding house', { amount, fundAmount: fundAmount.toString() });

      // First approve USDC transfer
      const chainConfig = getChainConfig(this.chainId);
      const usdcToken = chainConfig.usdcAddress;

      if (!usdcToken) {
        throw new Error(`USDC address not configured for chain ${this.chainId}`);
      }

      const usdcContract = new ethers.Contract(
        usdcToken,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        this.signer
      );

      const currentAllowance = await usdcContract.allowance(
        await this.signer.getAddress(),
        await this.contract.getAddress()
      );

      if (currentAllowance < fundAmount) {
        logger.info('Approving USDC transfer');
        const approveTx = await usdcContract.approve(await this.contract.getAddress(), fundAmount);
        await approveTx.wait();
        logger.info('USDC approved', { txHash: approveTx.hash });
      }

      const tx = await this.contract.fundHouse(fundAmount);
      await tx.wait();
      logger.info('House funded', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to fund house', { error: (err as Error).message });
      throw err;
    }
  }

  async withdrawETH(to: string, amount: number) {
    try {
      const withdrawAmount = BigInt(Math.round(amount * 1e18));
      logger.info('Withdrawing ETH', { to, amount, withdrawAmount: withdrawAmount.toString() });

      const tx = await this.contract.withdrawETH(to, withdrawAmount);
      await tx.wait();
      logger.info('ETH withdrawn', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to withdraw ETH', { error: (err as Error).message });
      throw err;
    }
  }
}
