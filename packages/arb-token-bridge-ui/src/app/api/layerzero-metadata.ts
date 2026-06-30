import { unstable_noStore as noStore, unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { isRecord } from '../../util/isRecord';

const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

// LayerZero token/chain metadata changes rarely, so cache it for an hour to
// avoid hammering the upstream API on every client request.
const CACHE_SECONDS = 60 * 60;

type TrimmedTokenMetadata = {
  type?: unknown;
  peggedTo: boolean;
};

type TrimmedChainMetadata = {
  chainDetails: { nativeChainId: unknown };
  tokens: Record<string, TrimmedTokenMetadata>;
};

// The upstream payload is ~3.8MB; the client only needs each chain's
// `nativeChainId` and, per token, its `type` and whether it is pegged. Trimming
// here keeps the cached response small (well under the data cache size limit)
// and avoids shipping the full payload to every client.
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

      trimmedTokens[tokenAddress] = {
        type: tokenMetadata.type,
        peggedTo: Boolean(tokenMetadata.peggedTo),
      };
    }

    trimmed[chainKey] = {
      chainDetails: { nativeChainId: chainDetails.nativeChainId },
      tokens: trimmedTokens,
    };
  }

  return trimmed;
}

// Cache the trimmed metadata in the Next.js data cache so the upstream API is
// hit at most once per `CACHE_SECONDS` across the whole deployment. A failed
// fetch throws and is not cached, so the next request retries.
const getCachedLayerZeroMetadata = unstable_cache(
  async () => {
    const response = await fetch(LAYERZERO_METADATA_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`LayerZero metadata request failed with status ${response.status}`);
    }

    const trimmed = trimLayerZeroMetadata(await response.json());

    // An empty result means the upstream payload was missing or in an
    // unexpected shape. Throw so it isn't cached — otherwise a single bad
    // response would disable native-OFT detection for the whole revalidate
    // window. The next request then retries.
    if (Object.keys(trimmed).length === 0) {
      throw new Error('LayerZero metadata response was empty or malformed');
    }

    return trimmed;
  },
  ['layerzero-metadata'],
  { revalidate: CACHE_SECONDS },
);

export async function GET(): Promise<NextResponse> {
  // Opt out of static rendering so the handler runs per request and the
  // `unstable_cache` revalidation/retry above is the source of truth (matches
  // the other unstable_cache-backed routes in this app).
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
