import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { Address, ChainPair, NATIVE_TOKEN_ADDRESS, Token, pairKey, toTokenId } from './types';

type LayerZeroRouteData = {
  destination: Address;
  oftAdapter: Address;
  endpointId: number;
};

function addr(value: string): Address {
  return value.toLowerCase() as Address;
}

export const ChainIds = {
  Ethereum: 1,
  ArbitrumOne: 42161,
  Robinhood: 4663,
} as const;

export const chainNames: Record<number, string> = {
  [ChainIds.Ethereum]: 'Ethereum',
  [ChainIds.ArbitrumOne]: 'Arbitrum One',
  [ChainIds.Robinhood]: 'Robinhood',
};

export const supportedPairs: ChainPair[] = [
  { sourceChainId: ChainIds.Ethereum, destinationChainId: ChainIds.ArbitrumOne },
  { sourceChainId: ChainIds.ArbitrumOne, destinationChainId: ChainIds.Ethereum },
  { sourceChainId: ChainIds.Ethereum, destinationChainId: ChainIds.Robinhood },
  { sourceChainId: ChainIds.Robinhood, destinationChainId: ChainIds.Ethereum },
];

export const supportedChainIds: number[] = [
  ChainIds.Ethereum,
  ChainIds.ArbitrumOne,
  ChainIds.Robinhood,
];

export function isSupportedPair(pair: ChainPair): boolean {
  return supportedPairs.some(
    (supported) =>
      supported.sourceChainId === pair.sourceChainId &&
      supported.destinationChainId === pair.destinationChainId,
  );
}

const USDC_ETHEREUM = addr(CommonAddress.Ethereum.USDC);
const USDC_ARBITRUM_ONE = addr(CommonAddress.ArbitrumOne.USDC);
const USDC_ROBINHOOD = addr('0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8');

const USDT_ETHEREUM = addr(CommonAddress.Ethereum.USDT);
const USDT0_ARBITRUM_ONE = addr(CommonAddress.ArbitrumOne.USDT);

const PYUSD_ETHEREUM = addr(CommonAddress.Ethereum.PYUSD);
const PYUSD_LIFI_ARBITRUM_ONE = addr(CommonAddress.ArbitrumOne.PYUSD);

const OFT_ADAPTER_ETHEREUM = '0x6c96de32cea08842dcc4058c14d3aaad7fa41dee' as Address;
const OFT_ADAPTER_ARBITRUM_ONE = '0x14e4a1b13bf7f943c8ff7c51fb60fa964a298d92' as Address;

const LZ_ENDPOINT_ID_ETHEREUM = 30101;
const LZ_ENDPOINT_ID_ARBITRUM_ONE = 30110;

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

export const hardcodedCanonicalRoutes: Record<string, Record<Address, Address>> = {
  [pairKey({ sourceChainId: ChainIds.Robinhood, destinationChainId: ChainIds.Ethereum })]: {
    [USDC_ROBINHOOD]: USDC_ETHEREUM,
  },
};

export const hardcodedLifiRoutes: Record<string, Record<Address, Address | null>> = {
  [pairKey({ sourceChainId: ChainIds.Ethereum, destinationChainId: ChainIds.Robinhood })]: {
    [NATIVE_TOKEN_ADDRESS]: NATIVE_TOKEN_ADDRESS,
  },
  [pairKey({ sourceChainId: ChainIds.Robinhood, destinationChainId: ChainIds.Ethereum })]: {
    [NATIVE_TOKEN_ADDRESS]: NATIVE_TOKEN_ADDRESS,
  },
};

export const blockedSourceRoutes: Record<string, Address[]> = {
  [pairKey({ sourceChainId: ChainIds.Ethereum, destinationChainId: ChainIds.Robinhood })]: [
    USDC_ETHEREUM,
  ],
};

export const blockedLifiSourceRoutes: Record<string, Address[]> = {
  [pairKey({ sourceChainId: ChainIds.Robinhood, destinationChainId: ChainIds.Ethereum })]: [
    USDC_ROBINHOOD,
  ],
};

export const defaultDestinationOverrides: Record<string, Record<Address, Address>> = {
  [pairKey({ sourceChainId: ChainIds.Ethereum, destinationChainId: ChainIds.ArbitrumOne })]: {
    [PYUSD_ETHEREUM]: PYUSD_LIFI_ARBITRUM_ONE,
  },
};

export function getDefaultDestinationOverride(
  pair: ChainPair,
  sourceTokenAddress: Address,
): Address | undefined {
  return defaultDestinationOverrides[pairKey(pair)]?.[sourceTokenAddress];
}

const excludedTokenIds = new Set<string>([
  toTokenId(ChainIds.Ethereum, '0x6982508145454ce325ddbe47a25d4ec3d2311933'),
  toTokenId(ChainIds.ArbitrumOne, '0x35e6a59f786d9266c7961ea28c7b768b33959cbb'),
]);

export function isExcludedToken(chainId: number, address: string): boolean {
  return excludedTokenIds.has(toTokenId(chainId, address));
}

type CuratedCoinKey = {
  coinKey: string;
  addresses: Partial<Record<number, Address>>;
};

const curatedCoinKeys: CuratedCoinKey[] = [
  {
    coinKey: 'PYUSD',
    addresses: {
      [ChainIds.Ethereum]: PYUSD_ETHEREUM,
      [ChainIds.ArbitrumOne]: PYUSD_LIFI_ARBITRUM_ONE,
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

export const hardcodedTokens: Token[] = [
  nativeEther(ChainIds.Ethereum),
  nativeEther(ChainIds.ArbitrumOne),
  nativeEther(ChainIds.Robinhood),
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
    id: toTokenId(ChainIds.Robinhood, USDC_ROBINHOOD),
    chainId: ChainIds.Robinhood,
    address: USDC_ROBINHOOD,
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
