/*

  This hook is an abstraction over `useQueryParams` hooks' library
  - It contains all the browser query params we use / intend to use in our application
  - Provides methods to listen to, and update all these query params
  - If we introduce a new queryParam for our bridge in the future, define it here and it will be accessible throughout the app :)

  - Example - to get the value of `?amount=` in browser, simply use
    `const [{ amount }] = useArbQueryParams()`

  - Example - to set the value of `?amount=` in browser, simply use
    `const [, setQueryParams] = useArbQueryParams()`
    `setQueryParams(newAmount)`

*/
import NextAdapterApp from 'next-query-params/app';
import queryString from 'query-string';
import { useCallback } from 'react';
import {
  BooleanParam,
  DecodedValueMap,
  QueryParamOptions,
  QueryParamProvider,
  SetQuery,
  StringParam,
  useQueryParams,
  withDefault,
} from 'use-query-params';

import {
  AmountQueryParam,
  AmountQueryParamEnum,
  ChainParam,
  DestinationTokenQueryParam,
  DisabledFeatures,
  DisabledFeaturesParam,
  TabParam,
  TabParamEnum,
  ThemeParam,
  TokenQueryParam,
  decodeChainQueryParam,
  decodeTabQueryParam,
  encodeChainQueryParam,
  encodeTabQueryParam,
  indexToTab,
  isValidDisabledFeature,
  sanitizeAmountQueryParam,
  tabToIndex,
} from '../util/queryParamUtils';
import { defaultTheme } from './useTheme';

export {
  TabParamEnum,
  DisabledFeatures,
  AmountQueryParamEnum,
  tabToIndex,
  indexToTab,
  isValidDisabledFeature,
  DisabledFeaturesParam,
  encodeChainQueryParam,
  decodeChainQueryParam,
  encodeTabQueryParam,
  decodeTabQueryParam,
  ThemeParam,
  AmountQueryParam,
  sanitizeAmountQueryParam,
  TokenQueryParam,
  DestinationTokenQueryParam,
  ChainParam,
  TabParam,
};

export const queryParamProviderOptions = {
  searchStringToObject: queryString.parse,
  objectToSearchString: queryString.stringify,
  updateType: 'replaceIn', // replace just a single parameter when updating query-state, leaving the rest as is
  removeDefaultsFromUrl: true,
  enableBatching: true,
  params: {
    sourceChain: ChainParam,
    destinationChain: ChainParam,
    amount: withDefault(AmountQueryParam, ''), // amount which is filled in Transfer panel
    amount2: withDefault(AmountQueryParam, ''), // extra eth to send together with erc20
    destinationAddress: withDefault(StringParam, undefined),
    token: TokenQueryParam, // import a new token using a Dialog Box
    destinationToken: DestinationTokenQueryParam, // token to receive on destination via LiFi
    settingsOpen: withDefault(BooleanParam, false),
    tab: withDefault(TabParam, tabToIndex[TabParamEnum.BRIDGE]), // which tab is active
    disabledFeatures: withDefault(DisabledFeaturesParam, []), // disabled features in the bridge
    theme: withDefault(ThemeParam, defaultTheme), // theme customization
  },
} as const satisfies QueryParamOptions;

type ArbQueryParamConfigMap = typeof queryParamProviderOptions.params;
type PartialArbQueryParams = Partial<DecodedValueMap<ArbQueryParamConfigMap>>;

/**
 * We use variables outside of the hook to share the accumulator accross multiple calls of useArbQueryParams
 */
let pendingUpdates: PartialArbQueryParams & Record<string, unknown> = {
  /** If no sanitization happened on the server, set a flag on first change of query param to avoid infinite loop */
  sanitized: 'true',
};
let debounceTimeout: NodeJS.Timeout | null = null;
export type SetQueryParamsParameters =
  | PartialArbQueryParams
  | ((latestValues: DecodedValueMap<ArbQueryParamConfigMap>) => PartialArbQueryParams);

const debouncedUpdateQueryParams = (
  updates: SetQueryParamsParameters,
  originalSetQueryParams: SetQuery<ArbQueryParamConfigMap>,
  /** debounce only applies to object update, for function updates it will be called immediately */
  debounce: boolean = false,
) => {
  if (typeof updates === 'function') {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }

    originalSetQueryParams((prevState) => updates({ ...prevState, ...pendingUpdates }));
    pendingUpdates = {};
    return;
  }

  pendingUpdates = { ...pendingUpdates, ...updates };

  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  if (debounce) {
    debounceTimeout = setTimeout(() => {
      originalSetQueryParams(pendingUpdates);
      pendingUpdates = {};
      debounceTimeout = null;
    }, 400);
  } else {
    originalSetQueryParams(pendingUpdates);
    pendingUpdates = {};
    debounceTimeout = null;
  }
};

export const useArbQueryParams = () => {
  /*
    returns [
      queryParams (getter for all query state variables),
      setQueryParams (setter for all query state variables with debounced accumulator)
    ]
  */
  const [queryParams, setQueryParams] = useQueryParams<ArbQueryParamConfigMap>();
  console.log('[query-params] state', queryParams);

  const debouncedSetQueryParams = useCallback(
    (updates: SetQueryParamsParameters, { debounce }: { debounce?: boolean } = {}) =>
      debouncedUpdateQueryParams(updates, setQueryParams, debounce),
    [setQueryParams],
  );

  return [queryParams, debouncedSetQueryParams] as const;
};

export function ArbQueryParamProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryParamProvider adapter={NextAdapterApp} options={queryParamProviderOptions}>
      {children}
    </QueryParamProvider>
  );
}
