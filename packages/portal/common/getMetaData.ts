// Generate metadata on server side

import { Metadata } from 'next';
import {
  ServerSideAppProps,
  getServerSideAppParams,
} from './getServerSideAppParams';
import { getProjectDetailsById } from './projects';
import { getCategoryDetailsById } from './categories';
import { EntityType } from './types';
import { getOrbitChainDetailsById } from './orbitChains';

const projectsHomePageMeta = {
  url: 'https://portal.arbitrum.io/projects',
  title: 'Arbitrum Portal — Your Gateway into the Arbitrum Ecosystem',
  description:
    'Welcome to the Arbitrum ecosystem. Explore DeFi, bridges, games, NFTs, wallets, exchanges, and more within Arbitrum.',
};

const categoriesHomePageMeta: { [slug: string]: string } = {
  defi: 'Explore DeFi chains on Arbitrum: Unlock fast, low-cost decentralized finance solutions on Ethereum’s leading Layer 2 scaling platform.',
  gaming:
    'Play Pirate Nation, The Beacon, Farcana, and more on the fastest-growing gaming ecosystem on Ethereum.',
  nfts: 'Create and trade NFTs seamlessly on Arbitrum’s NFT-focused chains. Enjoy low fees, fast transactions, and scalability on Ethereum Layer 2.',
  'bridges-and-on-ramps':
    'Bridge to Arbitrum, on-ramp fiat, and use a smart contract wallet on the most decentralized L2 on Ethereum.',
  'infra-and-tools':
    'Find a node provider, do your crypto taxes, and start a DAO on the most decentralized L2 on Ethereum.',
  'ai-and-depin':
    'Discover artificial intelligence (AI) and decentralized physical infrastructure network (DePIN) projects on the Arbitrum Portal. Step into a new era of efficiency and accessibility.',
};

const chainPageMeta: {
  [slug: string]: { title: string; description: string } | undefined;
} = {
  'arbitrum-one': {
    title: 'Projects on Arbitrum One',
    description:
      'Build and scale with Arbitrum One, Ethereum’s premier Layer 2 chain. Access dApps, DeFi, and NFTs with unmatched speed, security, and efficiency.',
  },
  'arbitrum-nova': {
    title: 'Projects on Arbitrum Nova',
    description:
      'Arbitrum Nova: Your gateway to social dApps and gaming on Ethereum Layer 2. Enjoy ultra-low fees and high-speed transactions for mass adoption',
  },
};

export const getEntityMetaData = (
  entityType: EntityType,
  entitySlug: string,
): Metadata | null => {
  const entityDetails =
    entityType === EntityType.OrbitChain
      ? getOrbitChainDetailsById(entitySlug)
      : getProjectDetailsById(entitySlug);

  if (!entityDetails) return null;

  const title = entityDetails['title'] + ' — Arbitrum Portal';
  const description = (() => {
    const fullDescription =
      entityDetails.description ?? projectsHomePageMeta.description;

    return fullDescription.length > 150
      ? fullDescription.substring(0, 150) + '...'
      : fullDescription;
  })();

  const ogImageUrl = `/images/__auto-generated/open-graph/${entityType}-${entityDetails.slug}.jpg`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 627,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: ogImageUrl, alt: title }],
    },
  };
};

export function getMetaData(props: ServerSideAppProps): Metadata {
  // read route params
  const {
    selectedCategory,
    selectedProject,
    selectedChains,
    searchString,
    selectedOrbitChain,
  } = getServerSideAppParams(props);
  const projectDetails = getProjectDetailsById(selectedProject || ''); // details of a single project selected
  const categoryDetails = getCategoryDetailsById(selectedCategory); // details of a single category selected
  const orbitChainDetails = getOrbitChainDetailsById(selectedOrbitChain || ''); // details of orbit chain panel, if open
  const chainDetails =
    selectedChains?.length &&
    selectedChains.length === 1 &&
    chainPageMeta[selectedChains[0]!]; // details of a single chain selected

  // if Project's dedicated page (side panel)
  if (projectDetails) {
    return getEntityMetaData(EntityType.Project, projectDetails.slug)!;
  }

  // if Orbit Chain's dedicated page (side panel)
  if (orbitChainDetails) {
    return getEntityMetaData(EntityType.OrbitChain, orbitChainDetails.slug)!;
  }

  // if Category homepage
  if (categoryDetails) {
    const title = categoryDetails.title + ' — Arbitrum Portal';
    const description = categoriesHomePageMeta[categoryDetails.slug];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        locale: 'en_US',
        type: 'website',
        images: `https://portal.arbitrum.io/images/og-${categoryDetails.slug}.jpg`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: `https://portal.arbitrum.io/images/og-${categoryDetails.slug}.jpg`,
      },
    };
  }

  // if Chain's projects listing page // eg. https://portal.arbitrum.io/?chains=arbitrum-nova
  if (chainDetails) {
    return {
      title: chainDetails.title,
      description: chainDetails.description,
      openGraph: {
        title: chainDetails.title,
        description: chainDetails.description,
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: chainDetails.title,
        description: chainDetails.description,
      },
    };
  }

  // if Search results page
  if (searchString) {
    return {
      title: `Search Results- "${searchString}" - Arbitrum Portal`,
    };
  }

  // else Project homepage
  return {
    title: projectsHomePageMeta.title,
    description: projectsHomePageMeta.description,
    openGraph: {
      title: projectsHomePageMeta.title,
      description: projectsHomePageMeta.description,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: projectsHomePageMeta.title,
      description: projectsHomePageMeta.description,
    },
  };
}
