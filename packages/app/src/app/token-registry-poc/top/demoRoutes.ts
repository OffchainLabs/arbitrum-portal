import { BigNumber, utils } from 'ethers';

import { DestinationOption, TopToken } from '@/app/src/token-registry/registryFiles';
import { NATIVE_TOKEN_ADDRESS } from '@/app/src/token-registry/types';
import type {
  LifiCrosschainTransfersRoute,
  PreferredLifiRoutes,
} from '@/bridge/app/api/crosschain-transfers/lifi';
import type { RouteCost } from '@/bridge/app/api/crosschain-transfers/types';
import { getDepositDuration, getWithdrawalDuration } from '@/bridge/hooks/useTransferDuration';
import { fetchEvmNativeCurrency } from '@/bridge/services/evm/nativeCurrency';
import { BridgeTransferStarterFactory } from '@/bridge/token-bridge-sdk/BridgeTransferStarterFactory';
import { DEFAULT_GAS_PRICE_PERCENT_INCREASE } from '@/bridge/token-bridge-sdk/Erc20DepositStarter';
import { OftV2TransferStarter } from '@/bridge/token-bridge-sdk/OftV2TransferStarter';
import { getProviderForChainId, percentIncrease } from '@/bridge/token-bridge-sdk/utils';
import {
  getNovaDepositBlockReason,
  getNovaEthDepositCapErrorMessage,
  getNovaEthOnlyDepositErrorMessage,
} from '@/bridge/util/NovaUtils';
import { getNetworksRelationship } from '@/bridge/util/getNetworksRelationship';
import { isNetwork } from '@/bridge/util/networks';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';

export type DemoRoute = {
  id: string;
  name: string;
  icon: string;
  amountOut: string;
  minimumOut: string;
  durationMs?: number;
  gas: RouteCost[];
  fee: RouteCost[];
  estimateError?: string;
  quotedAt: number;
} & (
  | { kind: 'canonical' | 'layerzero'; withdrawal: boolean }
  | { kind: 'lifi'; quote: LifiCrosschainTransfersRoute }
);

export type QuoteRequest = {
  source: TopToken;
  destination: TopToken;
  amount: string;
  sender?: string;
  recipient?: string;
  slippage: string;
};

export function starterProps({
  source,
  destination,
}: Pick<QuoteRequest, 'source' | 'destination'>) {
  return {
    sourceChainId: source.chainId,
    destinationChainId: destination.chainId,
    sourceChainErc20Address: source.address === NATIVE_TOKEN_ADDRESS ? undefined : source.address,
    destinationChainErc20Address:
      destination.address === NATIVE_TOKEN_ADDRESS ? undefined : destination.address,
  };
}

export async function fetchRoutes([, request]: readonly [string, QuoteRequest]) {
  const { source, destination, amount, sender, recipient, slippage } = request;
  const novaBlock = getNovaDepositBlockReason({
    destinationChainId: destination.chainId,
    selectedTokenAddress: source.address,
    destinationTokenAddress: destination.address,
    amount: BigNumber.from(amount),
  });
  if (novaBlock)
    throw new Error(
      novaBlock === 'eth-only'
        ? getNovaEthOnlyDepositErrorMessage()
        : getNovaEthDepositCapErrorMessage(),
    );
  const response = await fetch('/api/token-registry/files/destination-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceChainId: source.chainId,
      sourceToken: source.address,
      candidates: [destination],
    }),
  });
  if (!response.ok) throw new Error('Could not check this route. Retry.');
  const eligibility: { tokens: DestinationOption[] } = await response.json();
  const providers = eligibility.tokens[0]?.providers ?? [];
  const requests: Promise<DemoRoute[]>[] = [];
  if (providers.includes('lifi'))
    requests.push(
      (async () => {
        const params = new URLSearchParams({
          fromChainId: String(source.chainId),
          toChainId: String(destination.chainId),
          fromToken: source.address,
          toToken: destination.address,
          fromAmount: amount,
          slippage,
        });
        if (sender) params.set('fromAddress', sender);
        if (recipient) params.set('toAddress', recipient);
        const response = await fetch(`/api/crosschain-transfers/lifi?${params}`);
        const result: { data?: PreferredLifiRoutes; message?: string } = await response.json();
        if (!response.ok || !result.data)
          throw new Error(result.message ?? 'Route provider did not respond.');
        return result.data.map(
          (quote): DemoRoute => ({
            kind: 'lifi',
            id: quote.protocolData.route.id,
            quote,
            name: [
              ...new Set(quote.protocolData.route.steps.map((step) => step.toolDetails.name)),
            ].join(' + '),
            icon:
              quote.protocolData.route.steps[0]?.toolDetails.logoURI ??
              '/token-registry-poc/demo/tool-lifi.svg',
            amountOut: quote.toAmount.amount,
            minimumOut: quote.protocolData.route.toAmountMin,
            durationMs: quote.durationMs,
            gas: quote.gas,
            fee: quote.fee,
            quotedAt: Date.now(),
          }),
        );
      })(),
    );
  if (providers.includes('canonical') || providers.includes('layerzero'))
    requests.push(
      (async () => {
        const starter = BridgeTransferStarterFactory.create(starterProps(request));
        const oft = starter instanceof OftV2TransferStarter;
        const { parentChainId, childChainId, isDepositMode } = getNetworksRelationship({
          sourceChainId: source.chainId,
          destinationChainId: destination.chainId,
        });
        const { isTestnet } = isNetwork(childChainId);
        const route: DemoRoute = {
          kind: oft ? 'layerzero' : 'canonical',
          id: oft ? 'layerzero' : 'canonical',
          name: oft ? 'LayerZero' : 'Arbitrum Bridge',
          icon: `/token-registry-poc/demo/tool-${oft ? 'layerzero' : 'arbitrum'}.svg`,
          amountOut: utils
            .parseUnits(utils.formatUnits(amount, source.decimals), destination.decimals)
            .toString(),
          minimumOut: utils
            .parseUnits(utils.formatUnits(amount, source.decimals), destination.decimals)
            .toString(),
          withdrawal: !oft && !isDepositMode,
          durationMs: oft
            ? undefined
            : 60_000 *
              (isDepositMode
                ? getDepositDuration({ parentChainId, isTestnet })
                : getWithdrawalDuration({ createdAt: Date.now(), sourceChainId: source.chainId })),
          gas: [],
          fee: [],
          quotedAt: Date.now(),
        };
        if (!sender) {
          route.estimateError = 'Connect your wallet to estimate network costs.';
          return [route];
        }
        try {
          const estimateProps = {
            amount: BigNumber.from(amount),
            from: sender,
            destinationAddress: recipient,
            wagmiConfig,
          };
          const estimates = await starter.transferEstimateGas(estimateProps);
          if (!estimates || estimates.isError)
            throw new Error('Network cost could not be estimated.');
          route.gas = await Promise.all(
            [parentChainId, childChainId].map(async (chainId): Promise<RouteCost> => {
              const provider = getProviderForChainId(chainId);
              const [price, native] = await Promise.all([
                provider.getGasPrice(),
                fetchEvmNativeCurrency({ provider }),
              ]);
              const units =
                chainId === parentChainId
                  ? estimates.estimatedParentChainGas
                  : estimates.estimatedChildChainGas;
              const cost =
                chainId === childChainId &&
                isDepositMode &&
                'estimatedChildChainSubmissionCost' in estimates
                  ? units
                      .mul(percentIncrease(price, DEFAULT_GAS_PRICE_PERCENT_INCREASE))
                      .add(estimates.estimatedChildChainSubmissionCost)
                  : units.mul(price);
              return {
                amount: cost.toString(),
                chainId,
                token: { ...native, address: NATIVE_TOKEN_ADDRESS, logoURI: native.logoUrl },
                details: {
                  id: `gas-${chainId}`,
                  label:
                    chainId === source.chainId ? 'Source network fee' : 'Destination network fee',
                  via: route.name,
                },
              };
            }),
          );
          if (oft) {
            const fee = await starter.transferEstimateFee(estimateProps);
            const native = await fetchEvmNativeCurrency({ provider: starter.sourceChainProvider });
            route.fee = [
              {
                amount: fee.estimatedSourceChainFee.toString(),
                chainId: source.chainId,
                token: { ...native, address: NATIVE_TOKEN_ADDRESS },
                details: { id: 'messaging', label: 'Messaging fee', via: 'LayerZero' },
              },
            ];
          }
        } catch (error) {
          route.estimateError = error instanceof Error ? error.message : 'Network estimate failed.';
        }
        return [route];
      })(),
    );
  const settled = await Promise.allSettled(requests);
  const routes = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const errors = settled.flatMap((result) =>
    result.status === 'rejected'
      ? [result.reason instanceof Error ? result.reason.message : 'Provider request failed.']
      : [],
  );
  return { routes, errors };
}
