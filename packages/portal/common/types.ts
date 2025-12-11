export type AppCountChain = 'Total' | string; // dynamic keys for app count

export type AppCount = Record<AppCountChain, number>;

export type Category = {
  id: string;
  title: string;
  slug: string;
  subcategories: Subcategory[];
  image?: string;
  description?: string;
  rank?: number;
};

export type Subcategory = {
  id: string;
  title: string;
  slug: string;
  appCount: AppCount;
  rank?: number;
};

export type Sortable = {
  title: string;
  rank?: number;
};

export type SubcategoryWithoutAppCount = Omit<Subcategory, 'appCount'>;

export type Project = {
  id: string;
  title: string;
  slug: string;
  subcategoryIds: string[];
  chains: string[];
  rank?: number;
  chainsMap: Record<string, boolean>;
  description?: string | null;
  images: {
    logoUrl: string;
    bannerUrl: string | null;
  };
  links: {
    website: string | null;
    discord: string | null;
    twitter: string | null;
    github: string | null;
    coingecko?: string | null;
    fundingNews?: string | null;
    video?: string | null;
    news?: string | null;
    audit?: string | null;
    opensea?: string | null;
  };
  meta: {
    isLive: boolean;
    isFeaturedOnHomePage?: boolean;
    isFeaturedOnHomePageBanner?: boolean;
    isArbitrumNative?: boolean;
    isFeaturedOnCategoryPage?: boolean;
    isTrending?: boolean;
    isPublicallyAudited?: boolean;
    auditReportDate?: string | null;
    supportedPlatforms?: string[];
    editorsNotes?: string | null;
    nftMintDate?: string | null;
    foundedDate?: string | null;
    createdTime?: string | null;
  };
  liveIncentives?: {
    startDate?: string | null;
    endDate?: string | null;
    rewards?: number;
  };
};

export type ProjectWithSubcategories = Omit<Project, 'subcategoryIds'> & {
  subcategories: SubcategoryWithoutAppCount[];
};

export type ProjectOrProjectWithSubcategories = Project | ProjectWithSubcategories;

export type FullProject = ProjectWithSubcategories & {
  entityType: EntityType.Project;
  subcategoryIds: string[];
  categoryIds: string[];
};

export type FullSubcategory = Subcategory & { categoryId: string | null };

export enum EntityType {
  Project = 'Project',
  Category = 'Category',
  Subcategory = 'Subcategory',
  OrbitChain = 'OrbitChain',
}

/* Enhance any entity to be searchable in our app (make them SearchableData) by adding these keys */
export type SearchHelperKeys = {
  entityType: EntityType;
  searchTitle?: string; // for displaying custom title in search results
  tags?: string[]; // to add custom tags to enhance search later
};

export type SearchableData<T> = T & SearchHelperKeys;

export type CommunityTalk = {
  id: string;
  title: string;
  description: string;
  link: string;
  date: string;
  className?: string;
};

export type EcosystemMission = {
  rank?: number;
  id: string;
  title: string;
  status: string;
  teamsInvolved: string[];
  link: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
};

export type OrbitChainTeamMember = {
  primaryText: string;
  secondaryText?: string;
  avatarUrl?: string;
  link: string;
};

export type OrbitChain = {
  rank?: number;
  id: string;
  title: string;
  slug: string;
  entityType: EntityType.OrbitChain;
  categoryId: string;
  description?: string | null;
  isFeaturedOnHomePage?: boolean;
  isFeaturedOnOrbitPage?: boolean;
  images: {
    logoUrl: string;
    bannerUrl: string | null;
  };
  links: {
    website: string | null;
    discord: string | null;
    twitter: string | null;
    github: string | null;
    news: string | null;
    docs: string | null;
  };
  chain: {
    chainId: number | null;
    layer: number | null;
    token: string | null;
    tokenAddress: string | null;
    rpcUrl: string | null;
    blockExplorerUrl: string | null;
    parentChain: string | null;
    deployerTeam: string | null;
    status: string | null;
    type: string | null;
    bridgeUrl: string | null;
    gasFee: string | null;
  };
  teamMembers: OrbitChainTeamMember[];
  color: {
    primary: string | null;
    secondary: string | null;
  };
};

export type EntityCardDisplayMode =
  | 'normal'
  | 'preview'
  | 'spotlight'
  | 'bookmarked'
  | 'reward-spotlight'
  | 'compact';

export type OrbitTvlStats = Record<string, number>;

export type PortalStats = {
  totalOrbitChainsOnMainnet: number;
  medianFeePerOrbitTransaction: number;
  totalWalletsConnectedToOrbitChains: number;
  totalAmountBridgedToOrbit: number;
  totalOrbitDevelopers: number;
  orbitChainsTvl: OrbitTvlStats;
  totalActiveWallets: number;
  averageTxnsPerDayThisMonth: number;
  cheaperThanEthFactor: number;
};

export type Blog = {
  feature_image: string;
  published_at: string;
  reading_time: number;
  title: string;
  url: string;
};

export enum ArbitrumStatus {
  UP = 'UP',
  HASISSUES = 'HASISSUES',
  UNDERMAINTENANCE = 'UNDERMAINTENANCE',
  UNKNOWN = 'UNKNOWN',
}

export type ArbitrumWebsiteNotionCmsRow = {
  name: string;
  id: string;
  text: string;
  text_2: string;
  smallText: string;
  link: string;
  link_2: string;
  image: string;
  featured: boolean;
};

export enum SortOptions {
  LIVE_INCENTIVE = 'live-incentive',
  ARBITRUM_NATIVE = 'arbitrum-native',
  ALPHABETICAL = 'alphabetical',
}
