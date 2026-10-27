import { getCachedLayerZeroMetadata } from '@/bridge/app/api/layerzero-metadata';
import { isCanonicalDepositBlocked } from '@/bridge/util/WithdrawOnlyUtils';
import {
  getLayerZeroOftInfoFromMetadata,
  isKnownLayerZeroTokenFromMetadata,
} from '@/bridge/util/layerZeroMetadata';

import { Address } from '../types';
import { getPublicClient } from './publicClient';

export type LayerZeroMetadata = Awaited<ReturnType<typeof getCachedLayerZeroMetadata>>;

// Throws when LayerZero is unavailable, so a cold build fails instead of dropping the block.
export function getLayerZeroMetadata(): Promise<LayerZeroMetadata> {
  return getCachedLayerZeroMetadata();
}

const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';

// viem splits a multicall by calldata size. oftVersion() calldata is 4 bytes, so each call
// checks about 500 tokens.
const MULTICALL_BATCH_BYTES = 2_000;

const oftAbi = [
  {
    type: 'function',
    name: 'oftVersion',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'interfaceId', type: 'bytes4' },
      { name: 'version', type: 'uint64' },
    ],
  },
] as const;

export function isListedByLayerZero({
  metadata,
  chainId,
  address,
}: {
  metadata: LayerZeroMetadata;
  chainId: number;
  address: Address;
}): boolean {
  return isKnownLayerZeroTokenFromMetadata(metadata, { chainId, tokenAddress: address });
}

// Fallback for tokens that LayerZero does not list yet. A token that answers oftVersion() is an
// OFT. A failed call counts as not an OFT, as on master.
export async function findOftTokens({
  chainId,
  addresses,
}: {
  chainId: number;
  addresses: Address[];
}): Promise<Set<Address>> {
  if (addresses.length === 0) {
    return new Set();
  }

  const results = await getPublicClient(chainId).multicall({
    contracts: addresses.map((address) => ({
      address,
      abi: oftAbi,
      functionName: 'oftVersion' as const,
    })),
    allowFailure: true,
    multicallAddress: MULTICALL3_ADDRESS,
    batchSize: MULTICALL_BATCH_BYTES,
  });
  return new Set(addresses.filter((_address, index) => results[index]?.status === 'success'));
}

// Master's isBlockedOftDeposit rule. The registry already knows the canonical child token, so the
// check needs no gateway call.
export function isOftDepositBlocked({
  metadata,
  parentChainId,
  childChainId,
  parentTokenAddress,
  childTokenAddress,
  isOftOnChain,
}: {
  metadata: LayerZeroMetadata;
  parentChainId: number;
  childChainId: number;
  parentTokenAddress: Address;
  childTokenAddress: Address;
  isOftOnChain: boolean;
}): boolean {
  const { isOft, hasOftChildDeployment } = getLayerZeroOftInfoFromMetadata(metadata, {
    parentChainId,
    parentTokenAddress,
    childChainId,
  });
  if (!isOft) {
    return isOftOnChain;
  }

  return isCanonicalDepositBlocked({
    canonicalChildTokenAddress: childTokenAddress,
    canonicalIsKnownLayerZeroToken: isListedByLayerZero({
      metadata,
      chainId: childChainId,
      address: childTokenAddress,
    }),
    hasOftChildDeployment,
  });
}

export async function isImportedOftDepositBlocked({
  parentChainId,
  childChainId,
  parentTokenAddress,
  childTokenAddress,
}: {
  parentChainId: number;
  childChainId: number;
  parentTokenAddress: Address;
  childTokenAddress: Address;
}): Promise<boolean> {
  const metadata = await getLayerZeroMetadata();
  const isOftOnChain =
    !isListedByLayerZero({ metadata, chainId: parentChainId, address: parentTokenAddress }) &&
    (await findOftTokens({ chainId: parentChainId, addresses: [parentTokenAddress] })).has(
      parentTokenAddress,
    );

  return isOftDepositBlocked({
    metadata,
    parentChainId,
    childChainId,
    parentTokenAddress,
    childTokenAddress,
    isOftOnChain,
  });
}
