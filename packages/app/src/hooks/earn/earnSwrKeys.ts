import type { OpportunityCategory } from '@/app-types/earn/vaults';
import type { EarnChainId } from '@/earn-api/types';

export const earnSwrKeys = {
  userPositions: (userAddress: string, chainId: EarnChainId) =>
    [userAddress, chainId, 'userPositions'] as const,
  earnTransactions: (
    category: OpportunityCategory,
    opportunityId: string,
    userAddress: string,
    chainId: EarnChainId,
  ) => [category, opportunityId, userAddress, chainId, 'earn-transactions'] as const,
  availableActions: (
    category: OpportunityCategory,
    opportunityId: string,
    userAddress: string,
    chainId: EarnChainId,
  ) => ['available-actions', category, opportunityId, userAddress, chainId] as const,
};
