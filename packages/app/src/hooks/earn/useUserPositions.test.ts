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
        [OpportunityCategory.Lend]: 5,
        [OpportunityCategory.LiquidStaking]: 6,
      },
      summary: {
        byCategory: {
          [OpportunityCategory.Lend]: { count: 1, valueUsd: 1000 },
          [OpportunityCategory.LiquidStaking]: { count: 1, valueUsd: 2000 },
        },
        byVendor: {
          vaults: { count: 1, valueUsd: 1000 },
          lifi: { count: 1, valueUsd: 2000 },
        },
      },
    } as unknown as UserPositionsResponse;

    const mapped = mapUserPositionsData(rawData);

    // Positions are lowercased and added to map regardless of OPPORTUNITY_CATEGORIES
    expect(mapped.opportunityIds.has('0xabcdef')).toBe(true);
    expect(mapped.opportunityIds.has('0xfedcba')).toBe(true);
    expect(mapped.positionsMap.get('0xabcdef')?.projectedEarningsUsd).toBe(50);
    expect(mapped.positionsMap.get('0xfedcba')?.projectedEarningsUsd).toBe(120);

    // Lend summary is populated (Lend is in OPPORTUNITY_CATEGORIES)
    expect(mapped.summary.byCategory[OpportunityCategory.Lend]).toEqual({
      count: 1,
      valueUsd: 1000,
    });
    expect(mapped.categoryApy[OpportunityCategory.Lend]).toBe(5);

    // LiquidStaking is NOT in PR1's OPPORTUNITY_CATEGORIES, so summary stays at defaults
    expect(mapped.summary.byCategory[OpportunityCategory.LiquidStaking]).toEqual({
      count: 0,
      valueUsd: 0,
    });
    expect(mapped.categoryApy[OpportunityCategory.LiquidStaking]).toBe(0);
  });

  it('handles empty positions', () => {
    const rawData = {
      userAddress: '0x123',
      positions: [],
      totalValueUsd: 0,
      projectedEarningsUsd: 0,
      projectedEarningsMonthlyUsd: 0,
      projectedEarningsYearlyPercentage: 0,
      projectedEarningsMonthlyPercentage: 0,
      netApy: 0,
      categoryApy: {},
      summary: {
        byCategory: {},
        byVendor: {},
      },
    } as unknown as UserPositionsResponse;

    const mapped = mapUserPositionsData(rawData);

    expect(mapped.positionsMap.size).toBe(0);
    expect(mapped.opportunityIds.size).toBe(0);
    expect(mapped.totalValueUsd).toBe(0);
    expect(mapped.summary.byCategory[OpportunityCategory.Lend]).toEqual({
      count: 0,
      valueUsd: 0,
    });
  });

  it('calculates projected earnings from APY when not provided', () => {
    const rawData = {
      userAddress: '0x123',
      positions: [
        {
          opportunityId: '0xAABBCC',
          category: OpportunityCategory.Lend,
          vendor: Vendor.Vaults,
          network: 'arbitrum',
          amount: '500000000',
          valueUsd: 500,
          tokenAddress: '0xusdc',
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          projectedEarningsUsd: undefined,
          opportunity: {
            id: '0xAABBCC',
            name: 'Test Vault',
            protocol: 'aave',
            apy: 10,
          },
        },
      ],
      totalValueUsd: 500,
      projectedEarningsUsd: 50,
      projectedEarningsMonthlyUsd: 4.17,
      projectedEarningsYearlyPercentage: 10,
      projectedEarningsMonthlyPercentage: 0.83,
      netApy: 10,
      categoryApy: { [OpportunityCategory.Lend]: 10 },
      summary: {
        byCategory: { [OpportunityCategory.Lend]: { count: 1, valueUsd: 500 } },
        byVendor: { vaults: { count: 1, valueUsd: 500 } },
      },
    } as unknown as UserPositionsResponse;

    const mapped = mapUserPositionsData(rawData);

    // projectedEarningsUsd = valueUsd * apy / 100 = 500 * 10 / 100 = 50
    expect(mapped.positionsMap.get('0xaabbcc')?.projectedEarningsUsd).toBe(50);
  });
});
