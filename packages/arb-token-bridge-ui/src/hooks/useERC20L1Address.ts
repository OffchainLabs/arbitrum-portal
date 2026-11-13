import useSWRImmutable from 'swr/immutable';

import { getParentTokenAddress } from '../services/tokenMetadata';

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
    ([_eitherL1OrL2Address, _l2ChainId]) => getParentTokenAddress(_eitherL1OrL2Address, _l2ChainId),
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
