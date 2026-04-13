import { BigNumber } from 'ethers';

import { OpportunityCategory } from '@/app-types/earn/vaults';
import { type EarnChainId } from '@/earn-api/types';

import { type UserPositionData, useUserPositions } from './useUserPositions';

export type PendlePositionState = 'active' | 'ended';

interface UsePendlePositionResult {
  hasPosition: boolean;
  balance: BigNumber | null;
  /** Position state — only set when hasPosition is true */
  state: PendlePositionState | null;
  position: UserPositionData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function derivePositionState(expiryDate: string | null): PendlePositionState {
  if (expiryDate) {
    return new Date() >= new Date(expiryDate) ? 'ended' : 'active';
  }

  return 'active';
}

export function usePendlePosition(
  marketAddress: string,
  expiryDate: string | null,
  walletAddress: string | undefined,
  chainId: EarnChainId,
): UsePendlePositionResult {
  const { positionsMap, isLoading, error, refetch } = useUserPositions(walletAddress ?? null, [
    chainId,
  ]);

  const position = positionsMap.get(marketAddress.toLowerCase()) ?? null;
  const isPendlePosition = position?.category === OpportunityCategory.FixedYield;
  const ptBalanceRaw = isPendlePosition ? position.amountRaw : '0';
  const ptBalance = BigNumber.from(ptBalanceRaw);
  const hasPosition = ptBalance.gt(0);

  return {
    hasPosition,
    balance: hasPosition ? ptBalance : null,
    state: hasPosition ? derivePositionState(expiryDate) : null,
    position,
    isLoading,
    error,
    refetch,
  };
}
