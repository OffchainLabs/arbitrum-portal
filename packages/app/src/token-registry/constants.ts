import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import {
  Address,
  ChainPair,
  LayerZeroRouteData,
  NATIVE_TOKEN_ADDRESS,
  Token,
  pairKey,
  toTokenId,
} from './types';

function addr(value: string): Address {
  return value.toLowerCase() as Address;
}

export const ChainIds = {
  Ethereum: 1,
  ArbitrumOne: 42161,
} as const;

export const chainNames: Record<number, string> = {
  [ChainIds.Ethereum]: 'Ethereum',
  [ChainIds.ArbitrumOne]: 'Arbitrum One',
};

export const supportedPairs: ChainPair[] = [
  { sourceChainId: ChainIds.Ethereum, destinationChainId: ChainIds.ArbitrumOne },
  { sourceChainId: ChainIds.ArbitrumOne, destinationChainId: ChainIds.Ethereum },
];

export const supportedChainIds: number[] = [ChainIds.Ethereum, ChainIds.ArbitrumOne];

export function isSupportedPair(pair: ChainPair): boolean {
  return supportedPairs.some(
    (supported) =>
      supported.sourceChainId === pair.sourceChainId &&
      supported.destinationChainId === pair.destinationChainId,
  );
}

const USDC_ETHEREUM = addr(CommonAddress.Ethereum.USDC);
const USDC_ARBITRUM_ONE = addr(CommonAddress.ArbitrumOne.USDC);

const USDT_ETHEREUM = addr(CommonAddress.Ethereum.USDT);
const USDT0_ARBITRUM_ONE = addr(CommonAddress.ArbitrumOne.USDT);

const OFT_ADAPTER_ETHEREUM = '0x6c96de32cea08842dcc4058c14d3aaad7fa41dee' as Address;
const OFT_ADAPTER_ARBITRUM_ONE = '0x14e4a1b13bf7f943c8ff7c51fb60fa964a298d92' as Address;

const LZ_ENDPOINT_ID_ETHEREUM = 30101;
const LZ_ENDPOINT_ID_ARBITRUM_ONE = 30110;

export const cctpConfig: Record<string, Record<Address, Address>> = {
  [pairKey({ sourceChainId: 1, destinationChainId: 42161 })]: {
    [USDC_ETHEREUM]: USDC_ARBITRUM_ONE,
  },
  [pairKey({ sourceChainId: 42161, destinationChainId: 1 })]: {
    [USDC_ARBITRUM_ONE]: USDC_ETHEREUM,
  },
};

export const layerZeroConfig: Record<string, Record<Address, LayerZeroRouteData>> = {
  [pairKey({ sourceChainId: 1, destinationChainId: 42161 })]: {
    [USDT_ETHEREUM]: {
      destination: USDT0_ARBITRUM_ONE,
      oftAdapter: OFT_ADAPTER_ETHEREUM,
      endpointId: LZ_ENDPOINT_ID_ARBITRUM_ONE,
    },
  },
  [pairKey({ sourceChainId: 42161, destinationChainId: 1 })]: {
    [USDT0_ARBITRUM_ONE]: {
      destination: USDT_ETHEREUM,
      oftAdapter: OFT_ADAPTER_ARBITRUM_ONE,
      endpointId: LZ_ENDPOINT_ID_ETHEREUM,
    },
  },
};

/**
 * Canonical routes that must NOT be generated, keyed by ordered pair —
 * source addresses whose canonical transfer is disabled. PYUSD deposits are
 * LiFi-only; its withdrawal (PYUSD_CANONICAL → Ethereum PYUSD) stays
 * canonical.
 */
export const canonicalRouteExclusions: Record<string, Address[]> = {
  [pairKey({ sourceChainId: 1, destinationChainId: 42161 })]: [addr(CommonAddress.Ethereum.PYUSD)],
};

/**
 * Tokens deliberately excluded from ALL generation (token registry, canonical
 * routes, lifi sections) so the import flow can be demoed: PEPE has a
 * canonical route but never appears in the picker — paste its address
 * (0x6982508145454ce325ddbe47a25d4ec3d2311933 on Ethereum) to import it for
 * the session. Import (canonical.resolve) intentionally does NOT consult
 * this list.
 */
const excludedTokenIds = new Set<string>([
  toTokenId(ChainIds.Ethereum, '0x6982508145454ce325ddbe47a25d4ec3d2311933'), // PEPE
  toTokenId(ChainIds.ArbitrumOne, '0x35e6a59f786d9266c7961ea28c7b768b33959cbb'), // PEPE (bridged)
]);

export function isExcludedToken(chainId: number, address: string): boolean {
  return excludedTokenIds.has(toTokenId(chainId, address));
}

type CuratedCoinKey = {
  coinKey: string;
  addresses: Partial<Record<number, Address>>;
};

/**
 * LiFi assigns no coinKey to some tokens, so coinKey-based counterpart
 * matching misses them. Mirrors CUSTOM_TOKENS in
 * app/api/crosschain-transfers/lifi/tokens/registry.ts.
 */
const curatedCoinKeys: CuratedCoinKey[] = [
  {
    coinKey: 'PYUSD',
    addresses: {
      [ChainIds.Ethereum]: addr(CommonAddress.Ethereum.PYUSD),
      [ChainIds.ArbitrumOne]: addr(CommonAddress.ArbitrumOne.PYUSD),
    },
  },
  {
    coinKey: 'ENA',
    addresses: {
      [ChainIds.Ethereum]: addr('0x57e114b691db790c35207b2e685d4a43181e6061'),
      [ChainIds.ArbitrumOne]: addr('0x58538e6a46e07434d7e7375bc268d3cb839c0133'),
    },
  },
];

const curatedCoinKeyByTokenId = new Map<string, string>();
for (const { coinKey, addresses } of curatedCoinKeys) {
  for (const [chainId, address] of Object.entries(addresses)) {
    if (address) {
      curatedCoinKeyByTokenId.set(toTokenId(Number(chainId), address), coinKey);
    }
  }
}

export function getCuratedCoinKey(chainId: number, address: string): string | undefined {
  return curatedCoinKeyByTokenId.get(toTokenId(chainId, address));
}

/**
 * Curated per-chain metadata fixes, applied while generating the final Token.
 * The emitted Token is the single source of truth — nothing downstream
 * re-applies these.
 */
export const curatedTokenMetadata: Partial<
  Record<string, Partial<Pick<Token, 'symbol' | 'name' | 'logoURI'>>>
> = {
  [toTokenId(ChainIds.ArbitrumOne, USDT0_ARBITRUM_ONE)]: {
    symbol: 'USDT0',
    name: 'USDT0',
  },
};

function nativeEther(chainId: number): Token {
  return {
    id: toTokenId(chainId, NATIVE_TOKEN_ADDRESS),
    chainId,
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
  };
}

/**
 * Tokens referenced by the hardcoded providers (and natives) — emitted into
 * the registry so route artifacts always resolve, even if the generated
 * lists miss them.
 */
export const hardcodedTokens: Token[] = [
  nativeEther(ChainIds.Ethereum),
  nativeEther(ChainIds.ArbitrumOne),
  {
    id: toTokenId(ChainIds.Ethereum, USDC_ETHEREUM),
    chainId: ChainIds.Ethereum,
    address: USDC_ETHEREUM,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    id: toTokenId(ChainIds.ArbitrumOne, USDC_ARBITRUM_ONE),
    chainId: ChainIds.ArbitrumOne,
    address: USDC_ARBITRUM_ONE,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    id: toTokenId(ChainIds.Ethereum, USDT_ETHEREUM),
    chainId: ChainIds.Ethereum,
    address: USDT_ETHEREUM,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  {
    id: toTokenId(ChainIds.ArbitrumOne, USDT0_ARBITRUM_ONE),
    chainId: ChainIds.ArbitrumOne,
    address: USDT0_ARBITRUM_ONE,
    symbol: 'USDT0',
    name: 'USDT0',
    decimals: 6,
  },
];
