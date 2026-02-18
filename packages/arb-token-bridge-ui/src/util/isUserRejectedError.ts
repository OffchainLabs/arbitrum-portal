import { UserRejectedRequestError } from 'viem';

/**
 * This should only be used to conditionally act on errors,
 * to display an error toast for example.
 *
 * Filtering of userRejectedError sent to sentry is done in _app.tsx
 */
export function isUserRejectedError(error: any) {
  return (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    error?.message?.match(/User Cancelled/) ||
    error instanceof UserRejectedRequestError ||
    error?.details === 'MetaMask Tx Signature: User denied transaction signature.'
  );
}

/**
 * Formats a transaction error into a user-friendly error message
 * Handles UserRejectedRequestError and other error types consistently
 *
 * @param error - The error object from transaction execution
 * @param defaultMessage - Default message if error cannot be parsed (default: 'Transaction failed')
 * @returns User-friendly error message string
 */
export function formatTransactionError(
  error: unknown,
  defaultMessage: string = 'Transaction failed',
): string {
  // Handle user rejection errors first
  if (error instanceof UserRejectedRequestError) {
    return 'Transaction rejected';
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // Fallback to default message
  return defaultMessage;
}
