import { BlogPost, EducationCard, Opportunity, PortfolioSummary, Position } from './types';

export const mockPositions: Position[] = [
  {
    id: '1',
    type: 'Liquid Staking',
    vault: 'stETH',
    apy: 15.45,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: {
      percentage: 0.1,
      usdValue: 4.5,
    },
    network: 'Arbitrum One',
    protocol: 'Lido',
  },
  {
    id: '2',
    type: 'Fixed Yield',
    vault: 'PT wsETH',
    vaultSubtitle: '25 Dec 2025',
    apy: 5.45,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: null,
    network: 'Arbitrum One',
    protocol: 'Pendle',
  },
  {
    id: '3',
    type: 'Lend',
    vault: 'ETH',
    apy: 5.45,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: {
      percentage: 0.1,
      usdValue: 4.5,
    },
    network: 'Arbitrum One',
    protocol: 'Aave',
  },
  {
    id: '4',
    type: 'Liquid Staking',
    vault: 'stETH',
    apy: 4,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: {
      percentage: 0.1,
      usdValue: 4.5,
    },
    network: 'Arbitrum One',
    protocol: 'Lido',
  },
  {
    id: '5',
    type: 'Lend',
    vault: 'ETH',
    apy: 3.45,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: {
      percentage: 0.1,
      usdValue: 4.5,
    },
    network: 'Arbitrum One',
    protocol: 'Aave',
  },
  {
    id: '6',
    type: 'Liquid Staking',
    vault: 'stETH',
    apy: 2.45,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: {
      percentage: 0.1,
      usdValue: 4.5,
    },
    network: 'Arbitrum One',
    protocol: 'Lido',
  },
  {
    id: '7',
    type: 'Lend',
    vault: 'ETH',
    apy: 5.45,
    deposited: {
      amount: 0.001,
      token: 'ETH',
      usdValue: 45,
    },
    earnings: {
      percentage: 0.1,
      usdValue: 4.5,
    },
    network: 'Arbitrum One',
    protocol: 'Aave',
  },
];

export const mockOpportunities: Opportunity[] = [
  // Lend opportunities
  {
    id: 'opp-1',
    type: 'Lend',
    vault: 'ETH',
    apy: 5.45,
    network: 'Arbitrum One',
    protocol: 'Aave',
  },
  {
    id: 'opp-2',
    type: 'Lend',
    vault: 'ETH',
    apy: 5.45,
    network: 'Arbitrum One',
    protocol: 'Aave',
  },
  {
    id: 'opp-3',
    type: 'Lend',
    vault: 'ETH',
    apy: 5.45,
    network: 'Arbitrum One',
    protocol: 'Aave',
  },
  // Liquid Staking opportunities
  {
    id: 'opp-4',
    type: 'Liquid Staking',
    vault: 'stETH',
    apy: 15.45,
    network: 'Arbitrum One',
    protocol: 'Lido',
    badge: 'Special Offer',
  },
  {
    id: 'opp-5',
    type: 'Liquid Staking',
    vault: 'stETH',
    apy: 15.45,
    network: 'Arbitrum One',
    protocol: 'Lido',
  },
  {
    id: 'opp-6',
    type: 'Liquid Staking',
    vault: 'stETH',
    apy: 15.45,
    network: 'Arbitrum One',
    protocol: 'Lido',
  },
  // Fixed Yield opportunities
  {
    id: 'opp-7',
    type: 'Fixed Yield',
    vault: 'PT wsETH',
    vaultSubtitle: '25 Dec 2025',
    fixedApy: 5.45,
    liquidity: '$1.2M USD',
    network: 'Arbitrum One',
    protocol: 'Pendle',
  },
  {
    id: 'opp-8',
    type: 'Fixed Yield',
    vault: 'PT wsETH',
    vaultSubtitle: '25 Dec 2025',
    fixedApy: 5.45,
    liquidity: '$1.2M USD',
    network: 'Arbitrum One',
    protocol: 'Pendle',
  },
];

export const mockEducationCards: EducationCard[] = [
  {
    id: 'edu-1',
    title: 'What is Staking?',
    description: 'A simple guide to how staking works and why it earns you yield.',
    category: 'intro',
  },
  {
    id: 'edu-2',
    title: 'Liquid Staking 101',
    description: 'Learn how liquid staking lets you earn yield while keeping your tokens flexible.',
    category: 'intro',
  },
  {
    id: 'edu-3',
    title: 'Lending Explained',
    description: 'How lending your assets generates interest, and what risks to consider.',
    category: 'intro',
  },
  {
    id: 'edu-4',
    title: 'Fixed Yield vs Variable Yield',
    description: 'Understand the difference between guaranteed returns and market-driven APYs.',
    category: 'intro',
  },
  {
    id: 'edu-5',
    title: 'How Protocols Generate Yield',
    description: 'Behind the scenes of staking pools, lending markets, and liquidity derivatives.',
    category: 'advanced',
  },
  {
    id: 'edu-6',
    title: 'Liquid Staking vs Traditional Staking',
    description: 'Explore the trade-offs between liquidity and stability.',
    category: 'advanced',
  },
  {
    id: 'edu-7',
    title: 'Risk Management in DeFi',
    description: 'For the giga-brains',
    category: 'advanced',
  },
  {
    id: 'edu-8',
    title: 'Yield Aggregators & Advanced Strategies',
    description: 'An intro to vaults, restaking, and auto-compounding opportunities.',
    category: 'advanced',
  },
];

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'How Espresso Powers Arbitrum Chains',
    image: '/images/blog/espresso-1.jpg',
    tag: 'Case Study - Espresso',
    logos: ['/logos/arbitrum.svg', '/logos/espresso.svg'],
  },
  {
    id: 'blog-2',
    title: 'How Espresso Powers Arbitrum Chains',
    image: '/images/blog/espresso-2.jpg',
    tag: 'Case Study - Espresso',
    logos: ['/logos/arbitrum.svg', '/logos/espresso.svg'],
  },
  {
    id: 'blog-3',
    title: 'How Espresso Powers Arbitrum Chains',
    image: '/images/blog/espresso-3.jpg',
    tag: 'Case Study - Espresso',
    logos: ['/logos/arbitrum.svg', '/logos/espresso.svg'],
  },
];

export const mockPortfolioSummary: PortfolioSummary = {
  totalPositions: 435.34,
  totalEarnings: 435.34,
  netApy: 12,
  breakdown: {
    fixedYield: 30,
    lending: 20,
    liquidStaking: 50,
  },
};
