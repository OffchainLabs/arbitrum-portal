/**
 * Extracts a clean error message from viem errors to show to the user.
 * Prefers shortMessage or details over the full message to avoid showing transaction data.
 */
import type { BaseError } from 'viem';

export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Check if it's a viem BaseError (has shortMessage property)
  if (error && typeof error === 'object' && 'shortMessage' in error) {
    const viemError = error as BaseError;
    return viemError.shortMessage;
  }

  // Fallback to details or message
  if (error && typeof error === 'object' && 'details' in error) {
    return (error as { details: string }).details;
  }

  return error instanceof Error ? error.message : String(error);
}
