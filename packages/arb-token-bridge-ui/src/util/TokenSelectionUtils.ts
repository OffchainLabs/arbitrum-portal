import {
  type ContractStorage,
  type ERC20BridgeToken,
  TokenType,
} from '../hooks/arbTokenBridge.types';
import { CommonAddress } from './CommonAddressUtils';
import { ArbOneNativeUSDC } from './L2NativeUtils';
import { isLifiOnlyToken } from './TokenListUtils';
import { isTokenArbitrumOneNativeUSDC, isTokenArbitrumSepoliaNativeUSDC } from './TokenUtils';

export const ARB_ONE_NATIVE_USDC_TOKEN: ERC20BridgeToken = {
  ...ArbOneNativeUSDC,
  listIds: new Set<string>(),
  type: TokenType.ERC20,
  // the address field is for L1 address but native USDC does not have an L1 address
  // the L2 address is used instead to avoid errors
  address: CommonAddress.ArbitrumOne.USDC,
  l2Address: CommonAddress.ArbitrumOne.USDC,
};

export const ARB_SEPOLIA_NATIVE_USDC_TOKEN: ERC20BridgeToken = {
  ...ArbOneNativeUSDC,
  listIds: new Set<string>(),
  type: TokenType.ERC20,
  address: CommonAddress.ArbitrumSepolia.USDC,
  l2Address: CommonAddress.ArbitrumSepolia.USDC,
};

/**
 * Resolve the token a token-search row should render. Returns null while route-specific USDC
 * metadata is pending; `TokenRow` renders a null token as the native-currency row.
 */
/** Choose USDC metadata without discarding a stored destination mapping. */
export function selectUsdcToken({
  usdcToken,
  storedToken,
}: {
  usdcToken: ERC20BridgeToken | null | undefined;
  storedToken: ERC20BridgeToken | null | undefined;
}): ERC20BridgeToken | null {
  if (!usdcToken) {
    return storedToken ?? null;
  }

  // A listed or imported token may have a destination mapping that the
  // generated source-only USDC fallback does not have.
  if (isLifiOnlyToken(usdcToken)) {
    return storedToken ?? usdcToken;
  }

  return usdcToken;
}

/** Resolve the token a token-search row should render, or null while its metadata is pending. */
export function getTokenForRow({
  address,
  tokensFromLists,
  tokensFromUser,
  isOrbitChain,
  usdcToken,
}: {
  address: string;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
  tokensFromUser: ContractStorage<ERC20BridgeToken>;
  isOrbitChain: boolean;
  usdcToken: ERC20BridgeToken | null;
}): ERC20BridgeToken | null {
  const listedToken = tokensFromLists[address] ?? tokensFromUser[address] ?? null;
  const isArbitrumUsdc =
    isTokenArbitrumOneNativeUSDC(address) || isTokenArbitrumSepoliaNativeUSDC(address);

  if (!isArbitrumUsdc) {
    return listedToken;
  }

  if (!isOrbitChain) {
    return isTokenArbitrumOneNativeUSDC(address)
      ? ARB_ONE_NATIVE_USDC_TOKEN
      : ARB_SEPOLIA_NATIVE_USDC_TOKEN;
  }

  // Route-specific USDC metadata has not resolved yet.
  if (!usdcToken) {
    return null;
  }

  return selectUsdcToken({ usdcToken, storedToken: listedToken });
}
