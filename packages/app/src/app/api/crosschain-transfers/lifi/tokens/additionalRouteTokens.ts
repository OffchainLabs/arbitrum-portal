import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

export type AdditionalRouteTokenChainConfig = {
  sourceTokenAddresses?: ReadonlySet<string>;
  includeUnmatchedChildTokens?: boolean;
};

const normalizeAddresses = (addresses: string[]) =>
  new Set(addresses.map((address) => address.toLowerCase()));

export const ADDITIONAL_ROUTE_TOKEN_CHAIN_CONFIG: Partial<
  Record<number, AdditionalRouteTokenChainConfig>
> = {
  [ChainId.RobinhoodChain]: {
    sourceTokenAddresses: normalizeAddresses([
      CommonAddress.RobinhoodChain.WETH,
      CommonAddress.RobinhoodChain.USDe,
      CommonAddress.RobinhoodChain.sUSDe,
      CommonAddress.RobinhoodChain.USDG,
      CommonAddress.RobinhoodChain.ENA,
      CommonAddress.RobinhoodChain.WEETH,
      CommonAddress.RobinhoodChain.WSTETH,
    ]),
    includeUnmatchedChildTokens: true,
  },
};

export const ADDITIONAL_ROUTE_TOKEN_CHAIN_IDS = Object.keys(
  ADDITIONAL_ROUTE_TOKEN_CHAIN_CONFIG,
).map(Number);

export const getAdditionalRouteTokenChainConfig = (chainId: number) =>
  ADDITIONAL_ROUTE_TOKEN_CHAIN_CONFIG[chainId];
