import {
  Address,
  ProviderId,
  RouteOption,
  Token,
  TokenId,
  addressFromTokenId,
  toTokenId,
} from './types';
import { RegistryView } from './view';

/** Filters any token list by address / symbol / name via the view's search index */
export function filterTokens(view: RegistryView, tokens: Token[], search?: string): Token[] {
  const term = search?.trim().toLowerCase();
  if (!term) {
    return tokens;
  }
  return tokens.filter((token) => view.searchText.get(token.id)?.includes(term));
}

/** Transferable source tokens, filtered by address / symbol / name search */
export function getSourceTokens(view: RegistryView, search?: string): Token[] {
  return filterTokens(view, view.sourceTokens, search);
}

/** Materializes the route options for a source token, on demand */
export function getRoutes(view: RegistryView, sourceTokenId: TokenId): RouteOption[] {
  const address = addressFromTokenId(sourceTokenId);
  const { canonical, cctp, layerzero, lifi } = view.sections;
  const routes: RouteOption[] = [];

  const canonicalDestination = canonical?.get(address);
  if (canonicalDestination) {
    routes.push({
      provider: 'canonical',
      sourceTokenId,
      destinationTokenId: toTokenId(view.destinationChainId, canonicalDestination),
    });
  }

  const cctpDestination = cctp?.get(address);
  if (cctpDestination) {
    routes.push({
      provider: 'cctp',
      sourceTokenId,
      destinationTokenId: toTokenId(view.destinationChainId, cctpDestination),
    });
  }

  const layerzeroData = layerzero?.get(address);
  if (layerzeroData) {
    routes.push({
      provider: 'layerzero',
      sourceTokenId,
      destinationTokenId: toTokenId(view.destinationChainId, layerzeroData.destination),
      oftAdapter: layerzeroData.oftAdapter,
      destinationEndpointId: layerzeroData.endpointId,
    });
  }

  if (lifi?.has(address)) {
    const counterpart = lifi.get(address);
    routes.push({
      provider: 'lifi',
      sourceTokenId,
      destinationTokenId: counterpart ? toTokenId(view.destinationChainId, counterpart) : undefined,
    });
  }

  routes.push(...(view.overlayRoutes.get(sourceTokenId) ?? []));

  return routes;
}

/** Can this source token be swapped (i.e. does it have a lifi route)? */
export function hasSwapRoute(view: RegistryView, sourceTokenId: TokenId): boolean {
  return view.sections.lifi?.has(addressFromTokenId(sourceTokenId)) ?? false;
}

/**
 * Which tokens can this source token be swapped to? `swapDestinations` is
 * the pair's lazily-fetched swap destination set.
 */
export function getSwapDestinationTokens({
  view,
  sourceTokenId,
  swapDestinations,
}: {
  view: RegistryView;
  sourceTokenId: TokenId;
  swapDestinations: Address[];
}): Token[] {
  if (!hasSwapRoute(view, sourceTokenId)) {
    return [];
  }

  return swapDestinations
    .map((destination) => view.tokens.get(toTokenId(view.destinationChainId, destination)))
    .filter((token): token is Token => Boolean(token));
}

/** Fixed bridge outputs ∪ swap destination set (when provided) */
export function getDestinationTokens({
  view,
  sourceTokenId,
  swapDestinations = [],
}: {
  view: RegistryView;
  sourceTokenId: TokenId;
  swapDestinations?: Address[];
}): Token[] {
  const byId = new Map<TokenId, Token>();

  for (const route of getRoutes(view, sourceTokenId)) {
    if (route.destinationTokenId) {
      const token = view.tokens.get(route.destinationTokenId);
      if (token) {
        byId.set(token.id, token);
      }
    }
  }

  for (const token of getSwapDestinationTokens({ view, sourceTokenId, swapDestinations })) {
    byId.set(token.id, token);
  }

  return [...byId.values()];
}

const defaultDestinationPriority: ProviderId[] = ['layerzero', 'cctp', 'canonical', 'lifi'];

export function getDefaultDestinationToken(
  view: RegistryView,
  sourceTokenId: TokenId,
): Token | null {
  const routes = getRoutes(view, sourceTokenId);

  for (const provider of defaultDestinationPriority) {
    const route = routes.find((option) => option.provider === provider);
    if (route?.destinationTokenId) {
      return view.tokens.get(route.destinationTokenId) ?? null;
    }
  }

  return null;
}

/** Routes able to deliver the chosen destination token */
export function getRoutesForPair({
  view,
  sourceTokenId,
  destinationTokenId,
  swapDestinations = [],
}: {
  view: RegistryView;
  sourceTokenId: TokenId;
  destinationTokenId: TokenId;
  swapDestinations?: Address[];
}): RouteOption[] {
  const destinationAddress = addressFromTokenId(destinationTokenId);
  const inSwapSet = swapDestinations.includes(destinationAddress);

  return getRoutes(view, sourceTokenId).filter((route) => {
    if (route.destinationTokenId === destinationTokenId) {
      return true;
    }
    return route.provider === 'lifi' && inSwapSet;
  });
}
