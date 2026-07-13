import { unstable_noStore as noStore, unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { ChainId } from '../../types/ChainId';
import { isRecord } from '../../util';

const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

const CACHE_SECONDS = 60 * 60;

// LayerZero's `nativeChainId` is not unique (e.g. both Aptos and Ethereum report
// `1`), so we map each chain we bridge to its `chainKey` explicitly — dropping the
// chains we don't care about and avoiding that ambiguity.
const LZ_CHAIN_KEY_BY_CHAIN_ID: { chainId: number; chainKey: string }[] = [
  { chainId: ChainId.Ethereum, chainKey: 'ethereum' },
  { chainId: ChainId.Sepolia, chainKey: 'sepolia-testnet' },
  { chainId: ChainId.ArbitrumOne, chainKey: 'arbitrum' },
  { chainId: ChainId.ArbitrumNova, chainKey: 'nova' },
  { chainId: ChainId.ArbitrumSepolia, chainKey: 'arbitrum-sepolia' },
  { chainId: ChainId.Base, chainKey: 'base' },
  { chainId: ChainId.BaseSepolia, chainKey: 'base-sepolia' },
  { chainId: ChainId.ApeChain, chainKey: 'ape' },
  { chainId: ChainId.RobinhoodChain, chainKey: 'robinhood' },
  { chainId: ChainId.Superposition, chainKey: 'superposition' },
  { chainId: 98866, chainKey: 'plumephoenix' }, // Plume
  { chainId: 1625, chainKey: 'gravity' }, // Gravity Alpha
  { chainId: 41923, chainKey: 'edu' }, // Edu Chain
  { chainId: 660279, chainKey: 'xai' }, // Xai
];

// LayerZero `type` values that denote an actual OFT deployment, as opposed to a
// plain ERC20/NativeToken canonical representation that LayerZero merely tracks.
const OFT_TOKEN_TYPES = new Set(['OFT', 'NativeOFT', 'ProxyOFT']);

type TrimmedTokenMetadata = {
  isOft: boolean;
  peggedTo?: { address: string; chainName: string };
};

type TrimmedChainMetadata = {
  chainKey: string;
  tokens: Record<string, TrimmedTokenMetadata>;
};

// Reduce the ~3.8MB LayerZero payload to the chains we bridge, keyed by our chain id.
export function trimLayerZeroMetadata(metadata: unknown): Record<number, TrimmedChainMetadata> {
  const trimmed: Record<number, TrimmedChainMetadata> = {};

  if (!isRecord(metadata)) {
    return trimmed;
  }

  for (const { chainId, chainKey } of LZ_CHAIN_KEY_BY_CHAIN_ID) {
    const chainMetadata = metadata[chainKey];
    if (!isRecord(chainMetadata) || !isRecord(chainMetadata.tokens)) {
      continue;
    }

    const tokens: Record<string, TrimmedTokenMetadata> = {};
    for (const [tokenAddress, tokenMetadata] of Object.entries(chainMetadata.tokens)) {
      if (!isRecord(tokenMetadata)) {
        continue;
      }

      const { peggedTo, type } = tokenMetadata;
      const isOft = typeof type === 'string' && OFT_TOKEN_TYPES.has(type);
      tokens[tokenAddress.toLowerCase()] =
        isRecord(peggedTo) &&
        typeof peggedTo.address === 'string' &&
        typeof peggedTo.chainName === 'string'
          ? {
              isOft,
              peggedTo: { address: peggedTo.address.toLowerCase(), chainName: peggedTo.chainName },
            }
          : { isOft };
    }

    trimmed[chainId] = { chainKey, tokens };
  }

  return trimmed;
}

// Cache in the data cache so upstream is hit at most once per `CACHE_SECONDS`
// across the deployment. Failures throw (below) and aren't cached, so they retry.
const getCachedLayerZeroMetadata = unstable_cache(
  async () => {
    const response = await fetch(LAYERZERO_METADATA_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`LayerZero metadata request failed with status ${response.status}`);
    }

    const trimmed = trimLayerZeroMetadata(await response.json());

    // Empty means a missing/unexpected payload — throw so it isn't cached for
    // the whole revalidate window.
    if (Object.keys(trimmed).length === 0) {
      throw new Error('LayerZero metadata response was empty or malformed');
    }

    return trimmed;
  },
  ['layerzero-metadata'],
  { revalidate: CACHE_SECONDS },
);

export async function GET(): Promise<NextResponse> {
  // Opt out of static rendering so `unstable_cache` above stays the source of truth.
  noStore();

  try {
    const metadata = await getCachedLayerZeroMetadata();

    return NextResponse.json(metadata, {
      status: 200,
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    });
  } catch {
    return NextResponse.json(null, { status: 502 });
  }
}
