import { zeroAddress } from 'viem';

import { getWalletEcosystem } from './getWalletEcosystem';
import type { WalletEcosystem } from './types';

export const SOLANA_NATIVE_TOKEN_ADDRESS = '11111111111111111111111111111111';

const nativeTokenAddresses: Record<WalletEcosystem, string> = {
  evm: zeroAddress,
  solana: SOLANA_NATIVE_TOKEN_ADDRESS,
};

const nativeTokenPriceAddresses: Record<WalletEcosystem, string | undefined> = {
  evm: undefined,
  solana: SOLANA_NATIVE_TOKEN_ADDRESS,
};

export function getNativeTokenAddress(chainId: number) {
  return nativeTokenAddresses[getWalletEcosystem(chainId)];
}

export function getNativeTokenPriceAddress(chainId: number) {
  return nativeTokenPriceAddresses[getWalletEcosystem(chainId)];
}
