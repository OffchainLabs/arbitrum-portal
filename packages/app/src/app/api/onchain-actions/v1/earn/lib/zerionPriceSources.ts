import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

// Prefer `implementation` (chain:address); fall back to `fungibleId` for
// assets Zerion only exposes as a multi-chain abstraction.
// Docs: https://developers.zerion.io/reference/listfungibles
export type ZerionPriceLookup =
  | { kind: 'implementation'; implementation: `${string}:${string}` }
  | { kind: 'fungibleId'; fungibleId: string };

const ETH = 'ethereum';
const ARB = 'arbitrum';

const impl = (chain: typeof ETH | typeof ARB, address: string): ZerionPriceLookup => ({
  kind: 'implementation',
  implementation: `${chain}:${address.toLowerCase()}` as `${string}:${string}`,
});

const fungible = (fungibleId: string): ZerionPriceLookup => ({ kind: 'fungibleId', fungibleId });

// Used for vault assets exposed only by symbol (uppercased on lookup).
const PRICE_BY_SYMBOL: Record<string, ZerionPriceLookup> = {
  'ETH': impl(ETH, CommonAddress.Ethereum.WETH),
  'WETH': impl(ETH, CommonAddress.Ethereum.WETH),
  'WAETHWETH': impl(ETH, CommonAddress.Ethereum.WETH),

  // stETH and wstETH have distinct prices — do not collapse.
  'STETH': impl(ETH, CommonAddress.Ethereum.STETH),
  'WSTETH': impl(ETH, CommonAddress.Ethereum.WSTETH),

  'WEETH': impl(ETH, CommonAddress.Ethereum.WEETH),

  'EZETH': fungible('7bc13d30-1a38-4bc5-8a8e-ded71f4ec9b8'),
  'RSETH': fungible('605e5456-7ebe-4793-8dca-3b36f343d3de'),
  'TETH': fungible('c6849f1b-b10f-430f-8f16-cbaeccf48c3b'),

  'USDC': impl(ETH, CommonAddress.Ethereum.USDC),
  'USDC.E': impl(ETH, CommonAddress.Ethereum.USDC),
  'WAETHUSDC': impl(ETH, CommonAddress.Ethereum.USDC),

  'USDT': impl(ETH, CommonAddress.Ethereum.USDT),
  'USDT0': impl(ETH, CommonAddress.Ethereum.USDT),
  'USD₮': impl(ETH, CommonAddress.Ethereum.USDT),
  'USD₮0': impl(ETH, CommonAddress.Ethereum.USDT),
  'WAETHUSDT': impl(ETH, CommonAddress.Ethereum.USDT),

  'DAI': impl(ETH, CommonAddress.Ethereum.DAI),
  'WXDAI': impl(ETH, CommonAddress.Ethereum.DAI),

  'USDE': impl(ETH, CommonAddress.Ethereum.USDe),
  'USDS': impl(ETH, '0xdc035d45d973e3ec169d2276ddab16f1e407384f'),
  'PYUSD': impl(ETH, '0x6c3ea9036406852006290770bedfcaba0e23a0e8'),
  'GHO': impl(ETH, '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f'),
  'RLUSD': impl(ETH, '0x8292bb45bf1ee4d140127049757c2e0ff06317ed'),
  'USDTB': impl(ETH, '0xc139190f447e929f090edeb554d95abb8b18ac1c'),
  'USDG': impl(ETH, '0xe343167631d89b6ffc58b88d6b7fb0228795491d'),

  // cbBTC is distinct from WBTC — do not collapse.
  'WBTC': impl(ETH, CommonAddress.Ethereum.WBTC),
  'TBTC': impl(ETH, '0x18084fba666a33d37592fa2633fd49a74dd93a88'),
  'CBBTC': impl(ETH, '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf'),

  'ARB': impl(ARB, CommonAddress.ArbitrumOne.ARB),
};

// Keyed by `${chainId}:${lowercaseAddress}` — used when the exact contract
// is known from on-chain or vendor metadata.
const PRICE_BY_ADDRESS: Record<string, ZerionPriceLookup> = {
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WETH.toLowerCase()}`]: impl(
    ARB,
    CommonAddress.ArbitrumOne.WETH,
  ),
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WSTETH.toLowerCase()}`]: impl(
    ARB,
    CommonAddress.ArbitrumOne.WSTETH,
  ),
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WEETH.toLowerCase()}`]: impl(
    ARB,
    CommonAddress.ArbitrumOne.WEETH,
  ),
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WBTC.toLowerCase()}`]: impl(
    ARB,
    CommonAddress.ArbitrumOne.WBTC,
  ),
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.ARB.toLowerCase()}`]: impl(
    ARB,
    CommonAddress.ArbitrumOne.ARB,
  ),
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.sUSDC.toLowerCase()}`]: impl(
    ETH,
    CommonAddress.Ethereum.USDC,
  ),
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.sUSDe.toLowerCase()}`]: impl(
    ETH,
    CommonAddress.Ethereum.USDe,
  ),
};

// Lookup precedence: address match first, symbol fallback second.
export function getZerionPriceLookup(params: {
  chainId: number;
  tokenAddress?: string | null;
  assetSymbol?: string | null;
}): ZerionPriceLookup | null {
  const { chainId, tokenAddress, assetSymbol } = params;

  if (tokenAddress) {
    const byAddr = PRICE_BY_ADDRESS[`${chainId}:${tokenAddress.toLowerCase()}`];
    if (byAddr) return byAddr;
  }

  if (assetSymbol) {
    const bySymbol = PRICE_BY_SYMBOL[assetSymbol.trim().toUpperCase()];
    if (bySymbol) return bySymbol;
  }

  return null;
}

export function getZerionLookupCacheKey(lookup: ZerionPriceLookup): string {
  return lookup.kind === 'implementation'
    ? `impl:${lookup.implementation}`
    : `id:${lookup.fungibleId}`;
}
