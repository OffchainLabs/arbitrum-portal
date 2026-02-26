/**
 * Liquid staking constants (constants-only, no Node.js dependencies)
 * This file can be safely imported by frontend code
 */

/**
 * Liquid staking token addresses on Arbitrum One (Chain ID: 42161)
 */
export const WSTETH_ADDRESS = '0x5979d7b546e38e414f7e9822514be443a4800529';
export const WEETH_ADDRESS = '0x35751007a407ca6feffe80b3cb397736d2cf4dbe';

/**
 * Input tokens for liquid staking swaps on Arbitrum One
 */
export const ARBITRUM_ONE_TOKEN_ADDRESSES = {
  ETH: '0x0000000000000000000000000000000000000000', // Native ETH
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
} as const;
