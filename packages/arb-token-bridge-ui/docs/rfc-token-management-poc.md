# RFC: Backend-led token management for the bridge

| **Authors**  | @name, @name                                             |
| ------------ | -------------------------------------------------------- |
| **Created**  | 2026-08-24                                               |
| **Modified** | 2026-10-19                                               |
| **Status**   | `draft` → **`draft-review`** → `in-progress` → `shipped` |

### Design Doc Review

| Reviewer | Status        | Last Review |
| -------- | ------------- | ----------- |
| @name    | `in-progress` | YYYY-MM-DD  |
| …        |               |             |

# 1. Overview

The bridge currently sends about 1.57 MB of token and route data to every visitor on page load, even though most visitors never open a token picker. This RFC proposes loading only the selected source token, the selected destination token, and the available routes when the bridge opens. A picker list loads only when the user opens that picker.

The backend owns token normalization, route construction, destination validation, and default selection. The frontend owns display state, URL state, and search within lists returned by the backend. The backend builds and caches one registry for each chain pair, and three API endpoints derive their responses from that registry. The initial response drops to between 1.2 KB and 1.5 KB.

# 2. Background

Token management in the bridge is client-led today. The frontend loads complete token lists, merges them into `bridgeTokens`, discovers providers on the client, and derives source and destination addresses from `ERC20BridgeToken` (`address` for the parent chain, `l2Address` for the child chain). A paired parent/child address does not fit one-to-many or many-to-one token mappings, single-chain tokens, or one-way routes, and the client-side lists make every visitor download every token.

Most bridge visits do not include a picker interaction. A 60-day PostHog snapshot reports:

| Behavior                            | Users | Share of bridge visitors |
| ----------------------------------- | ----: | -----------------------: |
| Switched any network                | 1,727 |                    20.1% |
| Opened the source token picker      | 1,690 |                    19.7% |
| Opened the destination token picker |   638 |                     7.4% |
| Changed the source token            |   929 |                    10.8% |
| Changed the destination token       |   307 |                     3.6% |

Among users who opened a picker, 45.0% abandoned the source picker and 51.9% abandoned the destination picker. Loading both complete token lists on page load makes every visitor pay for data that few visitors use.

## Other Resources

- [PostHog bridge token behavior dashboard](https://us.posthog.com/project/27078/dashboard/1957153)
- [Token management migration plan](./token-management-migration-plan.md)

# 3. Goals & Non-Goals

## Goals

The token model must support:

- one source token with many destination tokens
- many source tokens that reach one destination token
- tokens that exist on only one chain, such as stock tokens on Robinhood
- canonical imports for tokens absent from the generated registry
- routes that work in only one direction
- canonical, LayerZero, and LiFi routes for the same source token
- swap-only tokens with no same-asset token on the destination chain
- source and destination selections from URL query parameters
- native tokens represented by the zero address
- public caching without wallet-specific keys
- cached values below the 2 MiB limit

Success is measured by:

- an initial token-management response between 1.2 KB and 1.5 KB, down from about 1,573 KB
- an average of about 288 KB of raw token-management data per visitor at observed picker-open rates
- warm selection requests completing in under 10 ms in the handler
- every production pair registry staying below 2 MiB

## Non-Goals

- **Preserving the old token-management API.** The PoC replaces it rather than wrapping it.
- **Migration compatibility and migration tests.** These belong to the [migration plan](./token-management-migration-plan.md), not the PoC.
- **Enumerating every swap destination in the selection response.** The destination picker endpoint returns that list on demand.

# 4. Proposed Design

Every visitor receives the data required to render the current selection. Picker users pay for picker data when they ask for it.

The backend still builds the complete pair registry once. `unstable_cache` stores that registry for one hour, so token changes and endpoint calls reuse the same upstream result. A cold build makes eight upstream requests. Warm calls for another token read the cached registry.

## Token and route model

### Tokens use one identity across providers

```ts
type Token = {
  id: `${number}:${Address}`;
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};
```

`Token.id` combines the chain ID with the lowercase token address. Native tokens use `0x0000000000000000000000000000000000000000`, so native tokens and ERC-20 tokens share one model.

The backend lowercases addresses and applies curated metadata before it creates a `Token`.

### Routes describe transfer capability

```ts
type RouteOption =
  | {
      provider: 'canonical';
      sourceToken: Token;
      destinationToken: Token;
    }
  | {
      provider: 'layerzero';
      sourceToken: Token;
      destinationToken: Token;
      oftAdapter: Address;
      destinationEndpointId: number;
    }
  | {
      provider: 'lifi';
      sourceToken: Token;
      destinationToken?: Token;
    };
```

`availableRoutes` contains at most one route for each provider that supports the selected source token. Canonical and LayerZero routes name their destination tokens. A LiFi route names a same-asset destination when one exists. If no same-asset token exists, the LiFi route omits `destinationToken` and the backend selects the destination native token by default.

The LiFi route does not enumerate every possible swap destination. The destination picker endpoint returns that list on demand.

## Destination selection

Without a `destinationToken` query parameter, the backend chooses the destination in this order:

1. A configured override for the source token.
2. A canonical destination.
3. A LayerZero destination.
4. A same-asset LiFi destination.
5. The destination native token when LiFi supports the source token.

An override changes the default. It does not remove other routes. Ethereum PYUSD therefore exposes both canonical and LiFi routes while defaulting to LiFi PYUSD on Arbitrum One.

When the request includes `destinationToken`, the backend checks that the selected source can reach it. If the destination is invalid, the backend returns the default destination without an error.

`availableRoutes` remains the compact provider set for the source token. Runtime route construction uses the selected destination to decide which providers apply.

## URL and import flow

The page reads `sourceChain`, `destinationChain`, `sourceToken`, and `destinationToken` from the URL. It calls the selection endpoint during the initial render. An unsupported chain pair falls back to Ethereum and Arbitrum One. A missing source token falls back to native ETH.

If the registry does not contain `sourceToken`, the selection endpoint tries a canonical import. The pasted address can belong to the source chain or to the destination chain. The backend resolves the corresponding source token and returns one canonical route.

Imported tokens stay outside the cached registry and do not receive LiFi routes. The frontend stores a successful import in a session overlay so that the source picker can display it. If the user selects another token and later selects the imported token again, the frontend calls the selection endpoint and the backend resolves the canonical route again.

The import flow uses the selection endpoint. It does not need a separate import endpoint.

## API

The PoC exposes three endpoints.

### Get the selected tokens and routes

```text
GET /api/token-registry/selection/[sourceChainId]/[destinationChainId]
```

Query parameters:

| Name               | Required | Meaning                                             |
| ------------------ | -------- | --------------------------------------------------- |
| `sourceToken`      | No       | Source token address. Defaults to the zero address. |
| `destinationToken` | No       | Requested destination token address.                |

The endpoint returns:

```ts
type SelectedTokenAvailability = {
  sourceToken: Token;
  destinationToken: Token;
  availableRoutes: RouteOption[];
};
```

The endpoint resolves canonical imports when the registry does not contain the source token. An invalid destination falls back to the default destination. An unsupported pair or an unavailable source returns `404`.

The frontend calls this endpoint on initial load, source selection, destination selection, chain change, network flip, and import.

### Get source picker tokens

```text
GET /api/token-registry/source-tokens/[sourceChainId]/[destinationChainId]
```

The endpoint has no query parameters. It returns `Token[]` with every source token that has at least one route and a valid default destination for the pair.

The frontend calls this endpoint when the source picker opens. Its SWR key contains only the chain pair, so selecting another source token does not reload the list.

### Get destination picker tokens

```text
GET /api/token-registry/destination-tokens/[sourceChainId]/[destinationChainId]?sourceToken=0x...
```

`sourceToken` identifies the current source token and defaults to the zero address. The endpoint returns `Token[]` with fixed-route destinations and every destination token accepted by the LiFi connection. For a canonical import, it returns only the imported canonical destination.

The frontend calls this endpoint when the destination picker opens. Its SWR key contains the chain pair and the source token. Selecting a destination token does not reload the list.

## Cached pair registry

All endpoints follow the same server path:

```text
Arbitrum token lists + LiFi APIs + configured routes
                         |
                         v
                cached pair registry
                         |
                  unstable_cache
                         |
          +--------------+--------------+
          |              |              |
      selection     source tokens   destination tokens
```

The cached value uses this shape:

```ts
type CachedToken = Omit<Token, 'id'> & {
  isLifiDestination?: true;
};

type CachedPairRegistry = {
  providers: ProviderRoutes[];
  tokens: CachedToken[];
};
```

The cache key contains the source chain, the destination chain, and `PAIR_REGISTRY_CACHE_VERSION`. The cache revalidates after one hour. The API derives token indexes from this value in memory and does not cache duplicate index objects.

## Payload and interaction cost

The PoC sends about 1.2 KB to 1.5 KB on initial load. Based on observed picker-open rates, it averages about 288 KB of raw token-management data per visitor. The current bridge sends about 1,573 KB on page load.

| User action                       |                                               Additional request cost |
| --------------------------------- | --------------------------------------------------------------------: |
| Open the bridge                   | One selection response, 1,194 to 1,528 bytes in the measured examples |
| Open the source picker for a pair |               1,329,848 bytes on first open; cached by SWR after that |
| Open the USDC destination picker  |            325,857 bytes on first open for that pair and source token |
| Change the source token           |         One selection response; the source picker list remains cached |
| Change the destination token      |    One selection response; the destination picker list remains cached |
| Change or flip networks           |     One selection response for the new pair; picker lists remain lazy |

The 288 KB estimate counts one source-picker response for 19.7% of visitors and one destination-picker response for 7.4% of visitors. It also includes the small selection requests caused by token and network changes. It does not assume that picker audiences are disjoint. See [Appendix: Detailed measurements](#detailed-measurements) for response sizes and latencies.

## Tradeoffs

This design trades a request on each selection change for a much smaller initial response. The trade is favorable while picker-open rates remain low and the selection response remains small. It also keeps route rules in the backend and makes URL selections and canonical imports work on the first request.

The costs:

- The first request for a cold pair waits for upstream token and route data (about 4.8 s in the measured run).
- The source picker response is large (about 1.33 MB raw, 301 KB gzip).
- Pair registries reuse less data across pairs than chain-scoped token caches.

# 5. Alternatives Considered

### Option 1: Curated source tokens with wallet balances

The bridge could show a curated source list before wallet connection. After connection, it could rank tokens by balance while still allowing a user to search for a zero-balance token.

**Why rejected:** This option can keep the first response small, but it requires balance indexing or many RPC calls. Wallet-specific responses cannot use one public cache, and wallet addresses increase cache cardinality. The curated list also needs maintenance. Wallet balances do not answer the destination question either: the bridge still needs route data to determine which destination tokens are valid.

### Option 2: Complete chain registries with server-filtered pair routes

The bridge could load both chain registries and the server-filtered routes for the selected pair when the page opens. Picker interactions would then reuse token data already held by the frontend.

**Why rejected:** This option has strong cache reuse because token metadata is keyed by chain, but it sends about 1.57 MB before a picker opens. More than 80% of visitors do not open the source picker, and more than 92% do not open the destination picker. The design spends bandwidth on the uncommon picker path to save later requests for a small group of users.

# 6. Security Considerations

- **No wallet data in token requests.** The endpoints take only chain IDs and token addresses. Responses are public and cacheable, and wallet addresses never reach the token-registry API or its cache keys.
- **Bounded cache keys.** The registry cache key contains only the chain pair and `PAIR_REGISTRY_CACHE_VERSION`. Token query parameters do not create cache entries, and unsupported pairs return `404` instead of triggering a registry build.
- **Imports stay out of the shared cache.** An imported token is resolved per request and never written to the cached registry, so one user's import cannot change what other users see.
- **Upstream data is untrusted.** The registry combines Arbitrum token lists, LiFi APIs, and configured routes. The [migration plan](./token-management-migration-plan.md) requires validating every upstream response with Zod before normalization.
- **Transfer-layer checks are unchanged.** Warning-token checks, first-deployment confirmation, transfer-disabled and withdraw-only checks remain in the existing transfer layer.

## Threat Model / Risk Scenarios

| Scenario                                                                     | Mitigation                                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A malicious URL preselects a lookalike token through `sourceToken`.          | Imports return only a canonical route. Token warnings and first-deployment confirmation still run before transfer.                  |
| A malicious URL requests an unreachable `destinationToken`.                  | The backend validates reachability and returns the default destination.                                                             |
| An upstream provider returns malformed or poisoned data.                     | Schema validation rejects malformed payloads. A failing provider is omitted while healthy providers keep serving routes.            |
| Requests for many token addresses try to inflate the cache.                  | Token addresses are not part of the cache key; only the chain pair is.                                                              |
| A pair registry grows past the 2 MiB cache limit and silently stops caching. | Tests assert every production pair stays below 2 MiB. The Ethereum to Arbitrum One registry currently has about 339 KB of headroom. |

# 7. Implementation Plan

The [migration plan](./token-management-migration-plan.md) delivers this design in two pull requests.

**PR 1: Implement and test the RFC API.**

- Define shared schemas for `Token`, `RouteOption`, and each endpoint response, used by both route handlers and the bridge client.
- Fetch canonical, LayerZero, and LiFi data independently, validate each upstream response, combine them into one pair registry, and cache it with `unstable_cache`.
- Read native-token metadata from `orbitChainsData.json`, adding and validating decimals.
- Implement the three endpoints and add production pair and route configuration once representative pairs pass the API tests.
- The production bridge does not consume the API in this PR.

**PR 2: Migrate the bridge and delete the old system.**

- Replace `useSelectedToken` and `useDestinationToken` with one selection resource keyed by source chain, destination chain, source token, and destination token.
- Change `TokenSearch` and `DestinationTokenSearch` to load their lists on picker open. Rank by balance for connected users using bounded multicalls.
- Feed `availableRoutes` into `useRoutesUpdater` instead of client-side provider discovery.
- Replace paired-address consumers of `ERC20BridgeToken` with explicit `sourceToken` and `destinationToken`.
- Move prices to a resource keyed by `Token.id`, and derive imported status from the session overlay.
- Delete `ERC20BridgeToken`, `bridgeTokens`, `TokenListSyncer`, token-list settings and UI, and the old LiFi token-list endpoint.

PR 1 can ship on its own because nothing in production calls it.

# 8. Testing Plan

**API tests (PR 1)** cover:

- default selection without a destination query
- explicit destination selection and invalid-destination fallback
- URL selection and automatic canonical import
- canonical-only routes for imported tokens
- import by either the source-chain address or the destination-chain address
- selecting an imported token again after selecting another token
- one-way canonical and LayerZero routes
- LiFi source tokens without a same-asset destination
- one-to-many and many-to-one token mappings
- tokens that exist on only one chain
- independent provider failures and malformed upstream payloads
- native-token metadata and zero-address identity
- one cached value below 2 MiB for every production pair
- warm requests for different tokens that reuse the same cached pair registry

**Bridge acceptance tests (before and after PR 2)** use deterministic token and provider fixtures so they do not depend on live token-list contents. They cover initial render, explicit destinations, both pickers, connected and disconnected ranking, provider failure, rapid selection changes, native tokens, both transfer directions, runtime policy, analytics and transaction records, cache size, and removal of legacy callers. The full verification matrix is in the [migration plan](./token-management-migration-plan.md#verification-matrix).

# 9. Rollout & Migration

The migration does not add compatibility types, a feature flag, or a second production path.

- **PR 1** adds the API without production consumers, so it ships with no user-facing change.
- **PR 2** moves every token-selection path to the API and deletes the legacy system in the same change.
- **Existing data:** analytics event names and stored transaction shapes are preserved. Where an existing field requires a canonical parent address, the write boundary maps the chain-specific token to it. Token-list settings stored by users are dropped along with the management UI.
- **Cache changes:** bumping `PAIR_REGISTRY_CACHE_VERSION` invalidates every pair registry without a deploy-time purge.
- **Rollback:** revert PR 2. PR 1 can stay deployed because nothing else depends on it.

## **Observability**

TBD. Candidate signals:

- cold registry build duration and upstream request failures per provider
- pair registry size against the 2 MiB limit
- selection, source-picker, and destination-picker response sizes and latencies
- picker-open rates from the existing PostHog dashboard, to confirm the lazy-loading assumption still holds

# 10. Open Questions

| Question                                                                               | Owner |
| -------------------------------------------------------------------------------------- | ----- |
| Is one cached pair registry the right boundary for production?                         | TBD   |
| Should the production API keep the current silent fallback for an invalid destination? | TBD   |
| Are the measured picker rates stable enough to justify lazy list loading?              | TBD   |
| What alerts and dashboards should cover registry builds and cache size after launch?   | TBD   |

# 11. FAQ

**Does selecting another source token reload the source picker list?**
No. The source picker SWR key contains only the chain pair. The destination picker key contains the chain pair and the source token, so selecting a destination token does not reload it either.

**Why is there no import endpoint?**
The selection endpoint already handles it. When the registry does not contain `sourceToken`, the endpoint attempts a canonical import using either the source-chain or destination-chain address.

**Does a configured destination override hide other routes?**
No. An override changes only the default destination. Ethereum PYUSD exposes both canonical and LiFi routes while defaulting to LiFi PYUSD on Arbitrum One.

# 12. Appendix

## Glossary

- **Pair registry:** the cached set of tokens and provider routes for one source chain and destination chain.
- **Canonical import:** resolving a token absent from the registry through the canonical bridge, by its source-chain or destination-chain address.
- **Selection response:** the `SelectedTokenAvailability` payload containing the source token, destination token, and `availableRoutes`.

## Detailed measurements

The measurement checkpoint ran on August 24, 2026 with live Ethereum and Arbitrum One inputs.

| Response                              | Raw bytes | Gzip bytes |
| ------------------------------------- | --------: | ---------: |
| Native ETH selection                  |     1,194 |        194 |
| Ethereum USDC selection               |     1,528 |        406 |
| Source picker, 5,623 tokens           | 1,329,848 |    301,111 |
| USDC destination picker, 1,244 tokens |   325,857 |     75,586 |

| Cached value                                  | Raw JSON bytes | 2 MiB headroom |
| --------------------------------------------- | -------------: | -------------: |
| Ethereum to Arbitrum One cached pair registry |      1,758,343 |        338,809 |

`Cached registry lookup` measures the wait for the cached pair registry. A cold lookup includes registry generation. A warm lookup reads the cached value. `Handler total` measures route-handler entry through the point before response serialization.

| Request state                         | Cached registry lookup | Handler total |
| ------------------------------------- | ---------------------: | ------------: |
| Cold selected-token request           |             4,757.1 ms |    4,762.8 ms |
| Warm selected-token request           |                 3.6 ms |        6.2 ms |
| Warm request for another source token |                 3.5 ms |        7.8 ms |

Warm destination-token requests for two more source tokens completed in 12.2 ms and 13.4 ms. A warm source-token response completed in 32.7 ms.
