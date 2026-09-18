import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { SWRConfig } from 'swr';
import { arbitrum, mainnet } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransferCallbacks, TransferSubmission } from '../../application/executeTransfer';
import { AssetType } from '../../hooks/arbTokenBridge.types';
import { useAddPendingTransactions } from '../../hooks/useTransactionHistory';
import { DepositStatus, type MergedTransaction } from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
import { getChainMetadata } from '../../util/networkMetadata';
import { WalletContext } from '../../wallet/WalletContext';
import type { WalletContextValue } from '../../wallet/types';
import { TransferPanel } from './TransferPanel';

const form = vi.hoisted(() => ({
  amount: '1',
  sourceChainId: 1,
  setQuery: vi.fn(),
  refresh: vi.fn(async () => {}),
  onError: vi.fn(),
  transferring: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/bridge' }));
vi.mock('../../application/executeTransfer', () => ({ executeTransfer: vi.fn() }));
vi.mock('../../application/evmExecutionRuntime', () => ({ switchTransferNetwork: vi.fn() }));
vi.mock('../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [
    {
      amount: form.amount,
      amount2: '',
      disabledFeatures: [],
      destinationAddress: '0x0000000000000000000000000000000000000003',
    },
    form.setQuery,
  ],
  TabParamEnum: { TX_HISTORY: 'history' },
  tabToIndex: { history: 1 },
}));
vi.mock('../../hooks/useMode', () => ({ useMode: () => ({ embedMode: false }) }));
vi.mock('../../state', () => ({
  useAppState: () => ({ app: { arbTokenBridge: { bridgeTokens: {} }, warningTokens: {} } }),
}));
vi.mock('../../hooks/useSelectedToken', () => ({ useSelectedToken: () => [null, vi.fn()] }));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [
    { sourceChain: getChainMetadata(form.sourceChainId), destinationChain: arbitrum },
    vi.fn(),
  ],
}));
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({
    childChain: arbitrum,
    parentChain: getChainMetadata(form.sourceChainId),
    isDepositMode: true,
  }),
}));
vi.mock('../../hooks/useTokenLists', () => ({ useTokenLists: () => ({ isLoading: false }) }));
vi.mock('./TokenSearchUtils', () => ({
  useTokensFromLists: () => ({ data: {} }),
  useTokensFromUser: () => ({}),
}));
vi.mock('../../hooks/TransferPanel/useIsBatchTransferSupported', () => ({
  useIsBatchTransferSupported: () => false,
}));
vi.mock('../../hooks/useSourceChainNativeCurrencyDecimals', () => ({
  useSourceChainNativeCurrencyDecimals: () => 18,
}));
vi.mock('../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: () => ({ name: 'Ether', symbol: 'ETH', decimals: 18, isCustom: false }),
}));
vi.mock('../../hooks/useAccountType', () => ({
  useAccountType: () => ({ accountType: 'externally-owned-account' }),
}));
vi.mock('../App/AppContext', () => ({
  useAppContextActions: () => ({ setTransferring: form.transferring }),
}));
vi.mock('./hooks/useRouteStore', () => ({
  getSelectedRouteContext: () => undefined,
  useRouteStore: (selector: (value: unknown) => unknown) =>
    selector({ selectedRoute: 'arbitrum', clearRoute: vi.fn() }),
}));
vi.mock('../../hooks/useLifiMergedTransactionCacheStore', () => ({
  useLifiMergedTransactionCacheStore: (selector: (value: unknown) => unknown) =>
    selector({ addTransaction: vi.fn(), updateTransaction: vi.fn() }),
}));
vi.mock('./hooks/useIsTransferAllowed', () => ({ useIsTransferAllowed: () => true }));
vi.mock('./hooks/useIsSwapTransfer', () => ({ useIsSwapTransfer: () => false }));
vi.mock('../common/Dialog2', () => ({
  useDialog2: () => [{}, () => async () => [true]],
  DialogWrapper: () => null,
}));
vi.mock('../common/Dialog', () => ({ useDialog: () => [{ onClose: vi.fn() }] }));
vi.mock('./TokenImportDialog', () => ({
  useTokenImportDialogStore: () => vi.fn(),
  TokenImportDialog: () => null,
}));
vi.mock('../../wallet/hooks/useTokenBalances', () => ({
  useRefreshTokenBalances: () => form.refresh,
}));
vi.mock('./hooks/useDestinationAddressError', () => ({ useDestinationAddressError: () => ({}) }));
vi.mock('../../hooks/useError', () => ({ useError: () => ({ handleError: form.onError }) }));
vi.mock('./hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: () => BigNumber.from(form.amount),
}));
vi.mock('../../util/AnalyticsUtils', () => ({ trackEvent: vi.fn() }));
vi.mock('../../util/TokenUtils', () => ({ isTokenNativeUSDC: () => false }));
vi.mock('../../util/queryParamUtils', () => ({ isOnrampFeatureEnabled: () => false }));
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
const solanaAddress = 'So11111111111111111111111111111111111111112';
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
beforeEach(() => {
  vi.clearAllMocks();
  form.amount = '1';
  form.sourceChainId = 1;
});

function PendingHistory({ address }: { address: string }) {
  const { newTransactionsData } = useAddPendingTransactions(address);
  return (
    <output data-testid={`history-${address}`}>{JSON.stringify(newTransactionsData ?? [])}</output>
  );
}

describe.sequential('injected transfer execution', () => {
  it.each([
    {
      ecosystem: 'solana',
      chainId: ChainId.Solana,
      address: solanaAddress,
    },
    { ecosystem: 'evm', chainId: mainnet.id, address: evmAddress },
  ] as const)(
    'adds and updates $ecosystem pending history through the panel callbacks',
    async ({ ecosystem, chainId, address }) => {
      form.sourceChainId = chainId;
      const connectedWallets: WalletContextValue = {
        ...wallets,
        solana: {
          ...wallets.solana,
          isConnected: true,
          account: {
            ecosystem: 'solana',
            address: solanaAddress,
            chainId: ChainId.Solana,
            status: 'connected',
          },
        },
      };
      const execute = vi.fn<
        (snapshot: TransferSubmission, callbacks: TransferCallbacks) => Promise<void>
      >(async () => {});
      render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <WalletContext.Provider value={connectedWallets}>
            <TransferPanel execute={execute} />
            <PendingHistory address={address} />
            {ecosystem === 'solana' && <PendingHistory address={address.toLowerCase()} />}
          </WalletContext.Provider>
        </SWRConfig>,
      );
      fireEvent.click(screen.getByText('Move funds'));
      await waitFor(() => expect(execute).toHaveBeenCalledOnce());
      const [submitted, callbacks] = execute.mock.calls[0] ?? [];
      if (!submitted || !callbacks) throw new Error('Missing submission');
      expect(submitted.walletAddress).toBe(address);
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
      if (ecosystem === 'solana') {
        expect(screen.getByTestId(`history-${address.toLowerCase()}`).textContent).toBe('[]');
      }
    },
  );
  it('captures the submitted form, blocks duplicate clicks, and retains callbacks after unmount', async () => {
    let finish = () => {};
    const completion = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const execute = vi.fn<
      (snapshot: TransferSubmission, callbacks: TransferCallbacks) => Promise<void>
    >(() => completion);
    const view = render(
      <WalletContext.Provider value={wallets}>
        <TransferPanel execute={execute} />
      </WalletContext.Provider>,
    );
    fireEvent.click(screen.getByText('Move funds'));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Move funds'));
    expect(execute).toHaveBeenCalledTimes(1);
    const [submitted, callbacks] = execute.mock.calls[0] ?? [];
    if (!submitted || !callbacks) throw new Error('Missing submission');
    form.amount = '2';
    view.rerender(
      <WalletContext.Provider value={wallets}>
        <TransferPanel execute={execute} />
      </WalletContext.Provider>,
    );
    view.unmount();
    expect(submitted.amount).toBe('1');
    expect(submitted.destinationAddress).toBe('0x0000000000000000000000000000000000000003');
    await callbacks.refreshTokenBalances({
      chainId: submitted.networks.sourceChain.id,
      walletAddress: submitted.walletAddress,
    });
    expect(form.refresh).toHaveBeenCalledWith({
      chainId: 1,
      walletAddress: wallets.evm.account.address,
    });
    finish();
  });
  it('reports an early execution failure and releases the submit lock', async () => {
    const error = new Error('Signing account changed');
    const execute = vi.fn(async () => {
      throw error;
    });
    render(
      <WalletContext.Provider value={wallets}>
        <TransferPanel execute={execute} />
      </WalletContext.Provider>,
    );
    fireEvent.click(screen.getByText('Move funds'));
    await waitFor(() =>
      expect(form.onError).toHaveBeenCalledWith(expect.objectContaining({ error })),
    );
    fireEvent.click(screen.getByText('Move funds'));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
  });
});
