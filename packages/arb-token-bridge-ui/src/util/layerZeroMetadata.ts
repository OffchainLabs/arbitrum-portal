import { getAPIBaseUrl, isRecord } from '.';
import { addressesEqual } from './AddressUtils';

// Our own cached route handler (already trimmed + chain-id-keyed), not the LayerZero API directly.
const LAYERZERO_METADATA_URL = `${getAPIBaseUrl()}/api/layerzero-metadata`;

type LayerZeroPeggedTo = {
  address: string;
  chainName: string;
};

export type LayerZeroOftInfo = {
  isOft: boolean;
  childTokenAddresses: string[];
};

let layerZeroMetadataPromise: Promise<unknown> | null = null;

// The chain + address a token is natively deployed on (`chainName` = LayerZero chainKey).
type TokenRoot = LayerZeroPeggedTo;

// The metadata is keyed by our own chain id (see trimLayerZeroMetadata), so we
// look it up directly rather than scanning LayerZero's non-unique `nativeChainId`.
function getChainMetadata(
  metadata: unknown,
  chainId: number,
): { chainKey: string; tokens: Record<string, unknown> } | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const chainMetadata = metadata[chainId];
  if (!isRecord(chainMetadata) || typeof chainMetadata.chainKey !== 'string') {
    return null;
  }

  return {
    chainKey: chainMetadata.chainKey,
    tokens: isRecord(chainMetadata.tokens) ? chainMetadata.tokens : {},
  };
}

function getPeggedTo(tokenMetadata: unknown): LayerZeroPeggedTo | null {
  if (!isRecord(tokenMetadata) || !isRecord(tokenMetadata.peggedTo)) {
    return null;
  }

  const { address, chainName } = tokenMetadata.peggedTo;
  if (typeof address !== 'string' || typeof chainName !== 'string') {
    return null;
  }

  return { address: address.toLowerCase(), chainName };
}

export function getLayerZeroOftInfoFromMetadata(
  metadata: unknown,
  {
    parentChainId,
    parentTokenAddress,
    childChainId,
  }: {
    parentChainId: number;
    parentTokenAddress: string;
    childChainId: number;
  },
): LayerZeroOftInfo {
  const notOft: LayerZeroOftInfo = { isOft: false, childTokenAddresses: [] };

  const parentChain = getChainMetadata(metadata, parentChainId);
  if (!parentChain) {
    return notOft;
  }

  const parentTokenMetadata = parentChain.tokens[parentTokenAddress.toLowerCase()];
  if (!isRecord(parentTokenMetadata)) {
    return notOft;
  }

  const root: TokenRoot = getPeggedTo(parentTokenMetadata) ?? {
    chainName: parentChain.chainKey,
    address: parentTokenAddress.toLowerCase(),
  };

  // No OFT deployment data for the destination → no OFT alternative there, so the
  // caller allows the canonical route (blocking would strand a token with no other path).
  const childChain = getChainMetadata(metadata, childChainId);
  if (!childChain) {
    return { isOft: true, childTokenAddresses: [] };
  }

  const childTokenAddresses: string[] = [];
  for (const [address, tokenMetadata] of Object.entries(childChain.tokens)) {
    const peggedTo = getPeggedTo(tokenMetadata);
    const matchesRoot = peggedTo
      ? peggedTo.chainName === root.chainName && addressesEqual(peggedTo.address, root.address)
      : childChain.chainKey === root.chainName && addressesEqual(address, root.address);

    if (matchesRoot) {
      childTokenAddresses.push(address.toLowerCase());
    }
  }

  return { isOft: true, childTokenAddresses };
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

export async function getLayerZeroOftInfo(params: {
  parentChainId: number;
  parentTokenAddress: string;
  childChainId: number;
}): Promise<LayerZeroOftInfo> {
  const metadata = await getLayerZeroMetadata();
  return getLayerZeroOftInfoFromMetadata(metadata, params);
}

export function resetLayerZeroMetadataCache() {
  layerZeroMetadataPromise = null;
}
