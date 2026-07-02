import { getAPIBaseUrl, isRecord } from '.';

// Our own cached route handler, not the LayerZero API directly (see app/api/layerzero-metadata).
const LAYERZERO_METADATA_URL = `${getAPIBaseUrl()}/api/layerzero-metadata`;

type LayerZeroPeggedTo = {
  address: string;
  chainName: string;
};

export type LayerZeroOftInfo = {
  // Whether the token has a LayerZero OFT deployment on the parent chain.
  isOft: boolean;
  // Lower-cased addresses of the same token's OFT deployments on the child chain.
  childTokenAddresses: string[];
};

let layerZeroMetadataPromise: Promise<unknown> | null = null;

// The chain + address a token is natively deployed on (its own address if native,
// else its `peggedTo` target).
type TokenRoot = LayerZeroPeggedTo;

function getChainByNativeChainId(
  metadata: unknown,
  chainId: number,
): { chainName: string; tokens: Record<string, unknown> } | null {
  if (!isRecord(metadata)) {
    return null;
  }

  for (const [chainName, chainMetadata] of Object.entries(metadata)) {
    if (!isRecord(chainMetadata) || !isRecord(chainMetadata.chainDetails)) {
      continue;
    }

    if (Number(chainMetadata.chainDetails.nativeChainId) === chainId) {
      return {
        chainName,
        tokens: isRecord(chainMetadata.tokens) ? chainMetadata.tokens : {},
      };
    }
  }

  return null;
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

  const parentChain = getChainByNativeChainId(metadata, parentChainId);
  if (!parentChain) {
    return notOft;
  }

  const parentTokenMetadata = parentChain.tokens[parentTokenAddress.toLowerCase()];
  if (!isRecord(parentTokenMetadata)) {
    return notOft;
  }

  const root: TokenRoot = getPeggedTo(parentTokenMetadata) ?? {
    chainName: parentChain.chainName,
    address: parentTokenAddress.toLowerCase(),
  };

  const childChain = getChainByNativeChainId(metadata, childChainId);
  if (!childChain) {
    return { isOft: true, childTokenAddresses: [] };
  }

  const childTokenAddresses: string[] = [];
  for (const [address, tokenMetadata] of Object.entries(childChain.tokens)) {
    const peggedTo = getPeggedTo(tokenMetadata);
    const matchesRoot = peggedTo
      ? peggedTo.chainName === root.chainName && peggedTo.address === root.address
      : childChain.chainName === root.chainName && address.toLowerCase() === root.address;

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
