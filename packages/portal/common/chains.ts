// Chains' database and utility functions; used for populating dropdowns and displaying chain logos, filtering by chains etc.

import { ORBIT_CHAINS } from './orbitChains';
import { CHAINS_WITH_PROJECTS } from './projects';

// core arbitrum networks
export const ARB_NETWORKS = [
  {
    slug: 'arbitrum-one',
    title: 'Arbitrum One',
    logoUrl: `/images/ArbOneLogo.svg`,
    description:
      'Rollup protocol. Permissionless validation, secured by operational fraud proofs.',
    color: {
      primary: '#1B4ADD',
      secondary: '#001A6B',
    },
    rank: 1,
    isOrbitChain: false,
  },
  {
    slug: 'arbitrum-nova',
    title: 'Arbitrum Nova',
    logoUrl: `/images/ArbNovaLogo.svg`,
    description:
      'AnyTrust protocol. High scale and low fee. Secured by a trust-minimized Data Availability Committee (DAC).',
    color: {
      primary: '#E57310',
      secondary: '#743600',
    },
    rank: 2,
    isOrbitChain: false,
  },
];

// basic details extracted from orbit chains
export const ORBIT_NETWORKS_IN_FILTERS = ORBIT_CHAINS.filter(
  (orbitChain) => CHAINS_WITH_PROJECTS[orbitChain.title], // filter out project-less chains from the orbit chains
).map((chain, index) => ({
  slug: chain.slug,
  title: chain.title,
  logoUrl: chain.images.logoUrl,
  description: chain.description ? chain.description : '',
  color: chain.color,
  rank: 3 + (chain.rank ?? index), // should display only after core chains
  isOrbitChain: true,
}));

export const CHAINS = [...ARB_NETWORKS, ...ORBIT_NETWORKS_IN_FILTERS]; // combine all chains

export type Network = (typeof CHAINS)[number];

export const getChainDetailsById = (id: string) => {
  return CHAINS.find((chain) => chain.slug === id);
};

// returns slug - eg. Arbitrum One -> arbitrum-one, Arbitrum Nova -> arbitrum-nova, XAI -> xai
export const getChainSlugFromTitle = (title: string) =>
  title.replaceAll(' ', '-').toLowerCase();

export const sortByChainRank = (a: string, b: string) => {
  return (
    (getChainDetailsById(a)?.rank ?? 0) - (getChainDetailsById(b)?.rank ?? 0)
  );
};

export const VALID_CHAIN_SLUGS = [...ARB_NETWORKS, ...ORBIT_CHAINS].map(
  (chain) => chain.slug,
);
