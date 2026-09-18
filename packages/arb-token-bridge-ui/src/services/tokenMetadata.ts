import { normalizeAddress } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

const implementations: Record<
  WalletEcosystem,
  (() => Promise<typeof import('./evm/tokenMetadata')>) | null
> = {
  evm: () => import('./evm/tokenMetadata'),
  solana: null,
};

export async function getUsdcToken(params: {
  tokenAddress: string;
  parentChainId: number;
  childChainId: number;
}) {
  const ecosystem = getWalletEcosystem(params.parentChainId);
  const implementation = implementations[ecosystem];
  if (!implementation || ecosystem !== getWalletEcosystem(params.childChainId)) return null;
  return (await implementation()).getUsdcToken(params);
}
export async function getTokenData(address: string, chainId: number) {
  const implementation = implementations[getWalletEcosystem(chainId)];
  if (!implementation) throw new Error('Token metadata lookup is unavailable for this chain');
  return (await implementation()).getTokenData(address, chainId);
}
export async function getValidatedTokenData(address: string, chainId: number) {
  const implementation = implementations[getWalletEcosystem(chainId)];
  if (!implementation) throw new Error('Token import is unavailable for this chain');
  return (await implementation()).getValidatedTokenData(address, chainId);
}
export async function getParentTokenAddress(address: string, chainId: number) {
  const implementation = implementations[getWalletEcosystem(chainId)];
  if (!implementation) return { address: normalizeAddress(address), hasParentAddress: false };
  const parent = await (await implementation()).getParentTokenAddress(address, chainId);
  return { address: normalizeAddress(parent ?? address), hasParentAddress: parent !== null };
}
