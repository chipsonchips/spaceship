import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts sensitive text using AES-256-GCM.
 * Returns an object containing the encrypted content, IV, and auth tag.
 */
export function encrypt(text: string, secretKey: string): { 
  encrypted: string; 
  iv: string; 
  authTag: string 
} {
  if (!secretKey || secretKey.length !== 64) {
    throw new Error('Invalid encryption key. Must be a 64-character hex string (32 bytes).');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(secretKey, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts text using AES-256-GCM.
 */
export function decrypt(
  encryptedData: string, 
  iv: string, 
  authTag: string, 
  secretKey: string
): string {
  if (!secretKey || secretKey.length !== 64) {
    throw new Error('Invalid encryption key. Must be a 64-character hex string (32 bytes).');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(secretKey, 'hex'), 
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
