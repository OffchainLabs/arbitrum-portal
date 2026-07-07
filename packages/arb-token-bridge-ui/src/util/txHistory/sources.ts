export type CanonicalSource = 'indexer' | 'subgraph';

export function parseChainIds(raw: string | undefined): number[] {
  if (!raw) {
    return [];
  }

  const ids = raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return Array.from(new Set(ids));
}

export const INDEXER_CHILD_CHAIN_IDS = parseChainIds(
  process.env.NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS,
);

export function isChildChainIndexed(childChainId: number): boolean {
  return INDEXER_CHILD_CHAIN_IDS.includes(childChainId);
}

export function getCanonicalSource(childChainId: number): CanonicalSource {
  return isChildChainIndexed(childChainId) ? 'indexer' : 'subgraph';
}
