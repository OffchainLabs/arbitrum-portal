import { BigNumber, utils } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiBatchedTransaction } from '../test-utils/lifi';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { solanaChain } from '../wallet/solana/network';
import { executeLifiTransfer } from './executeLifiTransfer';
import type { TransferCallbacks, TransferSubmission } from './executeTransfer';
import { resolveLifiTransferStarter } from './resolveLifiTransferStarter';

vi.mock('./resolveLifiTransferStarter', () => ({ resolveLifiTransferStarter: vi.fn() }));
vi.mock('../util/TransferAmounts', () => ({
  getAmountToPay: () => ({ fromAmountUsd: 1, toAmountUsd: 1 }),
}));
vi.mock('../util/AnalyticsUtils', () => ({ trackEvent: vi.fn(), getLifiAssetType: () => 'ERC20' }));

function lifiRoute(): LifiCrosschainTransfersRoute {
  const route = createMockLifiBatchedTransaction().lifiRoute;
  if (!route) throw new Error('Missing fixture route');
  return {
    type: 'lifi',
    durationMs: 1000,
    gas: [],
    fee: [],
    fromChainId: route.fromChainId,
    toChainId: route.toChainId,
    fromAmount: {
      amount: route.fromAmount,
      amountUSD: route.fromAmountUSD ?? '0',
      token: route.fromToken,
    },
    toAmount: { amount: route.toAmount, amountUSD: route.toAmountUSD ?? '0', token: route.toToken },
    protocolData: { route },
  };
}
function snapshot(context = lifiRoute()): TransferSubmission {
  const sourceChain = getWagmiChain(context.fromChainId);
  const destinationChain = getWagmiChain(context.toChainId);
  const address = '0x1111111111111111111111111111111111111111';
  return {
    networks: { sourceChain, destinationChain },
    parentChain: sourceChain,
    childChain: destinationChain,
    sourceWallet: {
      ecosystem: 'evm',
      isConnected: true,
      account: { address, chainId: sourceChain.id },
    },
    walletAddress: address,
    destinationWalletAddress: address,
    amount: '1',
    amount2: '',
    amountBigNumber: BigNumber.from(1_000_000),
    selectedRoute: 'lifi',
    selectedToken: null,
    destinationTokenAddress: context.toAmount.token.address,
    context,
    nativeCurrency: { ...sourceChain.nativeCurrency, isCustom: false },
    nativeCurrencyDecimalsOnSourceChain: sourceChain.nativeCurrency.decimals,
    warningTokens: {},
    isDepositMode: true,
    isSmartContractWallet: false,
    isBatchTransferSupported: false,
    isSwapTransfer: false,
    isTransferAllowed: true,
  };
}
function callbacks(): TransferCallbacks {
  return {
    setTransferring: vi.fn(),
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
    highlightHistoryDisclaimer: vi.fn(),
    confirmDialog: vi.fn(async () => true),
    confirmCustomDestinationAddress: vi.fn(async () => true),
    firstTimeTokenBridgingConfirmation: vi.fn(async () => true),
    confirmWithdrawal: vi.fn(async () => true),
    showDelayedSmartContractTxRequest: vi.fn(),
    showDelayInSmartContractTransaction: vi.fn(),
    handleError: vi.fn(),
    addPendingTransaction: vi.fn(),
    updatePendingTransaction: vi.fn(),
    addLifiTransactionToCache: vi.fn(),
    updateLifiTransactionInCache: vi.fn(),
    removeLifiTransactionFromCache: vi.fn(),
    resetAmountAndSwitchToTransactionHistoryTab: vi.fn(),
    clearRoute: vi.fn(),
    onSubmitted: vi.fn(),
    refreshTokenBalances: vi.fn(async () => {}),
  };
}

describe.sequential('LiFi background observers', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['Invalid destination address', { destinationAddressError: 'Invalid destination address' }],
    ['A valid destination address is required.', { destinationWalletAddress: undefined }],
    [
      'A valid destination address is required.',
      { destinationAddress: '0x52908400098527886E0F7030069857D2E4169Ee7' },
    ],
    ['A valid destination address is required.', { destinationAddress: 'invalid' }],
    [
      'Select a destination token before executing this quote.',
      { destinationTokenAddress: undefined },
    ],
  ] as const)('rejects %s before warnings or starter resolution', async (message, invalid) => {
    const effects = callbacks();
    await executeLifiTransfer({ ...snapshot(), ...invalid }, effects);
    expect(effects.confirmDialog).not.toHaveBeenCalled();
    expect(effects.confirmCustomDestinationAddress).not.toHaveBeenCalled();
    expect(resolveLifiTransferStarter).not.toHaveBeenCalled();
    expect(effects.onSubmitted).not.toHaveBeenCalled();
    expect(effects.handleError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message }),
      }),
    );
  });

  it('passes the selected destination token and recipient to the execution boundary', async () => {
    const effects = callbacks();
    const submission = snapshot();
    submission.destinationTokenAddress = '0x4444444444444444444444444444444444444444';
    submission.destinationAddress = '0x5555555555555555555555555555555555555555';
    vi.mocked(resolveLifiTransferStarter).mockResolvedValue({ transfer: async () => ({}) });
    await executeLifiTransfer(submission, effects);
    expect(resolveLifiTransferStarter).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceChainId: submission.networks.sourceChain.id,
        destinationChainId: submission.networks.destinationChain.id,
        destinationTokenAddress: submission.destinationTokenAddress,
        destinationAddress: submission.destinationAddress,
        amountBigNumber: submission.amountBigNumber,
      }),
    );
  });

  it.each([
    '0x52908400098527886E0F7030069857D2E4169EE7',
    '52908400098527886E0F7030069857D2E4169EE7',
    utils.getIcapAddress('0x52908400098527886E0F7030069857D2E4169EE7'),
  ])('canonicalizes a validated EVM recipient %s', async (destinationAddress) => {
    const effects = callbacks();
    vi.mocked(resolveLifiTransferStarter).mockResolvedValue({ transfer: async () => ({}) });
    await executeLifiTransfer({ ...snapshot(), destinationAddress }, effects);
    expect(resolveLifiTransferStarter).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationAddress: '0x52908400098527886e0f7030069857d2e4169ee7',
      }),
    );
    expect(effects.notifyError).not.toHaveBeenCalled();
  });

  it('preserves the case of a validated Solana recipient', async () => {
    const submission = snapshot();
    const destinationAddress = 'So11111111111111111111111111111111111111112';
    submission.networks.destinationChain = solanaChain;
    submission.destinationAddress = destinationAddress;
    vi.mocked(resolveLifiTransferStarter).mockResolvedValue({ transfer: async () => ({}) });
    const effects = callbacks();
    await executeLifiTransfer(submission, effects);
    expect(resolveLifiTransferStarter).toHaveBeenCalledWith(
      expect.objectContaining({ destinationAddress }),
    );
    expect(effects.notifyError).not.toHaveBeenCalled();
  });

  it.each(['complete', 'error'] as const)(
    'observes a balance refresh rejection after route %s without failing the submitted transfer',
    async (event) => {
      const effects = callbacks();
      const refreshFailure = new Error('balance RPC unavailable');
      vi.mocked(effects.refreshTokenBalances).mockRejectedValue(refreshFailure);
      let routeCallbacks:
        | Parameters<Awaited<ReturnType<typeof resolveLifiTransferStarter>>['transfer']>[0]
        | undefined;
      vi.mocked(resolveLifiTransferStarter).mockResolvedValue({
        transfer: async (callbacks) => {
          routeCallbacks = callbacks;
          return {};
        },
      });
      await executeLifiTransfer(snapshot(), effects);
      if (!routeCallbacks) throw new Error('Missing route callbacks');
      if (event === 'complete') {
        routeCallbacks.onRouteExecutionComplete?.(lifiRoute().protocolData.route);
      } else {
        routeCallbacks.onRouteExecutionError({ code: 4001 }, undefined);
      }
      await vi.waitFor(() =>
        expect(effects.handleError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: refreshFailure,
            label: 'lifi_balance_refresh',
            category: 'network_request',
          }),
        ),
      );
      expect(effects.onSubmitted).toHaveBeenCalledOnce();
      expect(effects.notifyError).not.toHaveBeenCalled();
      expect(effects.removeLifiTransactionFromCache).not.toHaveBeenCalled();
    },
  );

  it('observes a pending-history RPC rejection while preserving the submitted route cache', async () => {
    const context = lifiRoute();
    const route = context.protocolData.route;
    const historyFailure = new Error('status RPC unavailable');
    const effects = callbacks();
    effects.updatePendingTransaction = vi.fn(async () => {
      throw historyFailure;
    });
    vi.mocked(resolveLifiTransferStarter).mockResolvedValue({
      transfer: async (callbacks) => {
        callbacks.onRouteUpdate?.(route);
        callbacks.onRouteUpdate?.(route);
        return {};
      },
    });
    await executeLifiTransfer(snapshot(context), effects);
    await vi.waitFor(() =>
      expect(effects.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: historyFailure,
          label: 'lifi_history_update',
          category: 'network_request',
        }),
      ),
    );
    expect(effects.addPendingTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ txId: createMockLifiBatchedTransaction().txId }),
    );
    expect(effects.updateLifiTransactionInCache).toHaveBeenCalledOnce();
    expect(effects.notifyError).not.toHaveBeenCalled();
    expect(effects.removeLifiTransactionFromCache).not.toHaveBeenCalled();
  });

  it('reports the route failure separately when refreshing balances also fails', async () => {
    const context = lifiRoute();
    const routeFailure = new Error('route execution failed');
    const refreshFailure = new Error('balance RPC unavailable');
    const effects = callbacks();
    vi.mocked(effects.refreshTokenBalances).mockRejectedValue(refreshFailure);
    vi.mocked(resolveLifiTransferStarter).mockResolvedValue({
      transfer: async (callbacks) => {
        callbacks.onRouteUpdate?.(context.protocolData.route);
        callbacks.onRouteExecutionError(routeFailure, context.protocolData.route);
        return {};
      },
    });
    await executeLifiTransfer(snapshot(context), effects);
    expect(effects.handleError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: routeFailure,
        label: 'lifi_route_execution',
        category: 'token_transfer',
      }),
    );
    expect(effects.notifyError).toHaveBeenCalledOnce();
    await vi.waitFor(() =>
      expect(effects.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: refreshFailure,
          label: 'lifi_balance_refresh',
          category: 'network_request',
        }),
      ),
    );
    expect(effects.addLifiTransactionToCache).toHaveBeenCalledOnce();
    expect(effects.removeLifiTransactionFromCache).not.toHaveBeenCalled();
  });
});
