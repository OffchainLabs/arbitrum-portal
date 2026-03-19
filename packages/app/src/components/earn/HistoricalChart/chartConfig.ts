import { OpportunityCategory } from '@/earn-api/types';

export interface ChartConfig {
  apy: {
    label: string;
    name: string;
  };
  tvl: {
    label: string;
    name: string;
  };
  price: {
    label: string;
    name: string;
  };
  dateFormat: string;
  title?: string;
}

export const CHART_CONFIG: Record<OpportunityCategory, ChartConfig> = {
  [OpportunityCategory.Lend]: {
    apy: {
      label: 'APY (%)',
      name: 'APY',
    },
    tvl: {
      label: 'TVL (USD)',
      name: 'TVL',
    },
    price: {
      label: 'Price (USD)',
      name: 'Price',
    },
    dateFormat: 'MMM D',
  },
  [OpportunityCategory.FixedYield]: {
    apy: {
      label: 'PT APY (%)',
      name: 'PT APY',
    },
    tvl: {
      label: 'TVL (USD)',
      name: 'TVL',
    },
    price: {
      label: 'Price (USD)',
      name: 'Price',
    },
    dateFormat: 'MMM D',
    title: 'Market History (7D)',
  },
  [OpportunityCategory.LiquidStaking]: {
    apy: {
      label: 'APY (%)',
      name: 'APY',
    },
    tvl: {
      label: 'TVL (USD)',
      name: 'TVL',
    },
    price: {
      label: 'Price (USD)',
      name: 'Price',
    },
    dateFormat: 'MMM D',
  },
};
