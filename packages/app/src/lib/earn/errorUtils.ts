import * as Sentry from '@sentry/react';

import { isBundleRejectedError, isUserRejectedError } from '@/bridge/util/isUserRejectedError';

// Markers indicating the start of viem's verbose request/contract dump.
// Anything from the earliest match onward is dropped before display.
const VIEM_NOISE_MARKERS = [
  'Request Arguments:',
  'Raw Call Arguments:',
  'Contract Call:',
  'Request body:',
  'URL: http',
  'Details:',
  'Docs:',
  'Version: viem@',
];

const MAX_LENGTH = 140;
const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

function stripViemNoise(message: string): string {
  let cutoff = message.length;
  for (const marker of VIEM_NOISE_MARKERS) {
    const idx = message.indexOf(marker);
    if (idx !== -1 && idx < cutoff) {
      cutoff = idx;
    }
  }
  return message.slice(0, cutoff).trim();
}

function truncate(message: string): string {
  if (message.length <= MAX_LENGTH) return message;
  return `${message.slice(0, MAX_LENGTH).trim()}…`;
}

function normalizeMessage(raw: string, fallback: string): string {
  const stripped = stripViemNoise(raw);
  const lower = stripped.toLowerCase();

  if (
    /user rejected|user denied|user cancelled|action_rejected|bundle id is unknown/i.test(stripped)
  ) {
    return 'Transaction rejected.';
  }
  if (/\b429\b|too many requests|rate ?limit/i.test(lower)) {
    return 'Network is busy. Please try again in a moment.';
  }
  if (
    /http request failed|fetch failed|network ?error|networkerror|is not valid json|unexpected token/i.test(
      lower,
    )
  ) {
    return 'Network error. Please try again.';
  }
  if (/insufficient (funds|balance)|exceeds balance/i.test(lower)) {
    return 'Insufficient funds for this transaction.';
  }
  if (/insufficient allowance|transfer amount exceeds allowance/i.test(lower)) {
    return 'Insufficient allowance. Please approve the token first.';
  }
  const minimumMatch = stripped.match(
    /minimum (?:valuation|amount) is\s+([\d,]+(?:\.\d+)?\s*\w+)/i,
  );
  const minimumValue = minimumMatch?.[1];
  if (minimumValue) {
    return `Amount must be at least ${minimumValue.trim()}.`;
  }

  return truncate(stripped) || fallback;
}

// Transient/expected errors that aren't actionable as Sentry events.
const SENTRY_SKIP_PATTERNS = [
  /\b429\b/i,
  /too many requests/i,
  /rate ?limit/i,
  /minimum (?:valuation|amount) is/i,
];

export type EarnErrorCategory = 'earn_quote' | 'earn_transaction' | 'earn_gas_estimate';

export interface EarnErrorContext {
  label: string;
  category: EarnErrorCategory;
  opportunityId?: string;
  vendor?: string;
  chainId?: number;
}

export function reportEarnError(error: unknown, context: EarnErrorContext): void {
  if (error == null) return;
  if (isUserRejectedError(error) || isBundleRejectedError(error)) return;

  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  if (SENTRY_SKIP_PATTERNS.some((re) => re.test(message))) return;

  Sentry.withScope((scope) => {
    scope.setTag('error_category', context.category);
    scope.setTag('operation_label', context.label.substring(0, 200));
    if (context.opportunityId) scope.setTag('opportunity_id', context.opportunityId);
    if (context.vendor) scope.setTag('vendor', context.vendor);
    if (context.chainId != null) scope.setTag('chain_id', String(context.chainId));
    scope.setExtra('sanitizedMessage', sanitizeEarnError(error));
    Sentry.captureException(error instanceof Error ? error : new Error(message));
  });
}

export function sanitizeEarnError(input: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (input == null || input === '') return '';

  if (typeof input === 'string') {
    return normalizeMessage(input, fallback);
  }

  if (isUserRejectedError(input) || isBundleRejectedError(input)) {
    return 'Transaction rejected.';
  }

  const candidate = input as { shortMessage?: unknown; message?: unknown };
  if (typeof candidate.shortMessage === 'string' && candidate.shortMessage.length > 0) {
    return normalizeMessage(candidate.shortMessage, fallback);
  }
  if (typeof candidate.message === 'string' && candidate.message.length > 0) {
    return normalizeMessage(candidate.message, fallback);
  }

  return fallback;
}
