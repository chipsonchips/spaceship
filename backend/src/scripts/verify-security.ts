import { encrypt, decrypt } from "../utils/encryption.js";
import { securityMonitor } from "../services/security-monitor.service.js";
import crypto from "crypto";

async function verifySecurity() {
  console.log("Starting Security Verification...");

  // 1. Verify Encryption
  console.log("\n[1] Verifying Encryption...");
  const seed = crypto.randomBytes(32).toString("hex");
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 chars
  process.env.ENCRYPTION_SECRET = secret;

  const { encrypted, iv, authTag } = encrypt(seed, secret);
  const decrypted = decrypt(encrypted, iv, authTag, secret);
  console.log("Seed Match:", seed === decrypted ? "✅ PASS" : "❌ FAIL");

  // 2. Verify Security Monitor (Mocked DB for brevity)
  console.log("\n[2] Verifying Security Monitor...");
  const address = "0xSuspiciousUser" + Math.random().toString(36).substring(7);

  // Manually flag as suspicious
  securityMonitor["suspiciousWallets"].add(address);
  console.log("Suspicious Blocking:", securityMonitor.isSuspicious(address) ? "✅ PASS" : "❌ FAIL");

  securityMonitor.clearSuspicious(address);
  console.log("Clear Blocking:", !securityMonitor.isSuspicious(address) ? "✅ PASS" : "❌ FAIL");

  console.log("\nVerification Complete.");
}

verifySecurity().catch(console.error);
