import { describe, expect, it } from 'vitest';

import { OpportunityCategory } from '@/app-types/earn/vaults';
import { type UserPositionsResponse, Vendor } from '@/earn-api/types';

import { mapUserPositionsData } from './useUserPositions';

describe('mapUserPositionsData', () => {
  it('normalizes category keys and lowercases opportunity ids', () => {
    const rawData = {
      userAddress: '0x123',
      positions: [
        {
          opportunityId: '0xABCDEF',
          category: OpportunityCategory.Lend,
          vendor: Vendor.Vaults,
          network: 'arbitrum',
          amount: '1000000',
          valueUsd: 1000,
          tokenAddress: '0xusdc',
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          projectedEarningsUsd: undefined,
          opportunity: {
            id: '0xABCDEF',
            name: 'Lend Position',
            protocol: 'vaults',
            apy: 5,
          },
        },
        {
          opportunityId: '0xFEDCBA',
          category: OpportunityCategory.LiquidStaking,
          vendor: Vendor.Vaults,
          network: 'arbitrum',
          amount: '1000000000000000000',
          valueUsd: 2000,
          tokenAddress: '0xweeth',
          tokenSymbol: 'weETH',
          tokenDecimals: 18,
          projectedEarningsUsd: 120,
          opportunity: {
            id: '0xFEDCBA',
            name: 'LST Position',
            protocol: 'lifi',
            apy: 6,
          },
        },
      ],
      totalValueUsd: 3000,
      projectedEarningsUsd: 170,
      projectedEarningsMonthlyUsd: 14.17,
      projectedEarningsYearlyPercentage: 5.67,
      projectedEarningsMonthlyPercentage: 0.47,
      netApy: 5.67,
      categoryApy: {
        lending: 5,
        liquid_staking: 6,
      },
      summary: {
        byCategory: {
          Lending: { count: 1, valueUsd: 1000 },
          liquid_staking: { count: 1, valueUsd: 2000 },
        },
        byVendor: {
          vaults: { count: 1, valueUsd: 1000 },
          lifi: { count: 1, valueUsd: 2000 },
        },
      },
    } as unknown as UserPositionsResponse;

    const mapped = mapUserPositionsData(rawData);

    expect(mapped.opportunityIds.has('0xabcdef')).toBe(true);
    expect(mapped.opportunityIds.has('0xfedcba')).toBe(true);
    expect(mapped.positionsMap.get('0xabcdef')?.projectedEarningsUsd).toBe(50);
    expect(mapped.positionsMap.get('0xfedcba')?.projectedEarningsUsd).toBe(120);
    expect(mapped.summary.byCategory[OpportunityCategory.Lend]).toEqual({
      count: 1,
      valueUsd: 1000,
    });
    expect(mapped.summary.byCategory[OpportunityCategory.LiquidStaking]).toEqual({
      count: 1,
      valueUsd: 2000,
    });
    expect(mapped.categoryApy[OpportunityCategory.Lend]).toBe(5);
    expect(mapped.categoryApy[OpportunityCategory.LiquidStaking]).toBe(6);
  });
});
