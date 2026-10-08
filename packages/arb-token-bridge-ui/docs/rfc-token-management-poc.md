# RFC: Backend-led token management for the bridge

| Field  | Value                             |
| ------ | --------------------------------- |
| Status | Proposed for review               |
| Scope  | Token management proof of concept |
| Date   | August 24, 2026                   |

## Decision

Load the selected token and its routes when the bridge opens. Load source and destination picker lists only when the user opens a picker.

The backend owns token normalization, route construction, destination validation, and default selection. The frontend owns display state, URL state, and search within lists returned by the backend.

The backend builds one cached pair registry with `unstable_cache`. The registry contains provider routes, token metadata for both chains, and LiFi destination eligibility. API endpoints derive their responses from that registry.

This design keeps the initial response near 1.2 KB to 1.5 KB instead of loading about 1.57 MB of token and route data for every visitor.

## Why we built the PoC

The current token model does not fit the routes that the bridge now needs to support. A source token can have several providers, several possible destination tokens, or no same-asset token on the destination chain. Some routes work in only one direction. Users can also arrive with token and chain selections in the URL.

The new model needs to support:

- canonical, LayerZero, and LiFi routes for the same source token
- one source token with several destination tokens
- several source tokens that reach one destination token
- swap-only tokens with no same-asset destination token
- native tokens represented by the zero address
- source and destination selections from URL query parameters
- canonical import for tokens missing from the generated registry
- one-way routes, including Robinhood withdrawals
- public caching without wallet-specific keys
- a maximum of 2 MiB for each cached value

The PoC does not preserve the old token-management API. Migration compatibility and migration tests are outside its scope.

## User behavior favors selected-token loading

The bridge usually opens without a picker interaction. A 60-day PostHog snapshot showed the following behavior:

| Behavior                            | Share of bridge visitors |
| ----------------------------------- | -----------------------: |
| Switched any network                |                    20.1% |
| Opened the source token picker      |                    19.7% |
| Opened the destination token picker |                     7.4% |
| Changed the source token            |                    10.8% |
| Changed the destination token       |                     3.6% |

Source-picker abandonment was 45.0%. Destination-picker abandonment was 51.9%. Most users do not need a full token list during the initial bridge load.

Source: [PostHog bridge token behavior dashboard](https://us.posthog.com/project/27078/dashboard/1957153).

## Options considered

### Option 1: Curated tokens with wallet balances

The bridge could show a small curated list before wallet connection, then rank or filter tokens by the connected wallet's balances.

This would make the picker more relevant to the connected user. It would also add balance indexing or many RPC calls. Wallet-specific responses cannot share a public cache, and a wallet address in the cache key increases cache cardinality. A curated default list would need ongoing maintenance.

This option does not solve destination-token availability. Destination validity depends on routes, not wallet balances.

### Option 2: Load complete chain registries and pair routes

The bridge could load both chain registries and the pair route graph when the page opens. Picker interactions would then use data already held by the frontend.

This model has strong cross-pair cache reuse because token metadata is keyed by chain. It also sends about 1.57 MB of raw data before the user opens a picker. More than 80% of visitors do not open the source picker, and more than 92% do not open the destination picker.

This option optimizes the uncommon picker path at the expense of every initial page load.

### Option 3: Selected-token loading with one cached pair registry

This is the selected option.

The backend builds the pair once, caches one JSON value, and derives each endpoint response from it. A cold build makes eight upstream requests. Warm requests reuse the same registry for different source tokens and endpoint shapes.

## The resulting model

### Tokens have one identity across providers

Every token uses the same shape:

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

Native tokens use `0x0000000000000000000000000000000000000000`, so native tokens and ERC-20 tokens use the same variant.

The backend lowercases addresses, applies curated metadata, and creates `Token.id`.

### Routes describe transfer capability

`availableRoutes` contains canonical, LayerZero, and LiFi routes for the selected source token.

Canonical and LayerZero routes always name a destination token. A LiFi route may omit its same-asset destination token. That case means LiFi can swap the source token even though no same-asset counterpart exists on the destination chain.

The route list remains compact. It contains at most one route per provider and does not enumerate every LiFi destination token.

### The backend selects the default destination

When the URL does not contain `destinationToken`, the backend chooses a default in this order:

1. A configured override for the source token.
2. A canonical route.
3. A LayerZero route.
4. A same-asset LiFi route.
5. The destination native token when LiFi supports the source token.

An override changes only the default. It does not remove other routes. Ethereum PYUSD can therefore expose both its canonical and LiFi routes while defaulting to the LiFi PYUSD token on Arbitrum One.

If the URL requests an unreachable destination token, the backend returns the default destination instead.

### URL state works on the first request

The page reads these query parameters:

- `sourceChain`
- `destinationChain`
- `sourceToken`
- `destinationToken`

The page calls the selected-token endpoint with those values during the initial render. Missing or unsupported chain pairs fall back to Ethereum and Arbitrum One. A missing source token falls back to native ETH.

An unknown `sourceToken` address triggers canonical import during the same request. A user can therefore open a shared URL for an imported token without first using the picker.

### Imported tokens stay canonical-only

Import first checks the normal registry. If the source token is absent, the backend asks the canonical bridge to resolve it.

The pasted address may belong to the source chain or its canonical counterpart on the destination chain. The backend resolves the active source token and returns one canonical route. Imported tokens do not receive LiFi routes and do not enter the cached pair registry.

After an interactive import, the frontend keeps the source token as a session overlay so the source picker can display it.

## API shape

The PoC uses three endpoints:

```text
GET /api/token-registry/selection/[sourceChainId]/[destinationChainId]
GET /api/token-registry/source-tokens/[sourceChainId]/[destinationChainId]
GET /api/token-registry/destination-tokens/[sourceChainId]/[destinationChainId]
```

### Selected-token endpoint

The selected-token endpoint accepts optional `sourceToken` and `destinationToken` query parameters. It returns enough data to render the bridge without a picker payload:

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

type SelectedTokenAvailability = {
  sourceToken: Token;
  destinationToken: Token;
  availableRoutes: RouteOption[];
};
```

### Source-token endpoint

The source-token endpoint returns transferable source tokens for one chain pair. The frontend requests it only when the source picker opens.

### Destination-token endpoint

The destination-token endpoint accepts a source token and returns every valid destination choice. It always includes fixed-route destinations. When LiFi supports the source token, it also includes every destination token from the LiFi connection. The frontend requests this full list only when the destination picker opens.

## Cached registry and request flow

The server follows one path for all three endpoints:

```text
Arbitrum token lists + LiFi APIs + hardcoded routes
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

The registry uses this shape:

```ts
type CachedToken = Omit<Token, 'id'> & {
  isLifiDestination?: true;
};

type CachedPairRegistry = {
  providers: ProviderRoutes[];
  tokens: CachedToken[];
};
```

The cache key contains the source chain, the destination chain, and a registry version. The cache revalidates after one hour.

## Measurements

The PoC measurement checkpoint ran on August 24, 2026 against live Ethereum and Arbitrum One inputs.

### Response sizes

| Response                              | Raw bytes | Gzip bytes |
| ------------------------------------- | --------: | ---------: |
| Native ETH selection                  |     1,194 |        194 |
| Ethereum USDC selection               |     1,528 |        406 |
| Source picker, 5,623 tokens           | 1,329,848 |    301,111 |
| USDC destination picker, 1,244 tokens |   325,857 |     75,586 |

The current bridge solution transfers about 1,573 KB of raw token and route data when the Ethereum to Arbitrum One page loads. The PoC transfers about 1.2 KB to 1.5 KB for the initial selection. Based on the observed picker-open rates, the PoC averages about 288 KB of raw token-management data per visitor. This is about 82% less than the current solution.

| Cached value                                  | Raw JSON bytes | 2 MiB headroom |
| --------------------------------------------- | -------------: | -------------: |
| Ethereum to Arbitrum One cached pair registry |      1,758,343 |        338,809 |

### Server timings

`Cached registry lookup` measures the time spent awaiting the cached pair registry. A cold lookup includes registry generation. A warm lookup reads the cached registry. `Handler total` measures from route-handler entry until just before response serialization. The difference includes query parsing, token lookup, route materialization, and default-destination selection.

| Request state                         | Cached registry lookup | Handler total |
| ------------------------------------- | ---------------------: | ------------: |
| Cold selected-token request           |             4,757.1 ms |    4,762.8 ms |
| Warm selected-token request           |                 3.6 ms |        6.2 ms |
| Warm request for another source token |                 3.5 ms |        7.8 ms |

Warm destination-token requests for two more source tokens completed in 12.2 ms and 13.4 ms. A warm source-token response completed in 32.7 ms.

The cold path is dominated by live upstream requests. The cached pair registry removes repeated generation from warm token changes.

## Consequences

The selected design has these benefits:

- The initial bridge request stays small.
- Route rules and default selection have one owner.
- URL selections and imported tokens work on the first request.
- Every endpoint reuses one cached pair registry.
- The cache uses JSON and stays below the 2 MiB limit.

The design also accepts these costs:

- The first request for a cold pair waits for upstream token and route data.
- Opening the source picker transfers a large list.
- Cached pair registries have less cross-pair reuse than chain-scoped token caches.
- A token click makes a small selected-token request.
