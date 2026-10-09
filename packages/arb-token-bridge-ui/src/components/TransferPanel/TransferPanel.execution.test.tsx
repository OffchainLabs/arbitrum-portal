import { captureException } from '@sentry/react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { zeroAddress } from 'viem';
import { arbitrum, mainnet } from 'viem/chains';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransferCallbacks, TransferSubmission } from '../../application/executeTransfer';
import { AssetType } from '../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useAddPendingTransactions } from '../../hooks/useTransactionHistory';
import { defaultState } from '../../state/app/state';
import { DepositStatus, type MergedTransaction } from '../../state/app/state';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { WalletContext } from '../../wallet/WalletContext';
import { useTokenBalances } from '../../wallet/hooks/useTokenBalances';
import type { BalanceClient, WalletContextValue } from '../../wallet/types';
import { TransferPanel } from './TransferPanel';
import { useRouteStore } from './hooks/useRouteStore';

vi.mock('@sentry/react', async (actual) => ({
  ...(await actual<typeof import('@sentry/react')>()),
  captureException: vi.fn(),
}));
vi.mock('../../application/executeTransfer', () => ({
  executeTransfer: vi.fn(),
  switchTransferNetwork: vi.fn(),
}));

vi.mock('../../util/AccountUtils', () => ({
  getAccountType: async () => 'externally-owned-account',
}));

vi.mock('../../util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));

vi.mock('./MoveFundsButton', () => ({
  MoveFundsButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>Move funds</button>
  ),
}));
vi.mock('./TransferPanelMain', () => ({ TransferPanelMain: () => null }));
vi.mock('./ReceiveFundsHeader', () => ({ ReceiveFundsHeader: () => null }));
vi.mock('./Routes/Routes', () => ({ Routes: () => null }));
vi.mock('./ToSConfirmationCheckbox', () => ({ ToSConfirmationCheckbox: () => null }));
vi.mock('./ConnectWalletButton', () => ({ ConnectWalletButton: () => null }));
vi.mock('../Widget/WidgetBuyPanel', () => ({ WidgetBuyPanel: () => null }));
vi.mock('../Widget/WidgetTransferPanel', () => ({ WidgetTransferPanel: () => null }));

const evmAddress = '0x0000000000000000000000000000000000000001';
const wallets: WalletContextValue = {
  evm: {
    ecosystem: 'evm',
    isConnected: true,
    disconnect: async () => {},
    account: {
      ecosystem: 'evm',
      address: evmAddress,
      chainId: 1,
      status: 'connected',
    },
  },
  solana: {
    ecosystem: 'solana',
    isConnected: false,
    disconnect: async () => {},
    account: { ecosystem: 'solana', status: 'disconnected' },
  },
};
function createWrapper({
  wallets,
  query,
  fetchBalance,
}: {
  wallets: WalletContextValue;
  query: Record<string, string | number> & { sourceChain: number; destinationChain: number };
  fetchBalance: BalanceClient['fetchBalance'];
}) {
  return createBridgeTestWrapper({
    query,
    wallets,
    fetchBalance,
    app: {
      arbTokenBridgeLoaded: true,
      arbTokenBridge: {
        ...defaultState.arbTokenBridge,
        bridgeTokens: {},
        eth: { triggerOutbox: async () => {} },
      },
    },
  });
}
vi.mock('../../util/featureFlag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  useRouteStore.setState({ selectedRoute: 'arbitrum' });
});

function ChangeAmount() {
  const [{ amount }, setQuery] = useArbQueryParams();
  return <button onClick={() => setQuery({ amount: '2' })}>Amount: {amount}</button>;
}

function PendingHistory({ address }: { address: string }) {
  const { newTransactionsData } = useAddPendingTransactions(address);
  return (
    <output data-testid={`history-${address}`}>{JSON.stringify(newTransactionsData ?? [])}</output>
  );
}

describe.sequential('injected transfer execution', () => {
  it.each([{ ecosystem: 'evm', chainId: mainnet.id, address: evmAddress }] as const)(
    'adds and updates $ecosystem pending history through the panel callbacks',
    async ({ chainId, address }) => {
      const connectedWallets = wallets;
      const wrapper = createWrapper({
        wallets: connectedWallets,
        query: {
          sourceChain: chainId,
          destinationChain: ChainId.ArbitrumOne,
          amount: '1',
          destinationAddress: '0x0000000000000000000000000000000000000003',
        },
        fetchBalance: async () => ({ [zeroAddress]: 1n }),
      });
      const execute = vi.fn<
        (snapshot: TransferSubmission, callbacks: TransferCallbacks) => Promise<void>
      >(async () => {});
      render(
        <WalletContext.Provider value={connectedWallets}>
          <TransferPanel execute={execute} />
          <PendingHistory address={address} />
        </WalletContext.Provider>,
        { wrapper },
      );
      fireEvent.click(screen.getByText('Move funds'));
      await waitFor(() => expect(execute).toHaveBeenCalledOnce());
      const [submitted, callbacks] = execute.mock.calls[0] ?? [];
      if (!submitted || !callbacks) throw new Error('Missing submission');
      expect(submitted.walletAddress).toBe(address);
      expect(submitted.destinationTokenAddress).toBe(zeroAddress);
      const pending: MergedTransaction = {
        txId: 'submitted-transaction',
        sender: address,
        destination: submitted.destinationAddress,
        sourceChainId: chainId,
        destinationChainId: arbitrum.id,
        parentChainId: chainId,
        childChainId: arbitrum.id,
        asset: 'TEST',
        assetType: AssetType.ETH,
        value: '1',
        direction: 'deposit',
        status: 'pending',
        depositStatus: DepositStatus.L1_PENDING,
        createdAt: 1,
        resolvedAt: null,
        uniqueId: null,
        blockNum: null,
        tokenAddress: null,
        isWithdrawal: false,
      };
      await act(async () => callbacks.addPendingTransaction(pending));
      await waitFor(() =>
        expect(screen.getByTestId(`history-${address}`).textContent).toBe(
          JSON.stringify([pending]),
        ),
      );
      const updated = { ...pending, depositStatus: DepositStatus.L2_SUCCESS, status: 'success' };
      await act(async () => callbacks.updatePendingTransaction(updated));
      await waitFor(() =>
        expect(screen.getByTestId(`history-${address}`).textContent).toBe(
          JSON.stringify([updated]),
        ),
      );
    },
  );
  it('captures the submitted form, blocks duplicate clicks, and retains callbacks after unmount', async () => {
    const fetchBalance = vi.fn<BalanceClient['fetchBalance']>(async () => ({ [zeroAddress]: 1n }));
    const wrapper = createWrapper({
      wallets,
      query: {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
        amount: '1',
        destinationAddress: '0x0000000000000000000000000000000000000003',
      },
      fetchBalance,
    });
    let finish = () => {};
    const completion = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const execute = vi.fn<
      (snapshot: TransferSubmission, callbacks: TransferCallbacks) => Promise<void>
    >(() => completion);
    const balance = renderHook(
      () => {
        const { data } = useTokenBalances({
          chainId: 1,
          walletAddress: evmAddress,
          tokenAddresses: [zeroAddress],
        });
        return data;
      },
      { wrapper },
    );
    await waitFor(() => expect(balance.result.current?.[zeroAddress]).toBe(1n));
    fetchBalance.mockClear();
    const view = render(
      <WalletContext.Provider value={wallets}>
        <ChangeAmount />
        <TransferPanel execute={execute} />
      </WalletContext.Provider>,
      { wrapper },
    );
    fireEvent.click(screen.getByText('Move funds'));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Move funds'));
    expect(execute).toHaveBeenCalledTimes(1);
    const [submitted, callbacks] = execute.mock.calls[0] ?? [];
    if (!submitted || !callbacks) throw new Error('Missing submission');
    fireEvent.click(screen.getByRole('button', { name: 'Amount: 1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Amount: 2' })).toBeTruthy());
    view.unmount();
    expect(submitted.amount).toBe('1');
    expect(submitted.destinationAddress).toBe('0x0000000000000000000000000000000000000003');
    await callbacks.refreshTokenBalances({
      chainId: submitted.networks.sourceChain.id,
      walletAddress: submitted.walletAddress,
    });
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: 1,
      walletAddress: wallets.evm.account.address,
      tokenAddresses: [zeroAddress],
    });
    finish();
  });
  it('reports an early execution failure and releases the submit lock', async () => {
    const wrapper = createWrapper({
      wallets,
      query: {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
        amount: '1',
        destinationAddress: '0x0000000000000000000000000000000000000003',
      },
      fetchBalance: async () => ({ [zeroAddress]: 1n }),
    });
    const error = new Error('Signing account changed');
    const execute = vi.fn(async () => {
      throw error;
    });
    render(
      <WalletContext.Provider value={wallets}>
        <TransferPanel execute={execute} />
      </WalletContext.Provider>,
      { wrapper },
    );
    fireEvent.click(screen.getByText('Move funds'));
    await waitFor(() => expect(captureException).toHaveBeenCalledWith(error));
    fireEvent.click(screen.getByText('Move funds'));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
  });
});
