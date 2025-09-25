import { getArbitrumNetwork } from '@arbitrum/sdk';
import { constants } from 'ethers';

import { ChainId } from '../types/ChainId';
import {
  ChainKeyQueryParam,
  getChainForChainKeyQueryParam,
  getChainQueryParamForChain,
  isValidChainQueryParam,
} from '../types/ChainQueryParam';
import { getDestinationChainIds, isSupportedChainId } from './chainUtils';
import { isLifiEnabled, isOnrampEnabled } from './featureFlag';
import { isNetwork } from './networks';
import { orbitChains } from './orbitChainsList';

export interface ThemeConfig {
  borderRadius?: string;
  widgetBackgroundColor?: string;
  borderWidth?: string;
  networkThemeOverrideColor?: string;
  primaryCtaColor?: string;
  fontFamily?: string;
}

export const defaultTheme: ThemeConfig = {};

export enum AmountQueryParamEnum {
  MAX = 'max',
}

export enum TabParamEnum {
  BUY = 'buy',
  BRIDGE = 'bridge',
  TX_HISTORY = 'tx_history',
}

export enum DisabledFeatures {
  BATCH_TRANSFERS = 'batch-transfers',
  TX_HISTORY = 'tx-history',
  NETWORK_SELECTION = 'network-selection',
  TRANSFERS_TO_NON_ARBITRUM_CHAINS = 'transfers-to-non-arbitrum-chains',
  BUY = 'buy'
}

function createTabMappings({
  disabledFeatures = []
}: { disabledFeatures?: string[] } = {}) {
  const isBuyDisabled = disabledFeatures.includes(DisabledFeatures.BUY)
  const showBuyTab = isOnrampEnabled() && !isBuyDisabled

  if (showBuyTab) {
    return {
      tabToIndex: {
        [TabParamEnum.BUY]: 0,
        [TabParamEnum.BRIDGE]: 1,
        [TabParamEnum.TX_HISTORY]: 2,
      } as const satisfies Record<TabParamEnum, number>,
      indexToTab: {
        0: TabParamEnum.BUY,
        1: TabParamEnum.BRIDGE,
        2: TabParamEnum.TX_HISTORY,
      } as const satisfies Record<number, TabParamEnum>,
    };
  }

  return {
    tabToIndex: {
      [TabParamEnum.BRIDGE]: 0,
      [TabParamEnum.TX_HISTORY]: 1,
    } as const satisfies Record<Exclude<TabParamEnum, TabParamEnum.BUY>, number>,
    indexToTab: {
      0: TabParamEnum.BRIDGE,
      1: TabParamEnum.TX_HISTORY,
    } as const satisfies Record<number, Exclude<TabParamEnum, TabParamEnum.BUY>>,
  };
}

// Default tab mappings (used when disabled features are not available)
export const { tabToIndex, indexToTab } = createTabMappings()

// Function to get tab mappings with disabled features
export const getTabMappings = ({
  disabledFeatures = []
}: { disabledFeatures?: string[] } = {}) => {
  return createTabMappings({ disabledFeatures })
}

export const isValidDisabledFeature = (feature: string) => {
  return Object.values(DisabledFeatures).includes(feature.toLowerCase() as DisabledFeatures);
};

function isValidNumber(value: number | null | undefined): value is number {
  if (typeof value === 'undefined' || value === null) {
    return false;
  }
  return !Number.isNaN(value);
}

export function encodeChainQueryParam(chainId: number | null | undefined): string | undefined {
  if (!chainId) {
    return undefined;
  }

  try {
    const chain = getChainQueryParamForChain(chainId);
    return chain.toString();
  } catch (e) {
    return undefined;
  }
}

/**
 * Decodes a number from a string. If the number is invalid,
 * it returns undefined.
 *
 * If an array is provided, only the first entry is used.
 */
function decodeNumber(
  value: string | (string | null)[] | null | undefined,
): number | null | undefined {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }

  if (Array.isArray(value)) {
    const parsed = Number(value[0]);
    return isNaN(parsed) ? null : parsed;
  }

  return value;
}

/**
 * Decodes a string while safely handling null and undefined values.
 *
 * If an array is provided, only the first entry is used.
 */
function decodeString(
  value: string | (string | null)[] | null | undefined,
): string | null | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }
}

/**
 * Encodes a string while safely handling null and undefined values.
 */
export function encodeString(
  str: string | (string | null)[] | null | undefined,
): string | null | undefined {
  if (str == null) {
    return str;
  }

  return String(str);
}

export function decodeChainQueryParam(
  value: string | (string | null)[] | null | undefined,
): ChainId | number | undefined {
  const valueString = decodeString(value);
  if (!valueString) {
    return undefined;
  }

  const valueNumber = decodeNumber(value);
  if (isValidNumber(valueNumber) && isValidChainQueryParam(valueNumber as ChainId)) {
    return valueNumber;
  }

  if (isValidChainQueryParam(valueString)) {
    return getChainForChainKeyQueryParam(valueString as ChainKeyQueryParam).id;
  }

  return undefined;
}

export function encodeTabQueryParam({
  tabIndex,
  disabledFeatures = []
}: {
  tabIndex: number | null | undefined
  disabledFeatures?: string[]
}): string {
  const { indexToTab: _indexToTab } = createTabMappings({ disabledFeatures })
  if (typeof tabIndex === 'number' && tabIndex in _indexToTab) {
    const tabParam = _indexToTab[tabIndex as keyof typeof _indexToTab];
    if (tabParam !== undefined) {
      return tabParam;
    }
  }
  return TabParamEnum.BRIDGE;
}

export function decodeTabQueryParam({
  tab,
  disabledFeatures = []
}: {
  tab: string | (string | null)[] | null | undefined
  disabledFeatures?: string[]
}): number {
  const { tabToIndex: _tabToIndex } = createTabMappings({ disabledFeatures })
  if (typeof tab === 'string') {
    const isBuyDisabled = disabledFeatures.includes(DisabledFeatures.BUY)
    if (tab === TabParamEnum.BUY && (!isOnrampEnabled() || isBuyDisabled)) {
      return _tabToIndex[TabParamEnum.BRIDGE]
    }

    if (tab in _tabToIndex) {
      const tabIndex = _tabToIndex[tab as keyof typeof _tabToIndex];
      if (tabIndex !== undefined) {
        return tabIndex;
      }
    }
  }
  return _tabToIndex[TabParamEnum.BRIDGE];
}

export const DisabledFeaturesParam = {
  encode: (disabledFeatures: string[] | undefined) => {
    if (!disabledFeatures?.length) {
      return undefined;
    }

    const url = new URLSearchParams();
    const dedupedFeatures = new Set(
      disabledFeatures
        .map((feature) => feature.toLowerCase())
        .filter((feature) => isValidDisabledFeature(feature)),
    );

    for (const feature of dedupedFeatures) {
      url.append('disabledFeatures', feature);
    }

    return url.toString();
  },
  decode: (value: string | (string | null)[] | null | undefined) => {
    if (!value) return [];

    // Handle both string and array inputs
    const features =
      typeof value === 'string' ? [value] : value.filter((val): val is string => val !== null);

    // Normalize, validate and deduplicate in one pass
    const dedupedFeatures = new Set<string>();
    for (const feature of features) {
      const normalized = feature.toLowerCase();
      if (isValidDisabledFeature(normalized)) {
        dedupedFeatures.add(normalized);
      }
    }

    return Array.from(dedupedFeatures);
  },
};

export const ThemeParam = {
  encode: (config: ThemeConfig | undefined) => {
    if (!config) return undefined;
    try {
      return encodeURIComponent(JSON.stringify(config)); // Encode the JSON string to handle special characters like # in hex colors
    } catch {
      return undefined;
    }
  },
  decode: (configStr: string | (string | null)[] | null | undefined): ThemeConfig => {
    if (!configStr || Array.isArray(configStr)) return defaultTheme;
    try {
      const decodedTheme = JSON.parse(decodeURIComponent(configStr));
      return { ...defaultTheme, ...decodedTheme };
    } catch {
      return defaultTheme;
    }
  },
};

const isMax = (amount: string | undefined) => amount?.toLowerCase() === AmountQueryParamEnum.MAX;

/**
 * Sanitise amount value
 * @param amount - transfer amount value from the input field or from the URL
 * @returns sanitised value
 */
export const sanitizeAmountQueryParam = (amount: string) => {
  // no need to process empty string
  if (amount.length === 0) {
    return amount;
  }

  const parsedAmount = amount.replace(/[,]/g, '.').toLowerCase();

  // add 0 to values starting with .
  if (parsedAmount.startsWith('.')) {
    return `0${parsedAmount}`;
  }

  // to catch strings like `amount=asdf` from the URL
  if (isNaN(Number(parsedAmount))) {
    // return original string if the string is `max` (case-insensitive)
    // it doesn't show on the input[type=number] field because it isn't in the allowed chars
    return isMax(parsedAmount) ? parsedAmount : '';
  }

  // to reach here they must be a number
  // check for negative sign at first char
  if (parsedAmount.startsWith('-')) {
    return String(Math.abs(Number(parsedAmount)));
  }

  // replace leading zeros and spaces
  // this regex finds 1 or more 0s before any digits including 0
  // but the digits are not captured into the result string
  return parsedAmount.replace(/(^0+(?=\d))| /g, '');
};

export const AmountQueryParam = {
  // type of amount is always string | undefined coming from the input element onChange event `e.target.value`
  encode: (amount: string | undefined = '') => sanitizeAmountQueryParam(amount),
  decode: (amount: string | (string | null)[] | null | undefined) => {
    // toString() casts the potential string array into a string
    const amountStr = amount?.toString() ?? '';
    return sanitizeAmountQueryParam(amountStr);
  },
};

export const TokenQueryParam = {
  encode: (token: string | undefined) => {
    return token?.toLowerCase();
  },
  decode: (token: string | (string | null)[] | null | undefined) => {
    const tokenStr = token?.toString();
    // We are not checking for a valid address because we handle it in the UI
    // by showing an invalid token dialog
    return tokenStr?.toLowerCase();
  },
};

export const ChainParam = {
  encode: encodeChainQueryParam,
  decode: decodeChainQueryParam,
};

export const TabParam = {
  encode: (tabIndex: number | null | undefined) =>
    encodeTabQueryParam({ tabIndex }),
  decode: (tab: string | (string | null)[] | null | undefined) =>
    decodeTabQueryParam({ tab })
}

// Custom TabParam that can access disabled features from the current query params
export const createTabParamWithDisabledFeatures = ({
  disabledFeatures = []
}: { disabledFeatures?: string[] } = {}) => ({
  encode: (tabIndex: number | null | undefined) =>
    encodeTabQueryParam({ tabIndex, disabledFeatures }),
  decode: (tab: string | (string | null)[] | null | undefined) =>
    decodeTabQueryParam({ tab, disabledFeatures })
})

export const isBuyFeatureEnabled = ({
  disabledFeatures = []
}: { disabledFeatures?: string[] } = {}) => {
  // Buy feature is enabled if onramp is enabled in .env, and buy is not disabled in the query params
  return isOnrampEnabled() && !disabledFeatures.includes(DisabledFeatures.BUY)
}

const cache: Record<
  string,
  {
    sourceChainId: number;
    destinationChainId: number;
  }
> = {};

export function sanitizeQueryParams({
  sourceChainId,
  destinationChainId,
  disableTransfersToNonArbitrumChains = false,
  includeLifiEnabledChainPairs = isLifiEnabled(),
}: {
  sourceChainId: ChainId | number | undefined;
  destinationChainId: ChainId | number | undefined;
  disableTransfersToNonArbitrumChains?: boolean;
  includeLifiEnabledChainPairs?: boolean;
}): {
  sourceChainId: ChainId | number;
  destinationChainId: ChainId | number;
} {
  const key = `${sourceChainId}-${destinationChainId}-${disableTransfersToNonArbitrumChains}-${includeLifiEnabledChainPairs}`;
  const cacheHit = cache[key];
  if (cacheHit) {
    return cacheHit;
  }

  if (
    (!sourceChainId && !destinationChainId) ||
    (!isSupportedChainId(sourceChainId) && !isSupportedChainId(destinationChainId))
  ) {
    // when both `sourceChain` and `destinationChain` are undefined or invalid, default to Ethereum and Arbitrum One
    return (cache[key] = {
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
    });
  }

  // destinationChainId is supported and sourceChainId is undefined
  if (!isSupportedChainId(sourceChainId) && isSupportedChainId(destinationChainId)) {
    // case 1: the destination chain id is supported, but invalid in the context of the feature flag
    const isInvalidDestinationChainId =
      disableTransfersToNonArbitrumChains && isNetwork(destinationChainId).isNonArbitrumNetwork;

    // case 2: the destination chain id is supported and valid, but it doesn't have a source chain partner, eg. sourceChain=undefined and destinationChain=base
    const [defaultSourceChainId] = getDestinationChainIds(destinationChainId, {
      disableTransfersToNonArbitrumChains,
      includeLifiEnabledChainPairs,
    });

    // in both cases, we default to eth<>arbitrum-one pair
    if (typeof defaultSourceChainId === 'undefined' || isInvalidDestinationChainId) {
      return (cache[key] = {
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      });
    }

    return (cache[key] = {
      sourceChainId: defaultSourceChainId,
      destinationChainId,
    });
  }

  // sourceChainId is valid and destinationChainId is undefined
  if (isSupportedChainId(sourceChainId) && !isSupportedChainId(destinationChainId)) {
    const [defaultDestinationChainId] = getDestinationChainIds(sourceChainId, {
      includeLifiEnabledChainPairs,
      disableTransfersToNonArbitrumChains,
    });

    if (typeof defaultDestinationChainId === 'undefined') {
      return (cache[key] = {
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      });
    }

    return (cache[key] = {
      sourceChainId: sourceChainId,
      destinationChainId: defaultDestinationChainId,
    });
  }

  // destinationChainId is not a partner of sourceChainId
  if (
    !getDestinationChainIds(sourceChainId!, {
      disableTransfersToNonArbitrumChains,
      includeLifiEnabledChainPairs,
    }).includes(destinationChainId!)
  ) {
    const [defaultDestinationChainId] = getDestinationChainIds(sourceChainId!, {
      disableTransfersToNonArbitrumChains,
      includeLifiEnabledChainPairs,
    });

    if (!defaultDestinationChainId) {
      return (cache[key] = {
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
      });
    }

    return (cache[key] = {
      sourceChainId: sourceChainId!,
      destinationChainId: defaultDestinationChainId!,
    });
  }

  return (cache[key] = {
    sourceChainId: sourceChainId!,
    destinationChainId: destinationChainId!,
  });
}

export function sanitizeNullSelectedToken({
  sourceChainId,
  destinationChainId,
  erc20ParentAddress,
}: {
  sourceChainId: number | undefined;
  destinationChainId: number | undefined;
  erc20ParentAddress: string | null;
}) {
  if (!sourceChainId || !destinationChainId) {
    return undefined;
  }

  try {
    const destinationChain = getArbitrumNetwork(destinationChainId);

    // If the destination chain has a custom fee token, and selectedToken is null,
    // return native token for deposit from the parent chain, ETH otherwise
    if (destinationChain.nativeToken && !erc20ParentAddress) {
      if (sourceChainId === destinationChain.parentChainId) {
        return erc20ParentAddress;
      }

      return constants.AddressZero;
    }
  } catch (error) {
    // Withdrawing to non Arbitrum chains (Base, Ethereum)
    const sourceChain = getArbitrumNetwork(sourceChainId);
    if (sourceChain.parentChainId === destinationChainId) {
      return erc20ParentAddress;
    }

    return constants.AddressZero;
  }
}

export const sanitizeTokenQueryParam = ({
  token,
  sourceChainId,
  destinationChainId,
}: {
  token: string | null | undefined;
  sourceChainId: number | undefined;
  destinationChainId: number | undefined;
}) => {
  const tokenLowercased = token?.toLowerCase();

  if (!tokenLowercased) {
    const sanitizedTokenAddress = sanitizeNullSelectedToken({
      sourceChainId,
      destinationChainId,
      erc20ParentAddress: tokenLowercased || null,
    });

    if (sanitizedTokenAddress) {
      return sanitizedTokenAddress;
    }
  }
  if (!destinationChainId) {
    return tokenLowercased;
  }

  const orbitChain = orbitChains[destinationChainId];

  const isOrbitChainWithCustomGasToken =
    typeof orbitChain !== 'undefined' &&
    typeof orbitChain.nativeToken !== 'undefined' &&
    orbitChain.nativeToken !== constants.AddressZero;

  // token=eth doesn't need to be set if ETH is the native gas token
  // we strip it for clarity
  if (tokenLowercased === 'eth' && !isOrbitChainWithCustomGasToken) {
    return undefined;
  }

  return tokenLowercased;
};

export const sanitizeTabQueryParam = ({
  tab,
  disabledFeatures = []
}: {
  tab: string | string[] | null | undefined
  disabledFeatures?: string[]
}): string => {
  if (typeof tab === 'string') {
    const lowercasedTab = tab.toLowerCase();

    const { tabToIndex: _tabToIndex } = createTabMappings({ disabledFeatures })

    if (Object.keys(_tabToIndex).includes(lowercasedTab)) {
      return lowercasedTab;
    }
  }

  return TabParamEnum.BRIDGE;
};
