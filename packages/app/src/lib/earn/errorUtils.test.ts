import { UserRejectedRequestError } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportEarnError, sanitizeEarnError } from './errorUtils';

const captureExceptionMock = vi.fn();
vi.mock('@sentry/react', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
  withScope: (fn: (scope: { setTag: () => void; setExtra: () => void }) => void) => {
    fn({ setTag: () => undefined, setExtra: () => undefined });
  },
}));

describe('sanitizeEarnError', () => {
  it('returns empty string for nullish input', () => {
    expect(sanitizeEarnError(null)).toBe('');
    expect(sanitizeEarnError(undefined)).toBe('');
    expect(sanitizeEarnError('')).toBe('');
  });

  it('maps user rejection (viem instance) to friendly message', () => {
    const err = new UserRejectedRequestError(new Error('User rejected'));
    expect(sanitizeEarnError(err)).toBe('Transaction rejected.');
  });

  it('maps user rejection message strings to friendly message', () => {
    const verbose =
      'User rejected the request. Request Arguments: chain: undefined (id: 42161) from: 0x6A2CF13f0CAB8B0099d53fa29a12bFF90Ac0e33c to: 0x794a61358D6845594F94dc1DB02A252b5b4814aD value: 0 ETH data: 0x69328dec... Details: User rejected the request. Version: viem@2.47.4';
    expect(sanitizeEarnError(verbose)).toBe('Transaction rejected.');
  });

  it('maps rate-limit signals to a network-busy message', () => {
    expect(sanitizeEarnError('too many requests')).toBe(
      'Network is busy. Please try again in a moment.',
    );
    expect(sanitizeEarnError('Error 429: rate limited')).toBe(
      'Network is busy. Please try again in a moment.',
    );
  });

  it('maps HTTP/JSON failures to a network-error message', () => {
    const verbose =
      'Failed to read allowance: ContractFunctionExecutionError: HTTP request failed. URL: https://arb-mainnet.g.alchemy.com/v2/abc Request body: {"method":"eth_call"} Raw Call Arguments: to: 0xaf... Contract Call: address: 0xaf... Docs: https://viem.sh Details: Unexpected token "U", "Unspecifie"... is not valid JSON Version: viem@2.47.4';
    expect(sanitizeEarnError(verbose)).toBe('Network error. Please try again.');
  });

  it('rewords Pendle minimum-valuation/amount errors with "at least"', () => {
    expect(
      sanitizeEarnError('The input valuation is too low. The minimum valuation is 0.01 USD'),
    ).toBe('Amount must be at least 0.01 USD.');
    expect(sanitizeEarnError('Input amount is too low. The minimum amount is 0.5 USDC')).toBe(
      'Amount must be at least 0.5 USDC.',
    );
  });

  it('maps insufficient-funds and allowance errors to actionable messages', () => {
    expect(sanitizeEarnError('execution reverted: insufficient funds')).toBe(
      'Insufficient funds for this transaction.',
    );
    expect(sanitizeEarnError('ERC20: transfer amount exceeds allowance')).toBe(
      'Insufficient allowance. Please approve the token first.',
    );
  });

  it('prefers viem shortMessage when available', () => {
    const err = {
      shortMessage: 'Execution reverted.',
      message: 'Execution reverted. Raw Call Arguments: to: 0xfoo data: 0xbar Version: viem@2.47.4',
    };
    expect(sanitizeEarnError(err)).toBe('Execution reverted.');
  });

  it('strips viem verbose markers from a generic message and trims', () => {
    const err = new Error(
      'Some unrelated revert reason. Request Arguments: chain: arbitrum from: 0xabc',
    );
    expect(sanitizeEarnError(err)).toBe('Some unrelated revert reason.');
  });

  it('truncates excessively long messages', () => {
    const long = 'x'.repeat(500);
    const result = sanitizeEarnError(long);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(141);
  });

  it('returns fallback when error has no usable message', () => {
    expect(sanitizeEarnError({})).toBe('Something went wrong. Please try again.');
    expect(sanitizeEarnError(42)).toBe('Something went wrong. Please try again.');
  });
});

describe('reportEarnError', () => {
  afterEach(() => {
    captureExceptionMock.mockClear();
  });

  it('skips user rejection errors', () => {
    reportEarnError(new UserRejectedRequestError(new Error('User rejected')), {
      label: 'earn_test',
      category: 'earn_transaction',
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('skips noisy transient errors (rate limits, min-valuation)', () => {
    reportEarnError('too many requests', { label: 'earn_test', category: 'earn_quote' });
    reportEarnError(new Error('Input valuation is too low. The minimum valuation is 0.01 USD'), {
      label: 'earn_test',
      category: 'earn_quote',
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures real errors', () => {
    reportEarnError(new Error('HTTP request failed'), {
      label: 'earn_pendle_enter',
      category: 'earn_transaction',
      opportunityId: '0xabc',
      vendor: 'pendle',
      chainId: 42161,
    });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
