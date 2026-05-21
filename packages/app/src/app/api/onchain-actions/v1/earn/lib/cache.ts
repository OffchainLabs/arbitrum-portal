export const EARN_CACHE_SECONDS = {
  opportunities: 6 * 60 * 60,
  historical1d: 6 * 60 * 60,
  historicalDefault: 24 * 60 * 60,
  positions: 3 * 60 * 60,
  transactions: 3 * 60 * 60,
} as const;

const normalize = (value: string) => value.toLowerCase();

export const earnCacheTags = {
  opportunities: () => ['earn', 'earn:opportunities'],
  opportunity: (id: string) => ['earn', 'earn:opportunities', `earn:opportunity:${normalize(id)}`],
  historical: () => ['earn', 'earn:historical'],
  historicalOpportunity: (id: string) => [
    'earn',
    'earn:historical',
    `earn:historical:${normalize(id)}`,
  ],
  positions: (wallet: string) => ['earn', 'earn:positions', `earn:positions:${normalize(wallet)}`],
  transactions: (wallet: string, opportunityId?: string) => {
    const tags = ['earn', 'earn:transactions', `earn:transactions:${normalize(wallet)}`];
    if (opportunityId) {
      tags.push(`earn:transactions:${normalize(wallet)}:${normalize(opportunityId)}`);
    }
    return tags;
  },
  userAction: (wallet: string, opportunityId?: string) => [
    `earn:positions:${normalize(wallet)}`,
    opportunityId
      ? `earn:transactions:${normalize(wallet)}:${normalize(opportunityId)}`
      : `earn:transactions:${normalize(wallet)}`,
  ],
};
