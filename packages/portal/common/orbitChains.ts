// Orbit Chains' database and utility functions

import orbitChainsJson from '@/public/__auto-generated-orbitChains.json';
import { OrbitChain, SearchableData, EntityType, PortalStats } from './types';
import statsJson from '@/public/__auto-generated-stats.json';

const orbitChainsTvl = (statsJson.content as PortalStats).orbitChainsTvl;

const orbitChainKeyToIndexMap: { [id: string]: number } = {}; // mapping of [orbitChainsKey]=>{..index in ORBIT_CHAINs array}
export const ORBIT_CHAINS: SearchableData<OrbitChain>[] = []; // complete orbit chains' list

export const spotlightOrbitChains: string[] = [];

const notionOrbitChains: OrbitChain[] = orbitChainsJson.content.map(
  (entity) => ({ ...entity, entityType: EntityType.OrbitChain }),
);

notionOrbitChains
  //
  .forEach((orbitChain, orbitChainIndex) => {
    const orbitChainKey = orbitChain.slug;

    // add orbit chain to spotlight
    if (orbitChain.isFeaturedOnOrbitPage) {
      spotlightOrbitChains.push(orbitChainKey);
    }

    const searchableOrbitChain = {
      ...orbitChain,
      /* keys to help with searching */
      type: EntityType.OrbitChain,
    };

    orbitChainKeyToIndexMap[orbitChainKey] = orbitChainIndex;
    ORBIT_CHAINS.push(searchableOrbitChain);
  });

export const getOrbitChainDetailsById = (id: string) => {
  return orbitChainKeyToIndexMap[id] > -1
    ? ORBIT_CHAINS[orbitChainKeyToIndexMap[id]]
    : null;
};

type OrbitChainsGroupedByCategorySlug = {
  [categoryId: string]: OrbitChain[];
};

export const orbitChainsGroupedByCategorySlug = ORBIT_CHAINS.reduce(
  (groupedResult: OrbitChainsGroupedByCategorySlug, orbitChain) => {
    if (!groupedResult[orbitChain.categoryId])
      groupedResult[orbitChain.categoryId] = [];
    groupedResult[orbitChain.categoryId].push(orbitChain);
    return groupedResult;
  },
  {},
);

export const ORBIT_RAAS_CONFIG = [
  {
    id: 'caldera',
    link: 'https://www.caldera.xyz/',
    title: 'Caldera',
    chainType: 'Supports AnyTrust and Rollup chains',
    appLabel: 'Powering Treasure, Hychain & Rari',
    image: '/images/orbit/raas_caldera.webp',
  },
  {
    id: 'conduit',
    link: 'https://conduit.xyz/',
    title: 'Conduit',
    chainType: 'Supports Rollup chains',
    appLabel: 'Powering Frame, Orb3 & Parallel',
    image: '/images/orbit/raas_conduit.webp',
  },
  {
    id: 'altlayer',
    link: 'https://altlayer.io/',
    title: 'Altlayer',
    chainType: 'Supports AnyTrust and Rollup chains',
    appLabel: 'Powering Cometh, Polychain Monsters & Avive',
    image: '/images/orbit/raas_altlayer.webp',
  },
  {
    id: 'gelato',
    link: 'https://www.gelato.network/',
    title: 'Gelato',
    chainType: 'Supports AnyTrust chains',
    appLabel: 'Powering re.al & Playnance',
    image: '/images/orbit/raas_gelato.webp',
  },
];

const transformStringToTvlStatsKey = (str: string) => {
  // 1. lowercase the string
  // 2. replace hyphen (-) by space
  // 3. replace " chain" by ""
  return str
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/ chain/g, '');
};

export const getTvlForOrbitChain = (slug: string): number | undefined => {
  const orbitChainDetails = getOrbitChainDetailsById(slug);
  if (!orbitChainDetails) return undefined;

  const transformedSlug = transformStringToTvlStatsKey(slug);
  const transformedTitle = transformStringToTvlStatsKey(
    orbitChainDetails.title,
  );

  return (
    orbitChainsTvl[slug] ??
    orbitChainsTvl[transformedSlug] ??
    orbitChainsTvl[transformedTitle] ??
    undefined
  );
};
