import { utils } from 'ethers';

import { normalizeAddress } from '../util/AddressUtils';
import { isValidAddressForChain } from '../util/isValidAddressForChain';
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
  if (!isValidAddressForChain(address, chainId)) throw new Error('Invalid token address.');
  const validatedAddress = normalizeAddress(utils.getAddress(address));
  return (await implementation()).getTokenData(validatedAddress, chainId);
}
export async function getValidatedTokenData(address: string, chainId: number) {
  const implementation = implementations[getWalletEcosystem(chainId)];
  if (!implementation) throw new Error('Token import is unavailable for this chain');
  return (await implementation()).getValidatedTokenData(address, chainId);
}
export async function getParentTokenAddress(address: string, chainId: number) {
  const implementation = implementations[getWalletEcosystem(chainId)];
  if (!implementation) return { address: normalizeAddress(address), hasParentAddress: false };
  if (!isValidAddressForChain(address, chainId)) throw new Error('Invalid token address.');
  const validatedAddress = normalizeAddress(utils.getAddress(address));
  const parent = await (await implementation()).getParentTokenAddress(validatedAddress, chainId);
  return { address: normalizeAddress(parent ?? address), hasParentAddress: parent !== null };
}
