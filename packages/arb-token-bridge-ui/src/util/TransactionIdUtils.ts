import bs58 from 'bs58';
import { isHash } from 'viem';

export function isValidTransactionId(value: string): boolean {
  if (isHash(value)) return true;
  try {
    return bs58.decode(value).length === 64;
  } catch {
    return false;
  }
}

/** Normalize EVM hashes by format; preserve case for signatures and unknown formats. */
export function normalizeTransactionId(value: string): string {
  return isHash(value) ? value.toLowerCase() : value;
}
