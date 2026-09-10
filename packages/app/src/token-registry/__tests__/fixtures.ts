import {
  Address,
  ChainTokens,
  ImportResolution,
  NATIVE_TOKEN_ADDRESS,
  RouteMapArtifact,
  Token,
  TokenId,
  toTokenId,
} from '../types';
import { RegistryView, buildRegistryView } from '../view';

export function addr(byte: string): Address {
  return `0x${byte.repeat(20)}` as Address;
}

export const USDC_ETHEREUM = addr('01');
export const USDC_ARBITRUM = addr('02');
export const USDCE_ARBITRUM = addr('03');
export const USDT_ETHEREUM = addr('04');
export const USDT0_ARBITRUM = addr('05');
export const DAI_ETHEREUM = addr('06');
export const DAI_ARBITRUM = addr('07');
export const PEPE_ETHEREUM = addr('08');
export const ARB_ARBITRUM = addr('09');
/** present in the artifact but missing from the token registry */
export const ORPHAN_ETHEREUM = addr('0a');
export const OFT_ADAPTER = addr('0c');

export function getFixtureToken(id: TokenId): Token {
  const fixtureToken = tokens[id];
  if (!fixtureToken) {
    throw new Error(`Missing fixture token: ${id}`);
  }
  return fixtureToken;
}

function token(chainId: number, address: Address, symbol: string, decimals = 18): Token {
  return {
    id: toTokenId(chainId, address),
    chainId,
    address,
    symbol,
    name: `${symbol} Token`,
    decimals,
  };
}

export const tokens: ChainTokens = Object.fromEntries(
  [
    token(1, NATIVE_TOKEN_ADDRESS, 'ETH'),
    token(1, USDC_ETHEREUM, 'USDC', 6),
    token(1, USDT_ETHEREUM, 'USDT', 6),
    token(1, DAI_ETHEREUM, 'DAI'),
    token(1, PEPE_ETHEREUM, 'PEPE'),
    token(42161, NATIVE_TOKEN_ADDRESS, 'ETH'),
    token(42161, USDC_ARBITRUM, 'USDC', 6),
    token(42161, USDCE_ARBITRUM, 'USDC.e', 6),
    token(42161, USDT0_ARBITRUM, 'USDT0', 6),
    token(42161, DAI_ARBITRUM, 'DAI'),
    token(42161, ARB_ARBITRUM, 'ARB'),
  ].map((entry) => [entry.id, entry]),
);

export const artifact: RouteMapArtifact = {
  sourceChainId: 1,
  destinationChainId: 42161,
  providers: [
    {
      provider: 'canonical',
      routes: {
        [NATIVE_TOKEN_ADDRESS]: NATIVE_TOKEN_ADDRESS,
        [USDC_ETHEREUM]: USDCE_ARBITRUM,
        [DAI_ETHEREUM]: DAI_ARBITRUM,
        [ORPHAN_ETHEREUM]: addr('0b'),
      },
    },
    {
      provider: 'cctp',
      routes: { [USDC_ETHEREUM]: USDC_ARBITRUM },
    },
    {
      provider: 'layerzero',
      routes: {
        [USDT_ETHEREUM]: {
          destination: USDT0_ARBITRUM,
          oftAdapter: OFT_ADAPTER,
          endpointId: 30110,
        },
      },
    },
    {
      provider: 'lifi',
      routes: {
        [USDC_ETHEREUM]: USDC_ARBITRUM,
        [NATIVE_TOKEN_ADDRESS]: NATIVE_TOKEN_ADDRESS,
        // swap-only: no same-asset counterpart on the destination chain
        [PEPE_ETHEREUM]: null,
      },
    },
  ],
};

/** the pair's lazily-fetched swap destination set */
export const swapDestinations: Address[] = [USDC_ARBITRUM, NATIVE_TOKEN_ADDRESS, ARB_ARBITRUM];

export function buildFixtureView(overlays?: ImportResolution[]): RegistryView {
  const allTokens = Object.values(tokens).filter((entry): entry is Token => Boolean(entry));
  return buildRegistryView({
    artifact,
    sourceChainTokens: allTokens.filter((entry) => entry.chainId === 1),
    destinationChainTokens: allTokens.filter((entry) => entry.chainId === 42161),
    overlays,
  });
}
