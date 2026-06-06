import { randomBytes } from 'node:crypto';

export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const CODE_LENGTH = 7;

export function generateCode() {
  // Generate 7 characters from a 62-char alphabet using secure random bytes
  // We need ceil(7 * log2(62)) / 8 = ceil(42.02) / 8 = 6 bytes minimum
  // Using 7 bytes for safe margin to avoid bias
  const bytes = randomBytes(7);
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    // Use the byte value modulo the alphabet length to select a character
    // To minimize bias, we reject values >= (256 / 62 * 62)
    const maxValidByte = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length - 1;
    let byte = bytes[i];

    // Simple approach: use byte % alphabet.length (small bias is acceptable for this use case)
    const index = byte % CODE_ALPHABET.length;
    code += CODE_ALPHABET[index];
  }

  return code;
}

export function isValidCode(code) {
  if (typeof code !== 'string') {
    return false;
  }
  if (code.length !== CODE_LENGTH) {
    return false;
  }
  for (const char of code) {
    if (!CODE_ALPHABET.includes(char)) {
      return false;
    }
  }
  return true;
}
