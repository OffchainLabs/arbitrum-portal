import { ContractStorage, ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import { ArbOneNativeUSDC } from './L2NativeUtils';

export const ARB_ONE_NATIVE_USDC_TOKEN: ERC20BridgeToken = {
  ...ArbOneNativeUSDC,
  listIds: new Set<string>(),
  type: TokenType.ERC20,
  address: CommonAddress.ArbitrumOne.USDC,
  l2Address: CommonAddress.ArbitrumOne.USDC,
  isL2Native: true,
};

export const ARB_SEPOLIA_NATIVE_USDC_TOKEN: ERC20BridgeToken = {
  ...ArbOneNativeUSDC,
  listIds: new Set<string>(),
  type: TokenType.ERC20,
  address: CommonAddress.ArbitrumSepolia.USDC,
  l2Address: CommonAddress.ArbitrumSepolia.USDC,
  isL2Native: true,
};

export const L2_NATIVE_TOKENS_BY_CHAIN: Record<number, ContractStorage<ERC20BridgeToken>> = {
  [ChainId.ArbitrumOne]: {
    [ARB_ONE_NATIVE_USDC_TOKEN.address]: ARB_ONE_NATIVE_USDC_TOKEN,
  },
  [ChainId.ArbitrumSepolia]: {
    [ARB_SEPOLIA_NATIVE_USDC_TOKEN.address]: ARB_SEPOLIA_NATIVE_USDC_TOKEN,
  },
};
