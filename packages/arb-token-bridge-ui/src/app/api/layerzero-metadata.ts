import { unstable_noStore as noStore, unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { isRecord } from '../../util';

const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

const CACHE_SECONDS = 60 * 60;

// `peggedTo` links a representation token back to its native chain + address.
type TrimmedTokenMetadata = {
  peggedTo?: { address: string; chainName: string };
};

type TrimmedChainMetadata = {
  chainDetails: { nativeChainId: number };
  tokens: Record<string, TrimmedTokenMetadata>;
};

// The upstream payload is ~3.8MB; keep only what the client needs so the cached
// response stays under the data cache size limit and isn't shipped in full.
function trimLayerZeroMetadata(metadata: unknown): Record<string, TrimmedChainMetadata> {
  const trimmed: Record<string, TrimmedChainMetadata> = {};

  if (!isRecord(metadata)) {
    return trimmed;
  }

  for (const [chainKey, chainMetadata] of Object.entries(metadata)) {
    if (!isRecord(chainMetadata)) {
      continue;
    }

    const { chainDetails, tokens } = chainMetadata;
    if (!isRecord(chainDetails) || !isRecord(tokens)) {
      continue;
    }

    const trimmedTokens: Record<string, TrimmedTokenMetadata> = {};
    for (const [tokenAddress, tokenMetadata] of Object.entries(tokens)) {
      if (!isRecord(tokenMetadata)) {
        continue;
      }

      const { peggedTo } = tokenMetadata;
      trimmedTokens[tokenAddress.toLowerCase()] =
        isRecord(peggedTo) &&
        typeof peggedTo.address === 'string' &&
        typeof peggedTo.chainName === 'string'
          ? { peggedTo: { address: peggedTo.address.toLowerCase(), chainName: peggedTo.chainName } }
          : {};
    }

    const nativeChainId = Number(chainDetails.nativeChainId);

    trimmed[chainKey] = {
      chainDetails: { nativeChainId },
      tokens: trimmedTokens,
    };
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
