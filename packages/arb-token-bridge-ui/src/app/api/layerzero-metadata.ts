import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

    return trimLayerZeroMetadata(await response.json());
  },
  ['layerzero-metadata'],
  { revalidate: CACHE_SECONDS },
);

export async function GET(): Promise<NextResponse> {
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
