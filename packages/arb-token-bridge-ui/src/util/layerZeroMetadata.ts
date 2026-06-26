const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

// LayerZero classifies a token whose own contract implements the OFT interface
// (i.e. responds to `oftVersion()` on-chain) as `NativeOFT`. Plain ERC20s that
// are bridged through a separate OFT Adapter are typed `ERC20` and do NOT
// implement `oftVersion()` themselves, so they must not be treated as native OFTs.
const LAYERZERO_NATIVE_OFT_TYPE = 'NativeOFT';

type LayerZeroTokenMetadata = {
  type?: unknown;
  peggedTo?: unknown;
};

type LayerZeroChainMetadata = {
  chainDetails?: {
    nativeChainId?: unknown;
  };
  tokens?: Record<string, LayerZeroTokenMetadata>;
};

let layerZeroMetadataPromise: Promise<unknown> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getLayerZeroChainMetadata(
  metadata: unknown,
  chainId: number,
): LayerZeroChainMetadata | null {
  if (!isRecord(metadata)) {
    return null;
  }

  for (const chainMetadata of Object.values(metadata)) {
    if (!isRecord(chainMetadata)) {
      continue;
    }

    const chainDetails = chainMetadata.chainDetails;
    if (!isRecord(chainDetails)) {
      continue;
    }

    if (chainDetails.nativeChainId === chainId) {
      return chainMetadata;
    }
  }

  return null;
}

function getLayerZeroTokenMetadata(
  metadata: unknown,
  chainId: number,
  tokenAddress: string,
): LayerZeroTokenMetadata | null {
  const chainMetadata = getLayerZeroChainMetadata(metadata, chainId);

  if (!chainMetadata?.tokens || !isRecord(chainMetadata.tokens)) {
    return null;
  }

  // The metadata keys tokens by their lower-cased address, so look it up directly.
  const tokenMetadata = chainMetadata.tokens[tokenAddress.toLowerCase()];

  return isRecord(tokenMetadata) ? tokenMetadata : null;
}

async function getLayerZeroMetadata() {
  if (!layerZeroMetadataPromise) {
    layerZeroMetadataPromise = fetch(LAYERZERO_METADATA_URL)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }

  const metadata = await layerZeroMetadataPromise;

  // Don't cache a failed/empty response — clear the cache so the next caller
  // retries instead of being stuck with `null` for the rest of the session.
  if (metadata === null) {
    layerZeroMetadataPromise = null;
  }

  return metadata;
}

export async function getLayerZeroNativeTokenStatus({
  chainId,
  tokenAddress,
}: {
  chainId: number;
  tokenAddress: string;
}) {
  const metadata = await getLayerZeroMetadata();
  return getLayerZeroNativeTokenStatusFromMetadata(metadata, {
    chainId,
    tokenAddress,
  });
}

export function getLayerZeroNativeTokenStatusFromMetadata(
  metadata: unknown,
  {
    chainId,
    tokenAddress,
  }: {
    chainId: number;
    tokenAddress: string;
  },
) {
  const tokenMetadata = getLayerZeroTokenMetadata(metadata, chainId, tokenAddress);

  if (!tokenMetadata) {
    return null;
  }

  // A pegged token is a representation of an OFT that lives natively on another
  // chain, so it is explicitly not a native OFT here.
  if (tokenMetadata.peggedTo) {
    return false;
  }

  // Only tokens whose own contract is the OFT count as native. Anything else
  // (e.g. plain ERC20s using an OFT Adapter) is left to the on-chain fallback.
  if (tokenMetadata.type === LAYERZERO_NATIVE_OFT_TYPE) {
    return true;
  }

  return null;
}

export function resetLayerZeroMetadataCache() {
  layerZeroMetadataPromise = null;
}
