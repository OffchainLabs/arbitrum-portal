import useSWRImmutable from 'swr/immutable';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainId } from '../types/ChainId';
import { getL1ERC20Address } from '../util/TokenUtils';

/**
 * Returns L1 address
 *
 * @param eitherL1OrL2Address string Token address (on L1 or L2)
 * @param l2ChainId L2 chain ID
 * @returns
 */
export const useERC20L1Address = ({
  eitherL1OrL2Address,
  /**
   * Include the L2 chain ID in the SWR key because the same token address can resolve
   * to different parent addresses across L2 chains.
   */
  l2ChainId,
}: {
  eitherL1OrL2Address: string;
  l2ChainId: number;
}) => {
  const { data = null, isLoading } = useSWRImmutable(
    [eitherL1OrL2Address, l2ChainId, 'useERC20L1Address'],
    async ([_eitherL1OrL2Address, _l2ChainId]) => {
      const parentAddress = await getL1ERC20Address({
        erc20L2Address: _eitherL1OrL2Address,
        l2Provider: getProviderForChainId(_l2ChainId as ChainId),
      });

      return {
        address: (parentAddress ?? _eitherL1OrL2Address).toLowerCase(),
        hasParentAddress: parentAddress !== null,
      };
    },
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
    },
  );

  return {
    data: data?.address ?? null,
    hasParentAddress: data?.hasParentAddress ?? false,
    isLoading,
  };
};
