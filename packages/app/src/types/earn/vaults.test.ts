import { describe, expect, it } from 'vitest';

import { OpportunityCategory, normalizeOpportunityCategory } from './vaults';

describe('normalizeOpportunityCategory', () => {
  it('normalizes supported category variants', () => {
    expect(normalizeOpportunityCategory('lend')).toBe(OpportunityCategory.Lend);
    expect(normalizeOpportunityCategory('Lending')).toBe(OpportunityCategory.Lend);
    expect(normalizeOpportunityCategory('liquid_staking')).toBe(OpportunityCategory.LiquidStaking);
    expect(normalizeOpportunityCategory('Liquid Staking')).toBe(OpportunityCategory.LiquidStaking);
    expect(normalizeOpportunityCategory('fixedYield')).toBe(OpportunityCategory.FixedYield);
  });

  it('returns null for unknown categories', () => {
    expect(normalizeOpportunityCategory('something-else')).toBeNull();
    expect(normalizeOpportunityCategory(undefined)).toBeNull();
    expect(normalizeOpportunityCategory(null)).toBeNull();
  });
});
