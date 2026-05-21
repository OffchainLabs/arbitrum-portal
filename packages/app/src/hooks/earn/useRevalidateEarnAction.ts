'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import type { OpportunityCategory } from '@/app-types/earn/vaults';
import { captureSentryErrorWithExtraData } from '@/bridge/util/SentryUtils';
import type { EarnChainId } from '@/earn-api/types';

import { earnSwrKeys } from './earnSwrKeys';

interface RevalidateEarnActionParams {
  category: OpportunityCategory;
  chainId: EarnChainId;
  opportunityId: string;
  userAddress: string;
  txHash: string;
}

export function useRevalidateEarnAction() {
  const { mutate } = useSWRConfig();

  return useCallback(
    async (params: RevalidateEarnActionParams) => {
      try {
        const response = await fetch('/api/onchain-actions/v1/earn/revalidate-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: params.chainId,
            userAddress: params.userAddress,
            opportunityId: params.opportunityId,
            txHash: params.txHash,
          }),
        });
        if (!response.ok) {
          throw new Error(`Revalidate request failed with status ${response.status}`);
        }
      } catch (error) {
        captureSentryErrorWithExtraData({
          error,
          originFunction: 'useRevalidateEarnAction',
          additionalData: {
            chainId: String(params.chainId),
            userAddress: params.userAddress,
            txHash: params.txHash,
          },
        });
      }

      await Promise.allSettled([
        mutate(earnSwrKeys.userPositions(params.userAddress, params.chainId)),
        mutate(
          earnSwrKeys.availableActions(
            params.category,
            params.opportunityId,
            params.userAddress,
            params.chainId,
          ),
        ),
        mutate(
          earnSwrKeys.earnTransactions(
            params.category,
            params.opportunityId,
            params.userAddress,
            params.chainId,
          ),
        ),
      ]);
    },
    [mutate],
  );
}
