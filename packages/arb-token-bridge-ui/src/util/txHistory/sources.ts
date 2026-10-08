import { ChainId } from '../../types/ChainId';

/** `undefined` for anything that isn't a positive integer chain ID. */
export function parseChainId(raw: string | null | undefined): number | undefined {
  const chainId = Number(raw?.trim());

  return Number.isInteger(chainId) && chainId > 0 ? chainId : undefined;
}

export function parseChainIds(raw: string | undefined): number[] {
  if (!raw) {
    return [];
  }

  const ids = raw
    .split(',')
    .map((value) => parseChainId(value))
    .filter((chainId): chainId is number => typeof chainId !== 'undefined');

  return Array.from(new Set(ids));
}

// The core chains have no other history source, so a build missing the var
// must not leave them silently empty. A configured list still wins, which keeps
// moving a chain off the indexer an env change.
const DEFAULT_INDEXER_CHILD_CHAIN_IDS: readonly number[] = [
  ChainId.ArbitrumOne,
  ChainId.ArbitrumSepolia,
];

const configuredIndexerChildChainIds = parseChainIds(
  process.env.NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS,
);

export const INDEXER_CHILD_CHAIN_IDS =
  configuredIndexerChildChainIds.length > 0
    ? configuredIndexerChildChainIds
    : DEFAULT_INDEXER_CHILD_CHAIN_IDS;

export function isChildChainIndexed(childChainId: number): boolean {
  return INDEXER_CHILD_CHAIN_IDS.includes(childChainId);
}

function hasBridgeSubgraph(childChainId: number): boolean {
  return childChainId === ChainId.ArbitrumNova;
}

export function hasBridgeHistory(childChainId: number): boolean {
  return isChildChainIndexed(childChainId) || hasBridgeSubgraph(childChainId);
}
