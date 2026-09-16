import { isLifiTransfer } from '../app/api/crosschain-transfers/utils';
import {
  type ContractStorage,
  type ERC20BridgeToken,
  TokenType,
} from '../hooks/arbTokenBridge.types';
import { CommonAddress } from './CommonAddressUtils';
import { ArbOneNativeUSDC } from './L2NativeUtils';
import { LIFI_TRANSFER_LIST_ID, isLifiOnlyToken } from './TokenListUtils';
import { isTokenArbitrumOneNativeUSDC, isTokenArbitrumSepoliaNativeUSDC } from './TokenUtils';
import { isWithdrawOnlyToken } from './WithdrawOnlyUtils';

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
 * Whether a withdrawal-only token lacks a LiFi alternative for deposits on a LiFi route.
 *
 * Deliberately not the same question as `useSelectedTokenIsWithdrawOnly`, which asks whether
 * the *canonical* route is blocked and is what disables that route. This asks whether the
 * token can reach the destination chain at all, so a LiFi pair keeps it available here while
 * the canonical route stays disabled. Do not merge the two.
 *
 * Only LiFi routes can swap the deposit into native currency, so canonical-only routes keep
 * the token as the destination and rely on the withdraw-only dialog.
 */
export function isTokenDepositUnavailable({
  isDepositMode,
  tokenAddress,
  token,
  sourceChainId,
  destinationChainId,
}: {
  isDepositMode: boolean;
  tokenAddress: string | undefined;
  token: ERC20BridgeToken | undefined;
  sourceChainId: number;
  destinationChainId: number;
}): boolean {
  if (!isDepositMode) {
    return false;
  }

  // No ERC-20 address means the user selected native currency.
  if (!tokenAddress) {
    return false;
  }

  if (!isLifiTransfer({ sourceChainId, destinationChainId })) {
    return false;
  }

  // In deposit mode the destination chain is the child chain.
  const isCanonicalDepositBlocked = isWithdrawOnlyToken({
    parentChainErc20Address: tokenAddress,
    childChainId: destinationChainId,
  });
  if (!isCanonicalDepositBlocked) {
    return false;
  }

  // A LiFi token pair can still receive the asset when canonical deposits are blocked.
  const hasLifiTokenPair = token?.listIds.has(LIFI_TRANSFER_LIST_ID) ?? false;
  return !hasLifiTokenPair;
}

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

/**
 * Resolve the token a token-search row should render. Returns null while route-specific USDC
 * metadata is pending; `TokenRow` renders a null token as the native-currency row.
 */
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
