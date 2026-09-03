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

export const INDEXER_CHILD_CHAIN_IDS = parseChainIds(
  process.env.NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS,
);

export function isChildChainIndexed(childChainId: number): boolean {
  return INDEXER_CHILD_CHAIN_IDS.includes(childChainId);
}

function hasBridgeSubgraph(childChainId: number): boolean {
  return childChainId === ChainId.ArbitrumNova;
}

export function hasBridgeHistory(childChainId: number): boolean {
  return isChildChainIndexed(childChainId) || hasBridgeSubgraph(childChainId);
}
