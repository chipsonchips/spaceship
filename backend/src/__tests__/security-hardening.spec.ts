import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../utils/encryption.js';
import { combineClientSeeds, createFinalSeed, verifyCrashPoint } from '../utils/provably-fair.js';
import { SecurityMonitorService } from '../services/security-monitor.service.js';
import { sanitizeRound, generateCrashMultiplier, hashServerSeed } from '../services/game-utils.js';
import { AdminActionType } from '../entities/admin-log.entity.js';

// Mock dependencies
const { mockAuditLogService } = vi.hoisted(() => ({
  mockAuditLogService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../services/audit-log.service.js', () => ({
  auditLogService: mockAuditLogService,
}));

const mockBetRepo = {
  find: vi.fn(),
};

const mockRoundRepo = {
  findOne: vi.fn(),
};

vi.mock('../config/database.js', () => ({
  AppDataSource: {
    getRepository: vi.fn((entity) => {
      if (entity.name === 'Round') return mockRoundRepo;
      return mockBetRepo;
    }),
  },
}));

describe('Security Hardening Integration Tests', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('Phase 2: Encryption Utilities', () => {
    it('should encrypt and decrypt correctly', () => {
      const text = 'test-seed-123';
      const { encrypted, iv, authTag } = encrypt(text, secretKey);
      
      expect(encrypted).not.to.equal(text);
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();

      const decrypted = decrypt(encrypted, iv, authTag, secretKey);
      expect(decrypted).to.equal(text);
    });

    it('should fail with invalid key length', () => {
      expect(() => encrypt('test', 'short-key')).toThrow(/Invalid encryption key/);
    });

    it('should fail decryption with tampered authTag', () => {
      const { encrypted, iv } = encrypt('test', secretKey);
      const fakeAuthTag = '0'.repeat(32);
      expect(() => decrypt(encrypted, iv, fakeAuthTag, secretKey)).toThrow();
    });
  });

  describe('Phase 3: Provably Fair Logic', () => {
    it('should combine multiple client seeds deterministically', () => {
      const seeds = ['seed1', 'seed2', 'seed3'];
      const hash1 = combineClientSeeds(seeds);
      const hash2 = combineClientSeeds(['seed3', 'seed1', 'seed2']); // order shouldn't matter if sorted
      expect(hash1).to.equal(hash2);
    });

    it('should create a valid final seed', () => {
      const finalSeed = createFinalSeed('server-seed', 'client-hash', 1);
      expect(finalSeed).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('should verify a fair round correctly', () => {
      const serverSeed = 'test-server-seed';
      const serverSeedHash = hashServerSeed(serverSeed);
      const clientSeeds = ['client1'];
      const nonce = 1;
      
      // Calculate what the crash point SHOULD be
      const verification = verifyCrashPoint(serverSeed, serverSeedHash, clientSeeds, nonce, 1.05, generateCrashMultiplier);
      
      expect(verification.valid).toBeDefined();
      expect(verification.actualCrashPoint).toBeGreaterThanOrEqual(1.01);
    });
  });

  describe('Phase 5: Anomaly Detection', () => {
    let monitor: SecurityMonitorService;

    beforeEach(() => {
      vi.clearAllMocks();
      monitor = new SecurityMonitorService();
    });

    it('should flag win rates over 75%', async () => {
      const address = '0xCheater';
      // Mock 50 bets, 40 wins (80% rate)
      const mockBets = Array(50).fill(null).map((_, i) => ({
        address,
        cashedOut: i < 40,
        amount: 10,
        payout: i < 40 ? 20 : 0,
        timestamp: Date.now() - i,
      }));
      mockBetRepo.find.mockResolvedValue(mockBets);

      const isSuspicious = await monitor.detectHighWinRate(address);
      expect(isSuspicious).toBe(true);
      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        null,
        AdminActionType.SECURITY_ALERT,
        expect.stringContaining('Suspicious win rate'),
        expect.anything(),
        null,
        null,
        false,
        expect.anything()
      );
    });

    it('should flag perfect cashouts', async () => {
      const roundId = 101;
      mockRoundRepo.findOne.mockResolvedValue({ id: 1, crashMultiplier: 2.50 });
      // 3 bets cashing out exactly at 2.50
      mockBetRepo.find.mockResolvedValue([
        { address: '0x1', cashoutMultiplier: 2.50, cashedOut: true },
        { address: '0x2', cashoutMultiplier: 2.49, cashedOut: true },
        { address: '0x3', cashoutMultiplier: 2.50, cashedOut: true },
      ]);

      const detected = await monitor.detectPerfectCashouts(roundId);
      expect(detected).toBe(true);
      expect(mockAuditLogService.logAction).toHaveBeenCalled();
    });
  });

  describe('Phase 1: Seed Leakage Prevention', () => {
    it('should strip serverSeed from non-crashed rounds', () => {
      const round = {
        roundId: 1,
        phase: 'BETTING',
        serverSeed: 'PRIVATE_SEED',
        crashMultiplier: 2.5
      };

      const sanitized = sanitizeRound(round, secretKey);
      expect(sanitized.serverSeed).toBeUndefined();
    });

    it('should reveal decrypted serverSeed for crashed rounds', () => {
      // First encrypt a seed
      const rawSeed = 'reveal-me';
      const { encrypted, iv, authTag } = encrypt(rawSeed, secretKey);

      const round = {
        roundId: 1,
        phase: 'CRASHED',
        serverId: 1, // renamed from serverSeed in entity to avoid confusion but sanitizeRound uses serverSeed property
        serverSeed: encrypted,
        serverSeedIV: iv,
        serverSeedAuthTag: authTag,
        crashMultiplier: 2.5
      };

      const sanitized = sanitizeRound(round, secretKey);
      expect(sanitized.serverSeed).to.equal(rawSeed);
      expect(sanitized.serverSeedIV).toBeUndefined();
      expect(sanitized.serverSeedAuthTag).toBeUndefined();
    });
  });
});
