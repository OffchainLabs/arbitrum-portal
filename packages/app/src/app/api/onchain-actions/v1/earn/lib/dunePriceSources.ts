import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

export type DunePriceLookup = {
  chainId: number;
  tokenAddress: string;
};

/**
 * Dune price config by symbol (case-insensitive).
 *
 * Only map a symbol when the Dune token is genuinely the same underlying asset
 * (bridged or wrapped). Do NOT map derivative tokens (e.g. cbETH, LBTC, GHO)
 * to their base asset — they have different prices.
 *
 * Tokens not in this map will have `null` prices (shown as "unknown" in UI).
 */
const PRICE_BY_SYMBOL: Record<string, DunePriceLookup> = {
  // ETH / Wrapped ETH (same asset)
  'ETH': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.WETH },
  'WETH': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.WETH },
  'WAETHWETH': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.WETH },

  // Lido staked ETH (stETH/wstETH are the same Lido position)
  'STETH': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.STETH },
  'WSTETH': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.STETH },

  // USDC (same asset, bridged)
  'USDC': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDC },
  'USDC.E': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDC },
  'WAETHUSDC': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDC },

  // USDT (same asset, bridged)
  'USDT': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDT },
  'USDT0': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDT },
  'USD₮': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDT },
  'USD₮0': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDT },
  'WAETHUSDT': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDT },

  // DAI (same asset)
  'DAI': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.DAI },
  'WXDAI': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.DAI },

  // USDe (same asset, wrapped)
  'USDE': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.USDe },

  // WBTC (same asset, bridged)
  'WBTC': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.WBTC },

  // ARB (same asset, bridged L1↔L2)
  'ARB': { chainId: ChainId.Ethereum, tokenAddress: CommonAddress.Ethereum.ARB },
};

/**
 * Address-level config for tokens where we know the exact contract.
 * Key: `{chainId}:{lowercaseAddress}`.
 */
const PRICE_BY_ADDRESS: Record<string, DunePriceLookup> = {
  // Arbitrum bridged tokens → Ethereum originals
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WETH.toLowerCase()}`]: {
    chainId: ChainId.Ethereum,
    tokenAddress: CommonAddress.Ethereum.WETH,
  },
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WSTETH.toLowerCase()}`]: {
    chainId: ChainId.Ethereum,
    tokenAddress: CommonAddress.Ethereum.STETH,
  },
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.WBTC.toLowerCase()}`]: {
    chainId: ChainId.Ethereum,
    tokenAddress: CommonAddress.Ethereum.WBTC,
  },
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.ARB.toLowerCase()}`]: {
    chainId: ChainId.Ethereum,
    tokenAddress: CommonAddress.Ethereum.ARB,
  },
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.sUSDC.toLowerCase()}`]: {
    chainId: ChainId.Ethereum,
    tokenAddress: CommonAddress.Ethereum.USDC,
  },
  [`${ChainId.ArbitrumOne}:${CommonAddress.ArbitrumOne.sUSDe.toLowerCase()}`]: {
    chainId: ChainId.Ethereum,
    tokenAddress: CommonAddress.Ethereum.USDe,
  },
};

/**
 * Get the Dune token to use for pricing a given asset.
 * Returns null if the asset can't be priced (UI will show "unknown").
 *
 * Lookup order:
 * 1. Exact address match (for known token contracts)
 * 2. Symbol match (for vault assets where we only know the symbol)
 */
export function getDunePriceLookup(params: {
  chainId: number;
  tokenAddress?: string | null;
  assetSymbol?: string | null;
}): DunePriceLookup | null {
  const { chainId, tokenAddress, assetSymbol } = params;

  // 1. Try exact address match
  if (tokenAddress) {
    const byAddress = PRICE_BY_ADDRESS[`${chainId}:${tokenAddress.toLowerCase()}`];
    if (byAddress) return byAddress;
  }

  // 2. Try symbol match
  if (assetSymbol) {
    const bySymbol = PRICE_BY_SYMBOL[assetSymbol.trim().toUpperCase()];
    if (bySymbol) return bySymbol;
  }

  return null;
}
