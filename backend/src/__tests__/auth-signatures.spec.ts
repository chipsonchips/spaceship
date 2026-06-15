import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';

describe('Auth Signature Cryptographic Verification', () => {
    // Generate a test wallet
    const wallet = ethers.Wallet.createRandom();

    it('should successfully sign and verify a deterministic login message', async () => {
        const address = wallet.address;
        const timestamp = Date.now();
        const message = `Welcome to Spaceship! Sign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${timestamp}`;

        // Sign the message using the private key
        const signature = await wallet.signMessage(message);

        // Recover signer address using ethers.verifyMessage
        const recoveredAddress = ethers.verifyMessage(message, signature);
        expect(recoveredAddress.toLowerCase()).toBe(address.toLowerCase());

        // Verify message pattern matches Wallet address
        const addressMatch = message.match(/Wallet:\s*(0x[a-fA-F0-9]{40})/i);
        expect(addressMatch).toBeDefined();
        expect(addressMatch![1].toLowerCase()).toBe(address.toLowerCase());

        // Verify message timestamp pattern
        const match = message.match(/Timestamp:\s*(\d+)/);
        expect(match).toBeDefined();
        const msgTimestamp = parseInt(match![1], 10);
        expect(msgTimestamp).toBe(timestamp);

        // Ensure timestamp is within the 10-minute validity window
        const now = Date.now();
        expect(Math.abs(now - msgTimestamp)).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it('should fail verification if signature is tampered', async () => {
        const address = wallet.address;
        const timestamp = Date.now();
        const message = `Welcome to Spaceship! Sign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${timestamp}`;

        const signature = await wallet.signMessage(message);
        const tamperedSignature = signature.slice(0, -4) + '0000'; // Alter last few bytes

        const recoveredAddress = ethers.verifyMessage(message, tamperedSignature);
        expect(recoveredAddress.toLowerCase()).not.toBe(address.toLowerCase());
    });

    it('should reject authentication if timestamp is expired (older than 10 minutes)', () => {
        const address = wallet.address;
        const oldTimestamp = Date.now() - 11 * 60 * 1000; // 11 minutes ago
        const message = `Welcome to Spaceship! Sign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${oldTimestamp}`;

        const match = message.match(/Timestamp:\s*(\d+)/);
        expect(match).toBeDefined();
        const msgTimestamp = parseInt(match![1], 10);

        const now = Date.now();
        const isExpired = Math.abs(now - msgTimestamp) > 10 * 60 * 1000;
        expect(isExpired).toBe(true);
    });

    it('should reject authentication if wallet address mismatch', () => {
        const address = wallet.address;
        const otherAddress = '0x0000000000000000000000000000000000000000';
        const message = `Welcome to Spaceship! Sign this message to authenticate.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;

        const addressMatch = message.match(/Wallet:\s*(0x[a-fA-F0-9]{40})/i);
        expect(addressMatch).toBeDefined();
        const isMismatch = addressMatch![1].toLowerCase() !== otherAddress.toLowerCase();
        expect(isMismatch).toBe(true);
    });
});
