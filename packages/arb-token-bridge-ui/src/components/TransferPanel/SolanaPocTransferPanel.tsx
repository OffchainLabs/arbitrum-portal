import { getStepTransaction } from '@lifi/sdk';
import { BigNumber, utils } from 'ethers';
import React, { useEffect, useMemo, useState } from 'react';
import { zeroAddress } from 'viem';

import type {
  LifiCrosschainTransfersRoute,
  Order,
} from '@/bridge/app/api/crosschain-transfers/lifi';
import { ChainId } from '@/bridge/types/ChainId';

import {
  solanaNativeTokenAddress,
  solanaUsdcTokenAddress,
  solanaUsdtTokenAddress,
} from '../../app/api/crosschain-transfers/utils';
import { useLifiCrossTransfersRoute } from '../../hooks/useLifiCrossTransferRoute';
import { useNetworks } from '../../hooks/useNetworks';
import { SolanaTransferStarter } from '../../token-bridge-sdk/SolanaTransferStarter';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { useSigners } from '../../wallet/hooks/useSigners';
import { useTokenBalances } from '../../wallet/hooks/useTokenBalances';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { useWallets } from '../../wallet/hooks/useWallets';
import { Button } from '../common/Button';
import { Loader } from '../common/atoms/Loader';

type PocBridgeToken = {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
};

const sourceBridgeTokens = [
  {
    symbol: 'SOL',
    address: solanaNativeTokenAddress,
    decimals: 9,
    chainId: ChainId.Solana,
  },
  {
    symbol: 'USDC',
    address: solanaUsdcTokenAddress,
    decimals: 6,
    chainId: ChainId.Solana,
  },
  {
    symbol: 'USDT',
    address: solanaUsdtTokenAddress,
    decimals: 6,
    chainId: ChainId.Solana,
  },
] as const satisfies readonly PocBridgeToken[];

const destinationBridgeTokens = [
  {
    symbol: 'ETH',
    address: zeroAddress,
    decimals: 18,
    chainId: ChainId.ArbitrumOne,
  },
  {
    symbol: 'USDC',
    address: CommonAddress.ArbitrumOne.USDC,
    decimals: 6,
    chainId: ChainId.ArbitrumOne,
  },
  {
    symbol: 'USDT',
    address: CommonAddress.ArbitrumOne.USDT,
    decimals: 6,
    chainId: ChainId.ArbitrumOne,
  },
] as const satisfies readonly PocBridgeToken[];

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

export function SolanaPocTransferPanel() {
  const sourceChainId = sourceBridgeTokens[0].chainId;
  const destinationChainId = destinationBridgeTokens[0].chainId;
  const [networks, setNetworks] = useNetworks();

  useEffect(() => {
    if (
      networks.sourceChain.id !== sourceChainId ||
      networks.destinationChain.id !== destinationChainId
    ) {
      setNetworks({
        sourceChainId,
        destinationChainId,
      });
    }
  }, [
    destinationChainId,
    networks.destinationChain.id,
    networks.sourceChain.id,
    setNetworks,
    sourceChainId,
  ]);

  const isPoCNetworkReady =
    networks.sourceChain.id === sourceChainId &&
    networks.destinationChain.id === destinationChainId;

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
      sourceChainId={sourceChainId}
      destinationChainId={destinationChainId}
    />
  );
}

function SolanaPocTransferPanelContent({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}) {
  const { openConnectModal } = useWalletModal();
  const { sourceWallet, destinationWallet } = useWallets();
  const { sourceSigner } = useSigners();

  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [hasEditedDestination, setHasEditedDestination] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>();

  useEffect(() => {
    if (!hasEditedDestination && destinationWallet.account.address) {
      setDestinationAddress(destinationWallet.account.address);
    }
  }, [destinationWallet.account.address, hasEditedDestination]);

  const isDestinationAddressValid = useMemo(
    () => destinationAddress.length > 0 && utils.isAddress(destinationAddress),
    [destinationAddress],
  );

  const fromAmount = useMemo(() => {
    try {
      return utils.parseUnits(amount || '0', 9).toString();
    } catch {
      return '0';
    }
  }, [amount]);

  const { data: sourceBalances, error: sourceBalanceError } = useTokenBalances({
    chainId: sourceChainId,
    walletAddress: sourceWallet.account.address,
    tokenAddresses: sourceBridgeTokens.map(({ address }) => address),
  });

  const { data: destinationBalances, error: destinationBalanceError } = useTokenBalances({
    chainId: destinationChainId,
    walletAddress: destinationWallet.account.address,
    tokenAddresses: destinationBridgeTokens.map(({ address }) => address),
  });

  const {
    data: routes,
    isLoading: isLoadingRoutes,
    error: routesError,
  } = useLifiCrossTransfersRoute({
    enabled: sourceWallet.isConnected && isDestinationAddressValid,
    fromAmount,
    fromToken: solanaNativeTokenAddress,
    toToken: zeroAddress,
    fromChainId: sourceChainId,
    toChainId: destinationChainId,
    fromAddress: sourceWallet.account.address,
    toAddress: destinationAddress,
    slippage: '0.003',
  });

  const selectedRoute = useMemo(() => getPreferredRoute(routes), [routes]);

  const routeHint = useMemo(() => {
    if (routesError || isLoadingRoutes || selectedRoute) {
      return null;
    }

    if (!sourceWallet.isConnected) {
      return 'Connect the source wallet to fetch a route.';
    }

    if (fromAmount === '0') {
      return 'Enter an amount to fetch a route.';
    }

    if (!destinationAddress.length) {
      return 'Enter a destination address to fetch a route.';
    }

    if (!isDestinationAddressValid) {
      return 'Enter a valid Arbitrum One address.';
    }

    return 'No route available for the current inputs.';
  }, [
    destinationAddress.length,
    fromAmount,
    isDestinationAddressValid,
    isLoadingRoutes,
    routesError,
    selectedRoute,
    sourceWallet.isConnected,
  ]);

  const executeTransfer = async () => {
    if (!selectedRoute) {
      return;
    }

    setIsExecuting(true);

    try {
      const { transactionRequest } = await getStepTransaction(selectedRoute.protocolData.step);
      const serializedTransaction = transactionRequest?.data;

      if (!serializedTransaction) {
        throw new Error('LI.FI did not return a Solana transaction payload.');
      }

      const starter = new SolanaTransferStarter();
      const result = await starter.transfer({
        signer: sourceSigner,
        serializedTransaction,
      });

      setTransactionHash(result.hash);
      await result.wait?.();
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
        <p className="text-sm text-white/70">
          Hardcoded flow: native SOL on Solana to native ETH on Arbitrum One.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Source Wallet</p>
          <p className="text-sm">Source</p>
          <p className="text-xs text-white/60">{truncateAddress(sourceWallet.account.address)}</p>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() =>
              sourceWallet.isConnected ? sourceWallet.disconnect() : openConnectModal(sourceChainId)
            }
          >
            {sourceWallet.isConnected ? 'Disconnect Source Wallet' : 'Connect Source Wallet'}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Destination Wallet</p>
          <p className="text-sm">Destination</p>
          <p className="text-xs text-white/60">
            {truncateAddress(destinationWallet.account.address)}
          </p>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() =>
              destinationWallet.isConnected
                ? destinationWallet.disconnect()
                : openConnectModal(destinationChainId)
            }
          >
            {destinationWallet.isConnected
              ? 'Disconnect Destination Wallet'
              : 'Connect Destination Wallet'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded border border-white/10 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Source Balances</p>
          {sourceBalanceError ? (
            <p className="text-sm text-red-400">{sourceBalanceError.message}</p>
          ) : (
            sourceBridgeTokens.map((token) => (
              <div key={token.address} className="flex items-center justify-between text-sm">
                <span>{token.symbol}</span>
                <span>{formatBalance(sourceBalances?.[token.address], token.decimals)}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 rounded border border-white/10 bg-black/30 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Destination Balances</p>
          {destinationBalanceError ? (
            <p className="text-sm text-red-400">{destinationBalanceError.message}</p>
          ) : (
            destinationBridgeTokens.map((token) => (
              <div key={token.address} className="flex items-center justify-between text-sm">
                <span>{token.symbol}</span>
                <span>{formatBalance(destinationBalances?.[token.address], token.decimals)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/10 bg-black/30 p-3">
        <p className="text-xs uppercase tracking-wide text-white/50">Transfer</p>

        <label className="flex flex-col gap-1 text-sm">
          <span>Amount (SOL)</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
            placeholder="0.01"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Destination Address (Arbitrum One)</span>
          <input
            value={destinationAddress}
            onChange={(event) => {
              setHasEditedDestination(true);
              setDestinationAddress(event.target.value);
            }}
            className="rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
            placeholder="0x..."
          />
        </label>

        {isLoadingRoutes ? (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Loader size="small" color="white" />
            <span>Fetching route...</span>
          </div>
        ) : null}

        {routesError ? <p className="text-sm text-red-400">{routesError.message}</p> : null}
        {routeHint ? <p className="text-sm text-white/70">{routeHint}</p> : null}

        {selectedRoute ? (
          <div className="flex flex-col gap-1 rounded border border-white/10 bg-black/40 p-3 text-sm">
            <div>Tool: {selectedRoute.protocolData.tool.name}</div>
            <div>To amount: {utils.formatUnits(selectedRoute.toAmount.amount, 18)} ETH</div>
          </div>
        ) : null}

        {transactionHash ? (
          <p className="text-sm text-white/70 break-all">Last transaction: {transactionHash}</p>
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
