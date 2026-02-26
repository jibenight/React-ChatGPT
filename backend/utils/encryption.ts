/**
 * AES-256-GCM encryption/decryption using native Node.js crypto.
 * Backward compatible: falls back to crypto-js format for old ciphertexts.
 *
 * New format: base64(iv[12] + authTag[16] + ciphertext)
 * Old format: crypto-js AES stringify (starts with 'U2FsdGVkX1')
 */
const crypto = require('crypto');
const cryptoJS = require('crypto-js');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const deriveKey = (secret: string): Buffer => {
  return crypto.scryptSync(secret, 'react-chatgpt-salt', KEY_LENGTH);
};

const encrypt = (plaintext: string, secret: string): string => {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString('base64');
};

const isOldCryptoJsFormat = (ciphertext: string): boolean => {
  // crypto-js AES.encrypt().toString() produces a salted OpenSSL format starting with 'U2FsdGVkX1'
  return ciphertext.startsWith('U2FsdGVkX1');
};

const decrypt = (ciphertext: string, secret: string): string => {
  // Backward compatibility: try crypto-js format first
  if (isOldCryptoJsFormat(ciphertext)) {
    const bytes = cryptoJS.AES.decrypt(ciphertext, secret);
    const result = bytes.toString(cryptoJS.enc.Utf8);
    if (!result) throw new Error('Failed to decrypt with legacy format');
    return result;
  }

  // New native crypto format
  const buf = Buffer.from(ciphertext, 'base64');
  if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext length');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = { encrypt, decrypt };
