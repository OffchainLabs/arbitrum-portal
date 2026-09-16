import { zeroAddress } from 'viem';

import { ChainId } from '../types/ChainId';

export const SOLANA_NATIVE_TOKEN_ADDRESS = '11111111111111111111111111111111';

export function getNativeTokenAddress(chainId: number) {
  return chainId === ChainId.Solana ? SOLANA_NATIVE_TOKEN_ADDRESS : zeroAddress;
}
