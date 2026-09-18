import { normalizeAddress } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

export async function getUsdcToken(params: {
  tokenAddress: string;
  parentChainId: number;
  childChainId: number;
}) {
  if (
    getWalletEcosystem(params.parentChainId) !== 'evm' ||
    getWalletEcosystem(params.childChainId) !== 'evm'
  )
    return null;
  return (await import('./evm/tokenMetadata')).getUsdcToken(params);
}
export async function getTokenData(address: string, chainId: number) {
  if (getWalletEcosystem(chainId) !== 'evm')
    throw new Error('Token metadata lookup is unavailable for this chain');
  return (await import('./evm/tokenMetadata')).getTokenData(address, chainId);
}
export async function getValidatedTokenData(address: string, chainId: number) {
  if (getWalletEcosystem(chainId) !== 'evm')
    throw new Error('Token import is unavailable for this chain');
  return (await import('./evm/tokenMetadata')).getValidatedTokenData(address, chainId);
}
export async function getParentTokenAddress(address: string, chainId: number) {
  if (getWalletEcosystem(chainId) !== 'evm')
    return { address: normalizeAddress(address), hasParentAddress: false };
  const parent = await (
    await import('./evm/tokenMetadata')
  ).getParentTokenAddress(address, chainId);
  return { address: normalizeAddress(parent ?? address), hasParentAddress: parent !== null };
}
