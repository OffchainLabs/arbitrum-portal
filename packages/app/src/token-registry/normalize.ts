import { curatedTokenMetadata } from './constants';
import { Address, Token, toTokenId } from './types';

type RawToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

export function normalizeToken(raw: RawToken): Token {
  const id = toTokenId(raw.chainId, raw.address);
  const curated = curatedTokenMetadata[id];

  return {
    id,
    chainId: raw.chainId,
    address: raw.address.toLowerCase() as Address,
    symbol: curated?.symbol ?? raw.symbol,
    name: curated?.name ?? raw.name,
    decimals: raw.decimals,
    logoURI: curated?.logoURI ?? raw.logoURI,
  };
}
