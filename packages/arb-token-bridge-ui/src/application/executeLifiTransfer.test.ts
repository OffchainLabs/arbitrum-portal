import { ChainId as LifiChainId, type RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { arbitrum } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { AssetType } from '../hooks/arbTokenBridge.types';
import { createMockLifiRoute } from '../test-utils/lifi';
import { SolanaTransferStarter } from '../token-bridge-sdk/SolanaTransferStarter';
import { ChainId } from '../types/ChainId';
import { getChainMetadata } from '../util/networkMetadata';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../wallet/constants';
import { executeLifiTransfer } from './executeLifiTransfer';
import type { TransferCallbacks, TransferSubmission } from './executeTransfer';
import { resolveLifiTransferStarter } from './resolveLifiTransferStarter';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

vi.mock('./resolveLifiTransferStarter', () => ({ resolveLifiTransferStarter: vi.fn() }));
vi.mock('../components/TransferPanel/useTransferReadiness', () => ({
  getAmountToPay: () => ({ fromAmountUsd: 1, toAmountUsd: 1 }),
}));
vi.mock('../components/TransferPanel/HighSlippageWarningDialog', () => ({
  getAmountLoss: () => ({ lossPercentage: 0 }),
}));
vi.mock('../components/TransactionHistory/TransactionHistoryDisclaimer', () => ({
  highlightTransactionHistoryDisclaimer: vi.fn(),
}));
vi.mock('../components/common/atoms/Toast', () => ({ errorToast: vi.fn() }));
vi.mock('../util/AnalyticsUtils', async (importActual) => ({
  ...(await importActual<typeof import('../util/AnalyticsUtils')>()),
  trackEvent: vi.fn(),
}));

const solanaAddress = 'So11111111111111111111111111111111111111112';
const destinationAddress = '0x1111111111111111111111111111111111111111';
const signature = '5'.repeat(88);

function lifiRoute(): LifiCrosschainTransfersRoute {
  const sourceToken = {
    address: SOLANA_NATIVE_TOKEN_ADDRESS,
    chainId: LifiChainId.SOL,
    decimals: 9,
    name: 'Solana',
    priceUSD: '100',
    symbol: 'SOL',
  };
  const destinationToken = {
    address: '0x0000000000000000000000000000000000000000',
    chainId: LifiChainId.ARB,
    decimals: 18,
    name: 'Ether',
    priceUSD: '1',
    symbol: 'ETH',
  };
  const step: RouteExtended['steps'][number] = {
    id: 'step',
    type: 'lifi',
    tool: 'mayan',
    toolDetails: { key: 'mayan', name: 'Mayan', logoURI: '' },
    action: {
      fromChainId: ChainId.Solana,
      toChainId: ChainId.ArbitrumOne,
      fromAmount: '1000000000',
      fromToken: sourceToken,
      toToken: destinationToken,
      fromAddress: solanaAddress,
      toAddress: destinationAddress,
    },
    estimate: {
      tool: 'mayan',
      fromAmount: '1000000000',
      fromAmountUSD: '100',
      toAmount: '1000000000000000000',
      toAmountMin: '900000000000000000',
      toAmountUSD: '99',
      approvalAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
      executionDuration: 1,
    },
    includedSteps: [],
  };
  return {
    type: 'lifi',
    durationMs: 1_000,
    gas: [],
    fee: [],
    fromAmount: { amount: step.action.fromAmount, amountUSD: '100', token: sourceToken },
    toAmount: { amount: step.estimate.toAmount, amountUSD: '99', token: destinationToken },
    fromChainId: ChainId.Solana,
    toChainId: ChainId.ArbitrumOne,
    fromAddress: solanaAddress,
    toAddress: destinationAddress,
    protocolData: { route: createMockLifiRoute({ steps: [step] }) },
  };
}

function callbacks(): TransferCallbacks {
  return {
    setTransferring: vi.fn(),
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

function snapshot(context = lifiRoute()): TransferSubmission {
  return {
    networks: {
      sourceChain: getChainMetadata(ChainId.Solana),
      destinationChain: arbitrum,
    },
    childChain: arbitrum,
    parentChain: getChainMetadata(ChainId.Solana),
    sourceWallet: {
      ecosystem: 'solana',
      account: { address: solanaAddress, chainId: ChainId.Solana },
      isConnected: true,
      sendTransaction: vi.fn(async () => signature),
    },
    walletAddress: solanaAddress,
    destinationWalletAddress: destinationAddress,
    selectedToken: null,
    amount: '1',
    amount2: '',
    amountBigNumber: BigNumber.from(1_000_000_000),
    selectedRoute: 'lifi',
    context,
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9, isCustom: false },
    nativeCurrencyDecimalsOnSourceChain: 9,
    warningTokens: {},
    isDepositMode: true,
    isSmartContractWallet: false,
    isBatchTransferSupported: false,
    isSwapTransfer: false,
    isTransferAllowed: true,
  };
}

describe('executeLifiTransfer with Solana', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens history and caches the source signature as soon as it is published', async () => {
    const context = lifiRoute();
    const executedRoute: RouteExtended = {
      ...context.protocolData.route,
      steps: context.protocolData.route.steps.map((step) => ({
        ...step,
        execution: {
          startedAt: 1,
          status: 'PENDING',
          process: [
            {
              type: 'CROSS_CHAIN',
              status: 'PENDING',
              chainId: ChainId.Solana,
              startedAt: 1,
              pendingAt: 1,
              txHash: signature,
            },
          ],
        },
      })),
    };
    const starter = new SolanaTransferStarter({
      lifiRoute: context,
      wallet: { sendTransaction: vi.fn(async () => signature) },
    });
    vi.spyOn(starter, 'transfer').mockImplementation(async (effects) => {
      effects.onRouteUpdate?.(executedRoute);
      return {
        transferType: 'lifi',
        status: 'pending',
        sourceChainTransaction: { hash: signature },
        lifiRoute: executedRoute,
      } satisfies Awaited<ReturnType<SolanaTransferStarter['transfer']>>;
    });
    vi.mocked(resolveLifiTransferStarter).mockResolvedValue({
      ecosystem: 'solana',
      starter,
    });
    const effects = callbacks();
    const submitted = snapshot(context);

    await executeLifiTransfer(submitted, effects);

    expect(resolveLifiTransferStarter).toHaveBeenCalledWith(
      expect.objectContaining({ route: context, wallet: submitted.sourceWallet }),
    );
    expect(effects.resetAmountAndSwitchToTransactionHistoryTab).toHaveBeenCalledOnce();
    expect(effects.clearRoute).toHaveBeenCalledOnce();
    expect(effects.addPendingTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: signature,
        asset: 'SOL',
        assetType: AssetType.ETH,
        tokenAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
        sender: solanaAddress,
      }),
    );
    expect(effects.addLifiTransactionToCache).toHaveBeenCalledWith(
      expect.objectContaining({ txId: signature, lifiRoute: executedRoute }),
    );
  });
});
