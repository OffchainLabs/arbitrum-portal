import { VaultsSdk } from '@vaultsfyi/sdk';

if (!process.env.VAULTS_FYI_API_KEY) {
  throw new Error('VAULTS_FYI_API_KEY is not set');
}

export const vaultsSdk = new VaultsSdk({
  apiKey: process.env.VAULTS_FYI_API_KEY,
});

export const DEFAULT_ALLOWED_ASSETS = [
  'cbETH',
  'ETH',
  'ETHx',
  'ezETH',
  'frxETH',
  'msETH',
  'osETH',
  'pufETH',
  'rETH',
  'rsETH',
  'stETH',
  'tETH',
  'UETH',
  'waEthWETH',
  'weETH',
  'weETHs',
  'WETH',
  'wstETH',
  'yETH',
  'AUSD',
  'BOLD',
  'crvUSD',
  'cUSD',
  'DAI',
  'DOLA',
  'eUSD',
  'eUSDe',
  'FDUSD',
  'FRAX',
  'GHO',
  'GUSD',
  'iUSD',
  'LUSD',
  'lvlUSD',
  'PYUSD',
  'RLUSD',
  'rUSD',
  'sBOLD',
  'sDAI',
  'srUSD',
  'sUSD',
  'sUSDC',
  'sUSDe',
  'sUSDf',
  'sUSDS',
  'TUSD',
  'USD₮',
  'USD₮0',
  'USD0',
  'USD0++',
  'USD1',
  'USDA',
  'USDaf',
  'USDbC',
  'USDC',
  'USDC.e',
  'USDe',
  'USDf',
  'USDG',
  'USDM',
  'USDP',
  'USDS',
  'USDT',
  'USDT0',
  'USDtb',
  'USR',
  'waEthUSDC',
  'waEthUSDT',
  'wM',
  'wstUSR',
  'wUSDL',
  'WXDAI',
  'YUSD',
  'BTCB',
  'cbBTC',
  'eBTC',
  'kBTC',
  'LBTC',
  'tBTC',
  'UBTC',
  'WBTC',
  'ARB',
] as const;

export function formatTVL(tvl: number): string {
  if (tvl >= 1e12) {
    return `$${(tvl / 1e12).toFixed(1)}T`;
  }
  if (tvl >= 1e9) {
    return `$${(tvl / 1e9).toFixed(1)}B`;
  }
  if (tvl >= 1e6) {
    return `$${(tvl / 1e6).toFixed(1)}M`;
  }
  if (tvl >= 1e3) {
    return `$${(tvl / 1e3).toFixed(1)}K`;
  }
  return `$${tvl.toFixed(2)}`;
}

export function formatAPY(apy: number): string {
  if (apy < 0.01) {
    return `${apy.toFixed(4)}%`;
  }
  if (apy < 1) {
    return `${apy.toFixed(3)}%`;
  }
  return `${apy.toFixed(2)}%`;
}
