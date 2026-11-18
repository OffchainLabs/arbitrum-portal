import { unstable_cache } from 'next/cache';
import { isAddress } from 'viem';

import { Address, ChainPair, SelectedTokenAvailability, pairKey } from '../types';
import { CanonicalBridge, isCanonicalDeposit } from './canonicalBridge';
import { findOftTokens, getLayerZeroMetadata, isImportedOftDepositBlocked } from './oftDeposits';
import { resolveImport } from './resolveImport';

// The same key as before the move, so both PoC pages share the cached imports.
const IMPORT_CACHE_VERSION = 4;

// A canonical route that the token lists do not have yet: the import reads the chains, caches the
// result for an hour and applies the OFT deposit block.
export function getCachedImport({
  bridge,
  pair,
  sourceTokenAddress,
}: {
  bridge: CanonicalBridge;
  pair: ChainPair;
  sourceTokenAddress: Address;
}): Promise<SelectedTokenAvailability | null> {
  const key = `token-registry-import-${pairKey(pair)}-${sourceTokenAddress}-v${IMPORT_CACHE_VERSION}`;
  return unstable_cache(
    async () => {
      const isDeposit = isCanonicalDeposit(pair, bridge);
      // A deposit's OFT check reads the parent token, which is the source token unless the user
      // pasted its child address. Its oftVersion() read goes out with the import's reads, and the
      // LayerZero metadata loads meanwhile.
      const pendingOftCheck =
        isDeposit && isAddress(sourceTokenAddress)
          ? findOftTokens({ chainId: pair.sourceChainId, addresses: [sourceTokenAddress] })
          : undefined;
      // Nothing awaits the read when the import fails or resolves another parent token.
      pendingOftCheck?.catch(() => {});
      const [imported, layerZeroMetadata] = await Promise.all([
        resolveImport({ bridge, pair, rawAddress: sourceTokenAddress }),
        isDeposit ? getLayerZeroMetadata() : Promise.resolve(null),
      ]);
      const isBlocked =
        imported &&
        layerZeroMetadata &&
        (await isImportedOftDepositBlocked({
          metadata: layerZeroMetadata,
          parentChainId: pair.sourceChainId,
          childChainId: pair.destinationChainId,
          parentTokenAddress: imported.sourceToken.address,
          childTokenAddress: imported.destinationToken.address,
          pendingOftCheck:
            imported.sourceToken.address === sourceTokenAddress ? pendingOftCheck : undefined,
        }));
      return isBlocked ? null : imported;
    },
    [key],
    { revalidate: 3_600, tags: [key] },
  )();
}
