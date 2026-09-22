// @vitest-environment happy-dom
import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeBridgeNetworks } from '@/bridge/util/networks';

import { RetryableRedeemer } from '../RetryableRedeemer';

const INVALID_TX_HASH_ERROR = 'That doesn’t seem to be a valid transaction hash, please try again.';
const VALID_TX_HASH = `0x${'a'.repeat(64)}`;

const useRetryableLookupMock = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: true, chainId: 42161 }),
}));
vi.mock('wagmi/actions', () => ({ getConnectorClient: vi.fn() }));
vi.mock('@/bridge/util/wagmi/setup', () => ({ wagmiConfig: {} }));
vi.mock('@/bridge/util/wagmi/useEthersSigner', () => ({ clientToSigner: vi.fn() }));
vi.mock('@/bridge/util/RetryableUtils', () => ({ getRetryableTicket: vi.fn() }));
vi.mock('@/bridge/util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('@/bridge/components/common/atoms/Toast', () => ({ errorToast: vi.fn() }));
vi.mock('@/token-bridge-sdk/utils', () => ({ getProviderForChainId: vi.fn() }));
vi.mock('@/bridge/hooks/useIsTestnetMode', () => ({
  useIsTestnetMode: () => [false, vi.fn()],
}));
vi.mock('@/bridge/hooks/useSwitchNetworkWithConfig', () => ({
  useSwitchNetworkWithConfig: () => ({ switchChainAsync: vi.fn() }),
}));
vi.mock('@/bridge/wallet/hooks/useWalletModal', () => ({
  useWalletModal: () => ({ openConnectModal: vi.fn() }),
}));
vi.mock('@/bridge/components/TransactionHistory/TransactionHistorySearchBar', () => ({
  // inlined: vi.mock factories are hoisted above the file's own consts
  TransactionHistorySearchError: {
    INVALID_TX_HASH: 'That doesn’t seem to be a valid transaction hash, please try again.',
  },
}));
vi.mock('../ChainSelectDropdown', () => ({
  ChainSelectDropdown: () => <div data-testid="chain-select" />,
}));
vi.mock('../useRetryableLookup', () => ({
  useRetryableLookup: (args: { childChainId: number | undefined; parentChainTxHash?: string }) =>
    useRetryableLookupMock(args),
}));

function redeemableResult() {
  return {
    data: {
      type: 'retryables' as const,
      retryables: [
        {
          retryableCreationId: `0x${'b'.repeat(64)}`,
          status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
          expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
        },
      ],
    },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  };
}

const emptyResult = { data: undefined, error: undefined, isLoading: false, mutate: vi.fn() };

function getInput() {
  return screen.getByLabelText('Source chain transaction hash');
}

function check() {
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

beforeAll(() => {
  initializeBridgeNetworks();
});

// this config does not set `globals`, so testing-library's automatic cleanup never registers
afterEach(cleanup);

beforeEach(() => {
  // the hook only resolves a result for a submitted hash, mirroring its SWR key
  useRetryableLookupMock.mockReset();
  useRetryableLookupMock.mockImplementation(({ parentChainTxHash }) =>
    parentChainTxHash ? redeemableResult() : emptyResult,
  );
});

describe('RetryableRedeemer', () => {
  it('shows a redeemable ticket after checking a valid hash', () => {
    render(<RetryableRedeemer />);

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });
    check();

    expect(screen.getByText('Ready to redeem')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Redeem' })).toBeDefined();
  });

  it('drops the previous result as soon as the hash is edited', () => {
    render(<RetryableRedeemer />);

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });
    check();
    expect(screen.getByText('Ready to redeem')).toBeDefined();

    fireEvent.change(getInput(), { target: { value: `${VALID_TX_HASH}c` } });

    expect(screen.queryByText('Ready to redeem')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Redeem' })).toBeNull();
  });

  it('never leaves a redeemable ticket on screen when a re-check fails validation', () => {
    render(<RetryableRedeemer />);

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });
    check();
    expect(screen.getByText('Ready to redeem')).toBeDefined();

    // the hash the ticket belongs to is no longer what the field holds
    fireEvent.change(getInput(), { target: { value: 'xac1cc40081cedd89' } });
    check();

    expect(screen.getByText(INVALID_TX_HASH_ERROR)).toBeDefined();
    expect(screen.queryByText('Ready to redeem')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Redeem' })).toBeNull();
  });

  it('does not look up anything until the hash is submitted', () => {
    render(<RetryableRedeemer />);

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });

    expect(useRetryableLookupMock).toHaveBeenCalledWith(
      expect.objectContaining({ parentChainTxHash: undefined }),
    );
    expect(screen.queryByText('Ready to redeem')).toBeNull();
  });
});
