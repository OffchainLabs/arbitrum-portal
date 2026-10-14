# RFC: Backend-led token management for the bridge

| Field  | Value                             |
| ------ | --------------------------------- |
| Status | Proposed for review               |
| Scope  | Token management proof of concept |
| Date   | August 24, 2026                   |

## Summary

Load the selected source token, destination token, and available routes when the bridge opens. Load a picker list only when the user opens that picker.

The backend owns token normalization, route construction, destination validation, and default selection. The frontend owns display state, URL state, and search within lists returned by the backend.

The backend builds and caches one registry for each chain pair. All three API endpoints derive their responses from that registry. This keeps the initial response between 1.2 KB and 1.5 KB instead of sending about 1.57 MB of token and route data to every visitor.

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

The PoC does not preserve the old token-management API. Migration compatibility and migration tests are outside its scope.

## Bridge behavior supports lazy picker loading

Most bridge visits do not include a picker interaction. A 60-day PostHog snapshot reports:

| Behavior                            | Users | Share of bridge visitors |
| ----------------------------------- | ----: | -----------------------: |
| Switched any network                | 1,727 |                    20.1% |
| Opened the source token picker      | 1,690 |                    19.7% |
| Opened the destination token picker |   638 |                     7.4% |
| Changed the source token            |   929 |                    10.8% |
| Changed the destination token       |   307 |                     3.6% |

Among users who opened a picker, 45.0% abandoned the source picker and 51.9% abandoned the destination picker. Loading both complete token lists on page load makes every visitor pay for data that few visitors use.

Source: [PostHog bridge token behavior dashboard](https://us.posthog.com/project/27078/dashboard/1957153).

## Alternatives not selected

### Option 1: Curated source tokens with wallet balances

The bridge could show a curated source list before wallet connection. After connection, it could rank tokens by balance while still allowing a user to search for a zero-balance token.

This option can keep the first response small, but it requires balance indexing or many RPC calls. Wallet-specific responses cannot use one public cache, and wallet addresses increase cache cardinality. The curated list also needs maintenance.

Wallet balances do not answer the destination question. The bridge still needs route data to determine which destination tokens are valid.

### Option 2: Complete chain registries with server-filtered pair routes

The bridge could load both chain registries and the server-filtered routes for the selected pair when the page opens. Picker interactions would then reuse token data already held by the frontend.

This option has strong cache reuse because token metadata is keyed by chain. It also sends about 1.57 MB before a picker opens. More than 80% of visitors do not open the source picker, and more than 92% do not open the destination picker.

The design spends bandwidth on the uncommon picker path to save later requests for a small group of users.

## Why selected-token loading is the current proposal

Selected-token loading matches the common bridge session. Every visitor receives the data required to render the current selection. Picker users pay for picker data when they ask for it.

The backend still builds the complete pair registry once. `unstable_cache` stores that registry for one hour, so token changes and endpoint calls reuse the same upstream result. A cold build makes eight upstream requests. Warm calls for another token read the cached registry.

This choice trades a request on each selection change for a much smaller initial response. The trade is favorable while picker-open rates remain low and the selection response remains small.

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

The 288 KB estimate counts one source-picker response for 19.7% of visitors and one destination-picker response for 7.4% of visitors. It also includes the small selection requests caused by token and network changes. It does not assume that picker audiences are disjoint.

<details>
<summary>Detailed measurements</summary>

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

</details>

## Tradeoffs and review questions

The proposal keeps the common path small and puts route rules in the backend. It also makes URL selections and canonical imports work on the first request.

The first request for a cold pair still waits for upstream token and route data. The source picker response is large, and pair registries reuse less data across pairs than chain-scoped token caches.

Review should focus on these questions:

- Is one cached pair registry the right boundary for production?
- Should the production API keep the current silent fallback for an invalid destination?
- Are the measured picker rates stable enough to justify lazy list loading?
