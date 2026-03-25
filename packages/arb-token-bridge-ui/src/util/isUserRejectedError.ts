import { UserRejectedRequestError } from 'viem';

/**
 * This should only be used to conditionally act on errors,
 * to display an error toast for example.
 *
 * Filtering of userRejectedError sent to sentry is done in _app.tsx
 */
export function isUserRejectedError(error: unknown) {
  const candidate = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };

  const hasUserCancelledMessage =
    typeof candidate.message === 'string' && /User Cancelled/.test(candidate.message);

  return (
    candidate.code === 4001 ||
    candidate.code === 'ACTION_REJECTED' ||
    hasUserCancelledMessage ||
    error instanceof UserRejectedRequestError ||
    candidate.details === 'MetaMask Tx Signature: User denied transaction signature.' ||
    isBundleRejectedError(error)
  );
}

/**
 * Detects when a wallet batch/bundle transaction was rejected by the user.
 * Some wallets return a batchId from sendCalls but invalidate it on rejection,
 * causing getCallsStatus to throw "bundle id is unknown".
 */
export function isBundleRejectedError(error: unknown) {
  const candidate = (error ?? {}) as { message?: string; details?: string };
  const msg = (candidate.message ?? '').toLowerCase();
  const details = (candidate.details ?? '').toLowerCase();
  const combined = `${msg} ${details}`;
  return (
    combined.includes('bundle id is unknown') || combined.includes('no matching bundle found')
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
  if (isUserRejectedError(error)) {
    return 'Transaction rejected';
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // Fallback to default message
  return defaultMessage;
}
