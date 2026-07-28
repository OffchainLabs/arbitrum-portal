import { ContractStorage, ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';

const usdcTokenMetadata = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  type: TokenType.ERC20,
  listIds: new Set<string>(),
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
} as const;

export const CANONICAL_TOKEN_OVERRIDES_BY_CHAIN_PAIR: Record<
  string,
  ContractStorage<ERC20BridgeToken>
> = {
  [`${ChainId.Ethereum}:${ChainId.ArbitrumOne}`]: {
    [CommonAddress.Ethereum.USDC]: {
      ...usdcTokenMetadata,
      address: CommonAddress.Ethereum.USDC,
      l2Address: CommonAddress.ArbitrumOne['USDC.e'],
    },
  },
  [`${ChainId.Sepolia}:${ChainId.ArbitrumSepolia}`]: {
    [CommonAddress.Sepolia.USDC]: {
      ...usdcTokenMetadata,
      address: CommonAddress.Sepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia['USDC.e'],
    },
  },
};
