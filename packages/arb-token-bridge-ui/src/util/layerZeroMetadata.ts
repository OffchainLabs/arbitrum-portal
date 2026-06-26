const LAYERZERO_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata';

type LayerZeroTokenMetadata = {
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

  const tokenAddressLowerCase = tokenAddress.toLowerCase();

  for (const [metadataTokenAddress, tokenMetadata] of Object.entries(chainMetadata.tokens)) {
    if (metadataTokenAddress.toLowerCase() !== tokenAddressLowerCase || !isRecord(tokenMetadata)) {
      continue;
    }

    return tokenMetadata;
  }

  return null;
}

async function getLayerZeroMetadata() {
  if (!layerZeroMetadataPromise) {
    layerZeroMetadataPromise = fetch(LAYERZERO_METADATA_URL)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }

  return layerZeroMetadataPromise;
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

  return !tokenMetadata.peggedTo;
}

export function resetLayerZeroMetadataCache() {
  layerZeroMetadataPromise = null;
}
