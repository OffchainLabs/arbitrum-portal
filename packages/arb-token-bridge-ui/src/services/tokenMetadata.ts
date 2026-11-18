import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { parseAddressForChain } from '../util/AddressUtils';
import { Erc20Data, fetchErc20Data, getL1ERC20Address, isValidErc20 } from '../util/TokenUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

type TokenMetadataReader = {
  fetchTokenData: (address: string, chainId: number) => Promise<Erc20Data>;
  isValidToken: (address: string, chainId: number) => Promise<boolean>;
  fetchParentTokenAddress: (address: string, chainId: number) => Promise<string | null>;
};

const tokenMetadataReaders: Record<WalletEcosystem, TokenMetadataReader | null> = {
  evm: {
    fetchTokenData: (address, chainId) =>
      fetchErc20Data({ address, provider: getProviderForChainId(chainId) }),
    isValidToken: (address, chainId) =>
      isValidErc20({ address, provider: getProviderForChainId(chainId) }),
    fetchParentTokenAddress: (address, chainId) =>
      getL1ERC20Address({ erc20L2Address: address, l2Provider: getProviderForChainId(chainId) }),
  },
  solana: null,
};

function getTokenMetadataReader(chainId: number): TokenMetadataReader {
  const reader = tokenMetadataReaders[getWalletEcosystem(chainId)];
  if (!reader) {
    throw new Error('Token metadata lookup is unavailable for this chain');
  }
  return reader;
}

function parseTokenAddress(address: string, chainId: number): string {
  const tokenAddress = parseAddressForChain(address, chainId);
  if (!tokenAddress) {
    throw new Error('Invalid token address.');
  }
  return tokenAddress;
}

export async function getTokenData(address: string, chainId: number): Promise<Erc20Data> {
  return getTokenMetadataReader(chainId).fetchTokenData(
    parseTokenAddress(address, chainId),
    chainId,
  );
}

export async function getValidatedTokenData(address: string, chainId: number): Promise<Erc20Data> {
  const reader = getTokenMetadataReader(chainId);
  if (!(await reader.isValidToken(address, chainId))) {
    throw new Error(`${address} is not a valid ERC-20 token`);
  }
  return reader.fetchTokenData(address, chainId);
}

export async function getParentTokenAddress(
  address: string,
  chainId: number,
): Promise<{ address: string; hasParentAddress: boolean }> {
  const tokenAddress = parseTokenAddress(address, chainId);
  // Chains without a token bridge reader have no parent chain token
  const reader = tokenMetadataReaders[getWalletEcosystem(chainId)];
  const parentAddress = reader ? await reader.fetchParentTokenAddress(tokenAddress, chainId) : null;

  return {
    address: parentAddress?.toLowerCase() ?? tokenAddress,
    hasParentAddress: parentAddress !== null,
  };
}
