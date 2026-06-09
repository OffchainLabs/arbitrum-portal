import { getStepTransaction } from '@lifi/sdk';
import { switchChain } from '@wagmi/core';
import { BigNumber, utils } from 'ethers';
import React, { useEffect, useMemo, useState } from 'react';
import { zeroAddress } from 'viem';
import { useConfig } from 'wagmi';

import type {
  LifiCrosschainTransfersRoute,
  Order,
  TransactionRequest,
} from '@/bridge/app/api/crosschain-transfers/lifi';
import { ChainId } from '@/bridge/types/ChainId';

import {
  solanaNativeTokenAddress,
  solanaUsdcTokenAddress,
  solanaUsdtTokenAddress,
} from '../../app/api/crosschain-transfers/utils';
import { useLifiCrossTransfersRoute } from '../../hooks/useLifiCrossTransferRoute';
import { useNetworks } from '../../hooks/useNetworks';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { useTokenBalances } from '../../wallet/hooks/useTokenBalances';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { useWallets } from '../../wallet/hooks/useWallets';
import type { FetchBalanceResult, WalletHandle } from '../../wallet/types';
import { Button } from '../common/Button';
import { Loader } from '../common/atoms/Loader';

type PocBridgeToken = {
  symbol: string;
  address: string;
  decimals: number;
};

const chainConfigs = {
  [ChainId.Solana]: {
    label: 'Solana',
    tokens: [
      { symbol: 'SOL', address: solanaNativeTokenAddress, decimals: 9 },
      { symbol: 'USDC', address: solanaUsdcTokenAddress, decimals: 6 },
      { symbol: 'USDT', address: solanaUsdtTokenAddress, decimals: 6 },
    ],
  },
  [ChainId.Ethereum]: {
    label: 'Ethereum',
    tokens: [
      { symbol: 'ETH', address: zeroAddress, decimals: 18 },
      { symbol: 'USDC', address: CommonAddress.Ethereum.USDC, decimals: 6 },
      { symbol: 'USDT', address: CommonAddress.Ethereum.USDT, decimals: 6 },
    ],
  },
  [ChainId.ArbitrumOne]: {
    label: 'Arbitrum One',
    tokens: [
      { symbol: 'ETH', address: zeroAddress, decimals: 18 },
      { symbol: 'USDC', address: CommonAddress.ArbitrumOne.USDC, decimals: 6 },
      { symbol: 'USDT', address: CommonAddress.ArbitrumOne.USDT, decimals: 6 },
    ],
  },
} as const satisfies Partial<Record<ChainId, { label: string; tokens: readonly PocBridgeToken[] }>>;

type PocChainId = keyof typeof chainConfigs;

function getFirstBridgeToken(chainId: PocChainId): PocBridgeToken {
  const token = chainConfigs[chainId].tokens[0];

  if (!token) {
    throw new Error(`Missing PoC token config for chain: ${chainId}`);
  }

  return token;
}

const pocTransferPresets = [
  {
    id: 'solana-to-arbitrum',
    label: 'Solana -> EVM',
    sourceChainId: ChainId.Solana,
    destinationChainId: ChainId.ArbitrumOne,
  },
  {
    id: 'arbitrum-to-solana',
    label: 'EVM -> Solana',
    sourceChainId: ChainId.ArbitrumOne,
    destinationChainId: ChainId.Solana,
  },
  {
    id: 'ethereum-to-arbitrum',
    label: 'EVM -> EVM',
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.ArbitrumOne,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  sourceChainId: PocChainId;
  destinationChainId: PocChainId;
}[];

type PocTransferPreset = (typeof pocTransferPresets)[number];
type PocTransferPresetId = PocTransferPreset['id'];

function truncateAddress(address?: string) {
  if (!address) {
    return 'Not connected';
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBalance(balance: BigNumber | undefined, decimals: number) {
  if (!balance) {
    return '0';
  }

  try {
    return utils.formatUnits(balance, decimals);
  } catch {
    return '0';
  }
}

function WalletCard({
  chainId,
  label,
  wallet,
  openConnectModal,
}: {
  chainId: PocChainId;
  label: string;
  wallet: WalletHandle;
  openConnectModal: (chainId: ChainId) => void;
}) {
  const chainLabel = chainConfigs[chainId].label;

  return (
    <div className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-white/50">{label} Wallet</p>
        <span className="text-[11px] uppercase tracking-wide text-white/40">{chainLabel}</span>
      </div>
      <p className="text-xs text-white/60">{wallet.account.walletInfo?.name ?? 'Unknown wallet'}</p>
      <p className="text-xs text-white/60">{truncateAddress(wallet.account.address)}</p>
      <Button
        variant="secondary"
        className="w-full justify-center"
        onClick={() => (wallet.isConnected ? wallet.disconnect() : openConnectModal(chainId))}
      >
        {wallet.isConnected
          ? truncateAddress(wallet.account.address)
          : `Connect ${chainLabel} Wallet`}
      </Button>
    </div>
  );
}

function BalanceCard({
  balances,
  chainId,
  error,
  label,
  tokens,
}: {
  balances: FetchBalanceResult | undefined;
  chainId: PocChainId;
  error: Error | undefined;
  label: string;
  tokens: readonly PocBridgeToken[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-white/10 bg-black/30 p-3">
      <p className="text-xs uppercase tracking-wide text-white/50">
        {label} Balances ({chainConfigs[chainId].label})
      </p>
      {error ? (
        <p className="text-sm text-red-400">{error.message}</p>
      ) : (
        tokens.map((token) => (
          <div key={token.address} className="flex items-center justify-between text-sm">
            <span>{token.symbol}</span>
            <span>{formatBalance(balances?.[token.address], token.decimals)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function getPreferredRoute(
  routes: LifiCrosschainTransfersRoute[] | undefined,
): LifiCrosschainTransfersRoute | undefined {
  if (!routes?.length) {
    return undefined;
  }

  return (
    routes.find((route) => route.protocolData.orders.includes('CHEAPEST' as Order)) ?? routes[0]
  );
}

function getEvmTransactionPayload(transactionRequest: unknown): TransactionRequest {
  if (!transactionRequest) {
    throw new Error('EVM transaction payload is missing.');
  }

  return transactionRequest as TransactionRequest;
}

function getSolanaTransactionPayload(transactionRequest: unknown): string {
  if (
    typeof transactionRequest !== 'object' ||
    transactionRequest === null ||
    !('data' in transactionRequest) ||
    typeof transactionRequest.data !== 'string'
  ) {
    throw new Error('Solana transaction payload is missing.');
  }

  return transactionRequest.data;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to execute transfer.';
}

export function SolanaPocTransferPanel({
  initialPresetId = pocTransferPresets[0].id,
}: {
  initialPresetId?: PocTransferPresetId;
}) {
  const [selectedPresetId, setSelectedPresetId] = useState<PocTransferPresetId>(initialPresetId);

  const selectedPreset = useMemo(
    () =>
      pocTransferPresets.find((preset) => preset.id === selectedPresetId) ?? pocTransferPresets[0],
    [selectedPresetId],
  );

  const [networks, setNetworks] = useNetworks();

  useEffect(() => {
    if (
      networks.sourceChain.id !== selectedPreset.sourceChainId ||
      networks.destinationChain.id !== selectedPreset.destinationChainId
    ) {
      setNetworks({
        sourceChainId: selectedPreset.sourceChainId,
        destinationChainId: selectedPreset.destinationChainId,
      });
    }
  }, [
    networks.destinationChain.id,
    networks.sourceChain.id,
    selectedPreset.destinationChainId,
    selectedPreset.sourceChainId,
    setNetworks,
  ]);

  const isPoCNetworkReady =
    networks.sourceChain.id === selectedPreset.sourceChainId &&
    networks.destinationChain.id === selectedPreset.destinationChainId;

  if (!isPoCNetworkReady) {
    return (
      <div className="flex flex-col gap-4 rounded border border-white/10 bg-[#0b0d12] p-4 text-white">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-white/50">
            Solana Wallet Interactions PoC
          </p>
          <p className="text-sm text-white/70">Initializing PoC networks...</p>
        </div>
      </div>
    );
  }

  return (
    <SolanaPocTransferPanelContent
      key={selectedPreset.id}
      selectedPreset={selectedPreset}
      onSelectPreset={setSelectedPresetId}
    />
  );
}

function SolanaPocTransferPanelContent({
  selectedPreset,
  onSelectPreset,
}: {
  selectedPreset: PocTransferPreset;
  onSelectPreset: (presetId: PocTransferPresetId) => void;
}) {
  const { openConnectModal } = useWalletModal();
  const { sourceWallet, destinationWallet } = useWallets();
  const wagmiConfig = useConfig();
  const { sourceChainId, destinationChainId } = selectedPreset;
  const sourceConfig = chainConfigs[sourceChainId];
  const destinationConfig = chainConfigs[destinationChainId];
  const sourceTokens = sourceConfig.tokens;
  const destinationTokens = destinationConfig.tokens;
  const fromToken = getFirstBridgeToken(sourceChainId);
  const toToken = getFirstBridgeToken(destinationChainId);

  const [amount, setAmount] = useState('');
  const [destinationAddressOverride, setDestinationAddressOverride] = useState<string>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string>();
  const [transactionHash, setTransactionHash] = useState<string>();
  const destinationAddress = destinationAddressOverride ?? destinationWallet.account.address ?? '';

  const fromAmount = useMemo(() => {
    try {
      return utils.parseUnits(amount || '0', fromToken.decimals).toString();
    } catch {
      return '0';
    }
  }, [amount, fromToken.decimals]);

  const { data: sourceBalances, error: sourceBalanceError } = useTokenBalances({
    chainId: sourceChainId,
    walletAddress: sourceWallet.account.address,
    tokenAddresses: sourceTokens.map(({ address }) => address),
  });

  const { data: destinationBalances, error: destinationBalanceError } = useTokenBalances({
    chainId: destinationChainId,
    walletAddress: destinationWallet.account.address,
    tokenAddresses: destinationTokens.map(({ address }) => address),
  });

  const {
    data: routes,
    isLoading: isLoadingRoutes,
    error: routesError,
  } = useLifiCrossTransfersRoute({
    enabled: sourceWallet.isConnected && fromAmount !== '0' && destinationAddress.length > 0,
    fromAmount,
    fromToken: fromToken.address,
    toToken: toToken.address,
    fromChainId: sourceChainId,
    toChainId: destinationChainId,
    fromAddress: sourceWallet.account.address,
    toAddress: destinationAddress,
    slippage: '0.005',
  });

  const selectedRoute = useMemo(() => getPreferredRoute(routes), [routes]);

  const canRequestRoute =
    sourceWallet.isConnected && fromAmount !== '0' && destinationAddress.length > 0;

  const executeTransfer = async () => {
    if (!selectedRoute) {
      return;
    }

    setIsExecuting(true);
    setExecutionError(undefined);

    try {
      const { transactionRequest } = await getStepTransaction(selectedRoute.protocolData.step);

      if (sourceWallet.account.chain?.id !== sourceChainId) {
        await switchChain(wagmiConfig, { chainId: sourceChainId });
      }

      const result =
        sourceWallet.ecosystem === 'solana'
          ? await sourceWallet.sendTransaction({
              ecosystem: 'solana',
              serializedTransaction: getSolanaTransactionPayload(transactionRequest),
            })
          : await sourceWallet.sendTransaction({
              ecosystem: 'evm',
              txRequest: getEvmTransactionPayload(transactionRequest),
            });

      setTransactionHash(result.hash);
      await result.wait?.();
    } catch (error) {
      setExecutionError(getErrorMessage(error));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded border border-white/10 bg-[#0b0d12] p-4 text-white">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-white/50">
          Solana Wallet Interactions PoC
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {pocTransferPresets.map((preset) => {
          const isSelected = preset.id === selectedPreset.id;

          return (
            <button
              key={preset.id}
              type="button"
              className={`rounded border px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-white/10 bg-black/20 text-white/70 hover:border-white/30 hover:text-white'
              }`}
              onClick={() => {
                setTransactionHash(undefined);
                onSelectPreset(preset.id);
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <WalletCard
          chainId={sourceChainId}
          label="Source"
          wallet={sourceWallet}
          openConnectModal={openConnectModal}
        />
        <WalletCard
          chainId={destinationChainId}
          label="Destination"
          wallet={destinationWallet}
          openConnectModal={openConnectModal}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <BalanceCard
          balances={sourceBalances}
          chainId={sourceChainId}
          error={sourceBalanceError}
          label="Source"
          tokens={sourceTokens}
        />
        <BalanceCard
          balances={destinationBalances}
          chainId={destinationChainId}
          error={destinationBalanceError}
          label="Destination"
          tokens={destinationTokens}
        />
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-3">
        <div className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white/70">
          {sourceConfig.label} {fromToken.symbol} {'->'} {destinationConfig.label} {toToken.symbol}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>Amount ({fromToken.symbol})</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
            placeholder="0.01"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Destination Address ({destinationConfig.label})</span>
          <input
            value={destinationAddress}
            onChange={(event) => setDestinationAddressOverride(event.target.value)}
            className="rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
            placeholder={destinationChainId === ChainId.Solana ? 'Base58...' : '0x...'}
          />
        </label>

        {isLoadingRoutes ? (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Loader size="small" color="white" />
            <span>Fetching route...</span>
          </div>
        ) : null}

        {routesError ? <p className="text-sm text-red-400">{routesError.message}</p> : null}
        {executionError ? <p className="text-sm text-red-400">{executionError}</p> : null}
        {!routesError && !isLoadingRoutes && !selectedRoute && canRequestRoute ? (
          <p className="text-sm text-white/70">No route available for the current inputs.</p>
        ) : null}
        {!routesError && !isLoadingRoutes && !selectedRoute && !canRequestRoute ? (
          <p className="text-sm text-white/70">
            Connect wallets, enter an amount, and provide a destination address.
          </p>
        ) : null}

        {selectedRoute ? (
          <div className="flex flex-col gap-1 rounded border border-white/10 bg-black/40 p-3 text-sm">
            <div>Tool: {selectedRoute.protocolData.tool.name}</div>
            <div>
              To amount: {utils.formatUnits(selectedRoute.toAmount.amount, toToken.decimals)}{' '}
              {toToken.symbol}
            </div>
          </div>
        ) : null}

        {transactionHash ? (
          <p className="break-all text-sm text-white/70">Last transaction: {transactionHash}</p>
        ) : null}

        <Button
          data-testid="solana-poc-execute-transfer"
          variant="primary"
          className="w-full justify-center"
          disabled={!selectedRoute || !sourceWallet.isConnected}
          loading={isExecuting}
          onClick={executeTransfer}
        >
          Execute Transfer
        </Button>
      </div>
    </div>
  );
}
