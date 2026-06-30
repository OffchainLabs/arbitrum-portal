import { getAPIBaseUrl } from '.';
import { isRecord } from './isRecord';

// Our own cached route handler, not the LayerZero API directly (see app/api/layerzero-metadata).
const LAYERZERO_METADATA_URL = `${getAPIBaseUrl()}/api/layerzero-metadata`;

// `NativeOFT` is a token whose own contract implements the OFT interface (responds to
// `oftVersion()` on-chain). Plain ERC20s bridged via a separate OFT Adapter are typed
// `ERC20` and don't, so they must not be treated as native OFTs.
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

    if (Number(chainDetails.nativeChainId) === chainId) {
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

  // Don't cache a failed response — let the next caller retry.
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

  // A pegged token is a representation of an OFT native to another chain.
  if (tokenMetadata.peggedTo) {
    return false;
  }

  if (tokenMetadata.type === LAYERZERO_NATIVE_OFT_TYPE) {
    return true;
  }

  // Unknown (e.g. an ERC20 using an OFT Adapter) — defer to the on-chain check.
  return null;
}

export function resetLayerZeroMetadataCache() {
  layerZeroMetadataPromise = null;
}
