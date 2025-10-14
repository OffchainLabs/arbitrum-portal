export type PositionType = 'Liquid Staking' | 'Fixed Yield' | 'Lend';

export type Protocol = 'Lido' | 'Pendle' | 'Aave' | 'Compound';

export type Network = 'Arbitrum One' | 'Arbitrum Nova' | 'Ethereum';

export interface Position {
  id: string;
  type: PositionType;
  vault: string;
  vaultSubtitle?: string;
  apy: number;
  deposited: {
    amount: number;
    token: string;
    usdValue: number;
  };
  earnings: {
    percentage: number;
    usdValue: number;
  } | null;
  network: Network;
  protocol: Protocol;
}

export interface Opportunity {
  id: string;
  type: PositionType;
  vault: string;
  vaultSubtitle?: string;
  apy?: number;
  fixedApy?: number;
  liquidity?: string;
  network: Network;
  protocol: Protocol;
  badge?: string;
}

export interface EducationCard {
  id: string;
  title: string;
  description: string;
  category: 'intro' | 'advanced';
}

export interface BlogPost {
  id: string;
  title: string;
  image: string;
  tag: string;
  logos: string[];
}

export interface PortfolioSummary {
  totalPositions: number;
  totalEarnings: number;
  netApy: number;
  breakdown: {
    fixedYield: number;
    lending: number;
    liquidStaking: number;
  };
}
