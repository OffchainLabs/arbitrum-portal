// @vitest-environment happy-dom
import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeBridgeNetworks } from '@/bridge/util/networks';

import { RetryableRedeemer } from '../RetryableRedeemer';

// the app extends these in `initializeDayjs`, which only runs inside AppProviders
dayjs.extend(relativeTime);
dayjs.extend(utc);

const INVALID_TX_HASH_ERROR = 'That doesn’t seem to be a valid transaction hash, please try again.';
const VALID_TX_HASH = `0x${'a'.repeat(64)}`;
const ARBITRUM_ONE = 42161;

const useRetryableLookupMock = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: true, chainId: 42161 }),
}));
vi.mock('wagmi/actions', () => ({ getConnectorClient: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/build/retryables' }));
vi.mock('react-use', () => ({ useCopyToClipboard: () => [{}, vi.fn()] }));
vi.mock('@/bridge/util/wagmi/setup', () => ({ wagmiConfig: {} }));
vi.mock('@/bridge/util/wagmi/useEthersSigner', () => ({ clientToSigner: vi.fn() }));
vi.mock('@/bridge/util/RetryableUtils', () => ({ getRetryableTicket: vi.fn() }));
vi.mock('@/bridge/util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('@/bridge/components/common/atoms/Toast', () => ({ errorToast: vi.fn() }));
vi.mock('@/token-bridge-sdk/utils', () => ({ getProviderForChainId: vi.fn() }));
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
  ChainSelectDropdown: ({ onChange }: { onChange: (chainId: number) => void }) => (
    <button type="button" onClick={() => onChange(42170)}>
      Select Arbitrum Nova
    </button>
  ),
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

function renderRedeemer({ initialTxHash }: { initialTxHash?: string } = {}) {
  return render(<RetryableRedeemer initialChainId={ARBITRUM_ONE} initialTxHash={initialTxHash} />);
}

function getInput() {
  return screen.getByLabelText('Ethereum transaction hash');
}

function check() {
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
}

function queryRedeemButton() {
  return screen.queryByRole('button', { name: 'Redeem on Arbitrum One' });
}

beforeAll(() => {
  initializeBridgeNetworks();
});

// this config does not set `globals`, so testing-library's automatic cleanup never registers
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

beforeEach(() => {
  // the hook only resolves a result for a submitted hash, mirroring its SWR key
  useRetryableLookupMock.mockReset();
  useRetryableLookupMock.mockImplementation(({ parentChainTxHash }) =>
    parentChainTxHash ? redeemableResult() : emptyResult,
  );
});

describe('RetryableRedeemer', () => {
  it('shows a redeemable ticket after checking a valid hash', () => {
    renderRedeemer();

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });
    check();

    expect(screen.getByText('Ready to redeem')).toBeDefined();
    expect(queryRedeemButton()).not.toBeNull();
  });

  it('looks up a ticket straight away when the hash comes from the url', () => {
    renderRedeemer({ initialTxHash: VALID_TX_HASH });

    expect(useRetryableLookupMock).toHaveBeenCalledWith(
      expect.objectContaining({ parentChainTxHash: VALID_TX_HASH }),
    );
    expect(screen.getByText('Ready to redeem')).toBeDefined();
  });

  it('ignores a malformed hash in the url', () => {
    renderRedeemer({ initialTxHash: 'xac1cc40081cedd89' });

    expect(useRetryableLookupMock).toHaveBeenCalledWith(
      expect.objectContaining({ parentChainTxHash: undefined }),
    );
    expect(screen.queryByText('Ready to redeem')).toBeNull();
  });

  it('keeps the url on the chain the shown result came from', () => {
    renderRedeemer({ initialTxHash: VALID_TX_HASH });

    expect(window.location.search).toBe(`?chainId=${ARBITRUM_ONE}&tx=${VALID_TX_HASH}`);

    // switching chains re-runs the lookup on its own, so the url has to follow without a submit
    fireEvent.click(screen.getByRole('button', { name: 'Select Arbitrum Nova' }));

    expect(useRetryableLookupMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ childChainId: 42170 }),
    );
    expect(window.location.search).toBe(`?chainId=42170&tx=${VALID_TX_HASH}`);
  });

  it('drops the previous result as soon as the hash is edited', () => {
    renderRedeemer();

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });
    check();
    expect(screen.getByText('Ready to redeem')).toBeDefined();

    fireEvent.change(getInput(), { target: { value: `${VALID_TX_HASH}c` } });

    expect(screen.queryByText('Ready to redeem')).toBeNull();
    expect(queryRedeemButton()).toBeNull();
  });

  it('never leaves a redeemable ticket on screen when a re-check fails validation', () => {
    renderRedeemer();

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });
    check();
    expect(screen.getByText('Ready to redeem')).toBeDefined();

    // the hash the ticket belongs to is no longer what the field holds
    fireEvent.change(getInput(), { target: { value: 'xac1cc40081cedd89' } });
    check();

    expect(screen.getByText(INVALID_TX_HASH_ERROR)).toBeDefined();
    expect(screen.queryByText('Ready to redeem')).toBeNull();
    expect(queryRedeemButton()).toBeNull();
  });

  it('re-runs the lookup when the same hash is checked again', () => {
    const mutate = vi.fn();
    useRetryableLookupMock.mockImplementation(({ parentChainTxHash }) =>
      parentChainTxHash ? { ...redeemableResult(), mutate } : emptyResult,
    );

    renderRedeemer({ initialTxHash: VALID_TX_HASH });
    check();

    expect(mutate).toHaveBeenCalled();
  });

  it('does not look up anything until the hash is submitted', () => {
    renderRedeemer();

    fireEvent.change(getInput(), { target: { value: VALID_TX_HASH } });

    expect(useRetryableLookupMock).toHaveBeenCalledWith(
      expect.objectContaining({ parentChainTxHash: undefined }),
    );
    expect(screen.queryByText('Ready to redeem')).toBeNull();
  });
});
