import { useDeferredValue, useMemo } from 'react';
import useSWR from 'swr';

import type { LifiParams, PreferredLifiRoutes } from '@/bridge/app/api/crosschain-transfers/lifi';

import { getAPIBaseUrl } from '../util';
import type { Address } from '../util/AddressUtils';
import { parseAddressForChain } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

export type UseLifiCrossTransfersRouteParams = Pick<
  LifiParams,
  'fromAmount' | 'fromToken' | 'toToken' | 'slippage' | 'denyBridges' | 'denyExchanges'
> & {
  enabled?: boolean;
  fromAddress?: Address;
  toAddress: Address | undefined;
  fromChainId: number;
  toChainId: number;
};

export const useLifiCrossTransfersRoute = ({
  enabled = true,
  fromAmount,
  fromToken,
  toToken,
  fromChainId,
  toChainId,
  fromAddress,
  toAddress,
  denyBridges,
  denyExchanges,
  slippage,
}: UseLifiCrossTransfersRouteParams) => {
  // After a network switch, an address can briefly belong to the other ecosystem
  const hasValidAddresses =
    (!fromAddress || parseAddressForChain(fromAddress, fromChainId) !== undefined) &&
    (!toAddress || parseAddressForChain(toAddress, toChainId) !== undefined);
  const isCrossEcosystem = getWalletEcosystem(fromChainId) !== getWalletEcosystem(toChainId);
  // Without a recipient, LiFi sends to the sender's address, which doesn't exist on the other
  // ecosystem, so the quote is requested without addresses
  const quoteFromAddress = toAddress || !isCrossEcosystem ? fromAddress : undefined;
  const key = useMemo(
    () =>
      enabled && fromAmount !== '0' && hasValidAddresses
        ? ([
            fromAmount,
            fromToken,
            toToken,
            fromChainId,
            toChainId,
            quoteFromAddress,
            toAddress,
            denyBridges,
            denyExchanges,
            slippage,
            'useLifiCrossTransfersRoute',
          ] as const)
        : null,
    [
      enabled,
      fromAmount,
      hasValidAddresses,
      fromToken,
      toToken,
      fromChainId,
      toChainId,
      quoteFromAddress,
      toAddress,
      denyBridges,
      denyExchanges,
      slippage,
    ],
  );

  const queryKey = useDeferredValue(key);
  const isUpdating = key !== queryKey;

  const swrResult = useSWR(
    queryKey,
    async ([
      _fromAmount,
      _fromToken,
      _toToken,
      _fromChainId,
      _toChainId,
      _fromAddress,
      _toAddress,
      _denyBridges,
      _denyExchanges,
      _slippage,
    ]) => {
      const urlParams = new URLSearchParams({
        fromAmount: _fromAmount,
        fromChainId: _fromChainId.toString(),
        toChainId: _toChainId.toString(),
        fromToken: _fromToken,
        toToken: _toToken,
      });

      if (_fromAddress) {
        urlParams.append('fromAddress', _fromAddress);
      }

      if (_toAddress) {
        urlParams.append('toAddress', _toAddress);
      }

      if (_denyBridges && _denyBridges.length > 0) {
        _denyBridges.forEach((denyBridge) => urlParams.append('denyBridges', denyBridge));
      }
      if (_denyExchanges && _denyExchanges.length > 0) {
        _denyExchanges.forEach((denyExchange) => urlParams.append('denyExchanges', denyExchange));
      }
      if (_slippage) {
        urlParams.set('slippage', _slippage.toString());
      }

      const response = await fetch(
        `${getAPIBaseUrl()}/api/crosschain-transfers/lifi?${urlParams.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      ).then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message);
        }

        return data as { data: PreferredLifiRoutes };
      });

      return response.data;
    },
    {
      refreshInterval: 1 * 60 * 1_000, // 1 minutes in miliseconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      keepPreviousData: true,
    },
  );

  return {
    ...swrResult,
    data: !hasValidAddresses || swrResult.error ? undefined : swrResult.data,
    isLoading: isUpdating || swrResult.isLoading,
  };
};
