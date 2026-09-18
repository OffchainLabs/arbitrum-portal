import type { SeverityLevel } from '@sentry/react';

import type { ErrorCategory } from '../util/SentryUtils';

export interface HandleErrorParams {
  /** The original error object caught. */
  error: unknown;
  /** A specific, unique identifier for the *operation* or context being attempted (e.g., 'cctp_approve_token', 'eth_deposit'). */
  label: string;
  /** Caller-determined category for Sentry tagging. */
  category: ErrorCategory;
  /** Optional: Additional key-value data specific to this error instance for Sentry 'extra' context. */
  additionalData?: Record<string, unknown>;
  /** Optional: Sentry severity level. Defaults to 'error' if not provided. */
  level?: SeverityLevel;
}
