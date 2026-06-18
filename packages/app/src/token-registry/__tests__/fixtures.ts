import { Token, addressFromTokenId } from '../types';

export const DAI_ETHEREUM = '0x6b175474e89094c44da98b954eedeac495271d0f' as Token['address'];
export const DAI_ARBITRUM = '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1' as Token['address'];

export function getFixtureToken(id: Token['id']): Token {
  const [chainId] = id.split(':');
  return {
    id,
    chainId: Number(chainId),
    address: addressFromTokenId(id),
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
  };
}
