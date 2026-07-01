import {
  Address,
  ImportResolution,
  LayerZeroRouteData,
  RouteMapArtifact,
  RouteOption,
  Token,
  TokenId,
  TokenPayload,
  toTokenId,
} from './types';

export type RegistrySections = {
  canonical?: Map<Address, Address>;
  cctp?: Map<Address, Address>;
  layerzero?: Map<Address, LayerZeroRouteData>;
  lifi?: Map<Address, Address | null>;
};

/**
 * Hydrated, per-pair view of the registry — built once when a pair loads
 * (artifact + both chains' token payloads + session overlay), then read by
 * every selector. Joining, sorting and search-text lowercasing happen here,
 * not per keystroke.
 */
export type RegistryView = {
  sourceChainId: number;
  destinationChainId: number;
  tokens: Map<TokenId, Token>;
  /** transferable source tokens — session-imported first, then sorted by symbol */
  sourceTokens: Token[];
  /** lowercase `${symbol} ${name} ${address}` per token, both chains + overlay */
  searchText: Map<TokenId, string>;
  sections: RegistrySections;
  /** session-imported routes, keyed by source token id */
  overlayRoutes: Map<TokenId, RouteOption[]>;
};

/** Re-derives the fields stripped from the wire format */
export function hydrateTokens(chainId: number, payload: TokenPayload[]): Token[] {
  return payload.map((token) => ({
    ...token,
    chainId,
    id: toTokenId(chainId, token.address),
  }));
}

export function buildRegistryView({
  artifact,
  sourceChainTokens,
  destinationChainTokens,
  overlays = [],
}: {
  artifact: RouteMapArtifact;
  sourceChainTokens: Token[];
  destinationChainTokens: Token[];
  overlays?: ImportResolution[];
}): RegistryView {
  const tokens = new Map<TokenId, Token>();
  for (const token of sourceChainTokens) {
    tokens.set(token.id, token);
  }
  for (const token of destinationChainTokens) {
    tokens.set(token.id, token);
  }
  for (const resolution of overlays) {
    for (const token of resolution.tokens) {
      tokens.set(token.id, token);
    }
  }

  const sections: RegistrySections = {};
  for (const section of artifact.providers) {
    switch (section.provider) {
      case 'canonical':
        sections.canonical = new Map(Object.entries(section.routes) as [Address, Address][]);
        break;
      case 'cctp':
        sections.cctp = new Map(Object.entries(section.routes) as [Address, Address][]);
        break;
      case 'layerzero':
        sections.layerzero = new Map(
          Object.entries(section.routes) as [Address, LayerZeroRouteData][],
        );
        break;
      case 'lifi':
        sections.lifi = new Map(Object.entries(section.routes) as [Address, Address | null][]);
        break;
    }
  }

  const overlayRoutes = new Map<TokenId, RouteOption[]>();
  for (const resolution of overlays) {
    for (const route of resolution.routes) {
      overlayRoutes.set(route.sourceTokenId, [
        ...(overlayRoutes.get(route.sourceTokenId) ?? []),
        route,
      ]);
    }
  }

  const seen = new Set<TokenId>();
  const imported: Token[] = [];
  for (const sourceTokenId of overlayRoutes.keys()) {
    const token = tokens.get(sourceTokenId);
    if (token && token.chainId === artifact.sourceChainId && !seen.has(token.id)) {
      seen.add(token.id);
      imported.push(token);
    }
  }

  const base: Token[] = [];
  for (const sectionMap of [sections.canonical, sections.cctp, sections.layerzero, sections.lifi]) {
    if (!sectionMap) {
      continue;
    }
    for (const address of sectionMap.keys()) {
      const token = tokens.get(toTokenId(artifact.sourceChainId, address));
      if (token && !seen.has(token.id)) {
        seen.add(token.id);
        base.push(token);
      }
    }
  }
  base.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const sourceTokens = [...imported, ...base];

  const searchText = new Map<TokenId, string>();
  for (const token of tokens.values()) {
    searchText.set(token.id, `${token.symbol} ${token.name} ${token.address}`.toLowerCase());
  }

  return {
    sourceChainId: artifact.sourceChainId,
    destinationChainId: artifact.destinationChainId,
    tokens,
    sourceTokens,
    searchText,
    sections,
    overlayRoutes,
  };
}
