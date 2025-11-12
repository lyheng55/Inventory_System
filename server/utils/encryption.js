const crypto = require('crypto');

/**
 * Encryption Utility
 * Provides encryption and decryption for sensitive data
 */

// Get encryption key from environment or generate a default (for development only)
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION)');
    // Default key for development - MUST be changed in production
    return crypto.scryptSync('default-key-change-in-production', 'salt', 32);
  }
  return Buffer.from(key, 'hex');
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text (hex encoded)
 */
const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return: iv:tag:encrypted (all hex encoded)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text (hex encoded)
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash sensitive data (one-way, cannot be decrypted)
 * @param {string} text - Text to hash
 * @param {string} salt - Optional salt (will generate if not provided)
 * @returns {Object} - { hash, salt }
 */
const hash = (text, salt = null) => {
  if (!text) return null;
  
  const generatedSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(text, generatedSalt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash,
    salt: generatedSalt
  };
};

/**
 * Verify hashed data
 * @param {string} text - Plain text to verify
 * @param {string} hash - Hashed value to compare against
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} - True if match
 */
const verifyHash = (text, hash, salt) => {
  if (!text || !hash || !salt) return false;
  
  const computedHash = crypto.pbkdf2Sync(text, salt, 10000, 64, 'sha512').toString('hex');
  return computedHash === hash;
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Random token (hex encoded)
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 16)
 * @returns {string} - Random password
 */
const generatePassword = (length = 16) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  generateToken,
  generatePassword
};

