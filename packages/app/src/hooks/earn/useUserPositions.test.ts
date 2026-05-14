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
        {
          opportunityId: '0xPENDLE',
          category: OpportunityCategory.FixedYield,
          vendor: Vendor.Pendle,
          network: 'arbitrum',
          amount: '500000000000000000',
          valueUsd: 500,
          tokenAddress: '0xpt-token',
          tokenSymbol: 'PT-weETH',
          tokenDecimals: 18,
          projectedEarningsUsd: undefined,
          isExpired: false,
          expiryDate: '2027-06-01T00:00:00Z',
          opportunity: {
            id: '0xPENDLE',
            name: 'PT weETH',
            protocol: 'Pendle',
            apy: 4,
          },
        },
      ],
      totalValueUsd: 3500,
      projectedEarningsUsd: 190,
      projectedEarningsMonthlyUsd: 15.83,
      projectedEarningsYearlyPercentage: 5.43,
      projectedEarningsMonthlyPercentage: 0.45,
      netApy: 5.43,
      categoryApy: {
        [OpportunityCategory.Lend]: 5,
        [OpportunityCategory.LiquidStaking]: 6,
        [OpportunityCategory.FixedYield]: 4,
      },
      summary: {
        byCategory: {
          [OpportunityCategory.Lend]: { count: 1, valueUsd: 1000 },
          [OpportunityCategory.LiquidStaking]: { count: 1, valueUsd: 2000 },
          [OpportunityCategory.FixedYield]: { count: 1, valueUsd: 500 },
        },
        byVendor: {
          vaults: { count: 1, valueUsd: 1000 },
          lifi: { count: 1, valueUsd: 2000 },
          pendle: { count: 1, valueUsd: 500 },
        },
      },
    } as unknown as UserPositionsResponse;

    const mapped = mapUserPositionsData(rawData);

    // Positions are lowercased and added to map regardless of OPPORTUNITY_CATEGORIES
    expect(mapped.opportunityIds.has('0xabcdef')).toBe(true);
    expect(mapped.opportunityIds.has('0xfedcba')).toBe(true);
    expect(mapped.opportunityIds.has('0xpendle')).toBe(true);
    expect(mapped.positionsMap.get('0xabcdef')?.projectedEarningsUsd).toBe(50);
    expect(mapped.positionsMap.get('0xfedcba')?.projectedEarningsUsd).toBe(120);
    // FixedYield: projectedEarningsUsd = 500 * 4 / 100 = 20
    expect(mapped.positionsMap.get('0xpendle')?.projectedEarningsUsd).toBe(20);
    expect(mapped.positionsMap.get('0xpendle')?.expiryDate).toBe('2027-06-01T00:00:00Z');

    // Lend summary is populated (Lend is in OPPORTUNITY_CATEGORIES)
    expect(mapped.summary.byCategory[OpportunityCategory.Lend]).toEqual({
      count: 1,
      valueUsd: 1000,
    });
    expect(mapped.categoryApy[OpportunityCategory.Lend]).toBe(5);

    // LiquidStaking is in OPPORTUNITY_CATEGORIES, so summary is populated
    expect(mapped.summary.byCategory[OpportunityCategory.LiquidStaking]).toEqual({
      count: 1,
      valueUsd: 2000,
    });
    expect(mapped.categoryApy[OpportunityCategory.LiquidStaking]).toBe(6);

    // FixedYield is in OPPORTUNITY_CATEGORIES
    expect(mapped.summary.byCategory[OpportunityCategory.FixedYield]).toEqual({
      count: 1,
      valueUsd: 500,
    });
    expect(mapped.categoryApy[OpportunityCategory.FixedYield]).toBe(4);
  });

  it('maps fixed yield positions with active and expired states', () => {
    const rawData = {
      userAddress: '0x123',
      positions: [
        {
          opportunityId: '0xActivePT',
          category: OpportunityCategory.FixedYield,
          vendor: Vendor.Pendle,
          network: 'arbitrum',
          amount: '2000000000000000000',
          valueUsd: 2000,
          tokenAddress: '0xpt-active',
          tokenSymbol: 'PT-weETH',
          tokenDecimals: 18,
          projectedEarningsUsd: 80,
          isExpired: false,
          expiryDate: '2027-06-01T00:00:00Z',
          opportunity: {
            id: '0xActivePT',
            name: 'PT weETH 01 Jun 2027',
            protocol: 'Pendle',
            apy: 4,
            tvl: 50_000_000,
          },
        },
        {
          opportunityId: '0xExpiredPT',
          category: OpportunityCategory.FixedYield,
          vendor: Vendor.Pendle,
          network: 'arbitrum',
          amount: '1000000000000000000',
          valueUsd: 1000,
          tokenAddress: '0xpt-expired',
          tokenSymbol: 'PT-weETH',
          tokenDecimals: 18,
          projectedEarningsUsd: 0,
          isExpired: true,
          expiryDate: '2025-01-01T00:00:00Z',
          opportunity: {
            id: '0xExpiredPT',
            name: 'PT weETH 01 Jan 2025',
            protocol: 'Pendle',
            apy: 0,
            tvl: 10_000_000,
          },
        },
      ],
      totalValueUsd: 3000,
      projectedEarningsUsd: 80,
      projectedEarningsMonthlyUsd: 6.67,
      projectedEarningsYearlyPercentage: 2.67,
      projectedEarningsMonthlyPercentage: 0.22,
      netApy: 2.67,
      categoryApy: { [OpportunityCategory.FixedYield]: 2.67 },
      summary: {
        byCategory: {
          [OpportunityCategory.FixedYield]: { count: 2, valueUsd: 3000 },
        },
        byVendor: { pendle: { count: 2, valueUsd: 3000 } },
      },
    } as unknown as UserPositionsResponse;

    const mapped = mapUserPositionsData(rawData);

    // Active position
    const active = mapped.positionsMap.get('0xactivept');
    expect(active).toBeDefined();
    expect(active?.category).toBe(OpportunityCategory.FixedYield);
    expect(active?.expiryDate).toBe('2027-06-01T00:00:00Z');
    expect(active?.opportunityName).toBe('PT weETH 01 Jun 2027');
    expect(active?.opportunityProtocol).toBe('Pendle');
    expect(active?.projectedEarningsUsd).toBe(80);

    // Expired position
    const expired = mapped.positionsMap.get('0xexpiredpt');
    expect(expired).toBeDefined();
    expect(expired?.category).toBe(OpportunityCategory.FixedYield);
    expect(expired?.expiryDate).toBe('2025-01-01T00:00:00Z');
    expect(expired?.opportunityApy).toBe(0);

    // FixedYield summary
    expect(mapped.summary.byCategory[OpportunityCategory.FixedYield]).toEqual({
      count: 2,
      valueUsd: 3000,
    });
    expect(mapped.categoryApy[OpportunityCategory.FixedYield]).toBe(2.67);
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
