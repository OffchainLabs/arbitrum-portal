# RFC: Backend-led token management for the bridge

| **Authors**            | @name, @name                                             |
| ---------------------- | -------------------------------------------------------- |
| **Created**            | 2026-08-24                                               |
| **Modified**           | 2026-10-23                                               |
| **Status**             | `draft` → **`draft-review`** → `in-progress` → `shipped` |
| **Reference revision** |                                                          |

### Design Doc Review

| Reviewer | Status        | Last Review |
| -------- | ------------- | ----------- |
| @name    | `in-progress` | YYYY-MM-DD  |
| …        |               |             |

## TL;DR

The bridge stores each token as one parent-chain address paired with one child-chain address. That model cannot describe PYUSD, which reaches two different tokens on Arbitrum One. It also cannot describe USDC, where two Arbitrum One tokens withdraw to one Ethereum token. Today each of these cases is a hardcoded branch, and every new chain or provider adds more.

This RFC moves token management to the backend and replaces the address pair with two types:

- `Token` is one token on one chain, with its own symbol and name.
- `RouteOption` names the exact source token and destination token for one provider: canonical, LayerZero, or LiFi.

The goal is that a new multi-route asset or chain pair needs a configuration change, not new bridge code. The PoC at `/token-registry-poc` implements the design for Ethereum, Arbitrum One, and Robinhood.

The key decisions are these:

- The backend builds tokens and routes from the Arbitrum token lists, LiFi, and the configured routes. It also picks the default destination, resolves token imports, applies route blocks, and decides batch support and picker pins.
- The frontend renders and searches the lists, sorts tokens by balance, and builds runtime routes from live quotes.
- Three endpoints replace the client-side token lists: selection, source picker, and destination picker. The page loads 1.2 KB to 1.5 KB instead of 1,573 KB. Picker lists load when the user opens a picker.
- The backend caches token metadata per chain and routes per chain pair for one hour. Every entry stays under the 2 MiB cache limit. The largest entry, Ethereum tokens, uses 64% of it.
- The bridge moves to the API in one step, with no compatibility layer. The migration then deletes the old token management.

The design has three costs:

- The first request for a cold pair waits about 4.8 seconds for upstream data. We like this cost least.
- The source picker response is 1.33 MB raw and 301 KB gzipped.
- A request reads three cache entries, and the entries expire separately.

One question is still open: whether a short configured list can replace the `oftVersion()` fallback for the OFT deposit block. See [Open Questions](#9-open-questions).

# 1. Overview

The bridge models a token as one address on the parent chain paired with one address on the child chain. That model cannot describe stablecoins like PYUSD and USDC. Ethereum PYUSD reaches two different tokens on Arbitrum One. Ethereum USDC reaches native USDC and bridged USDC.e on Arbitrum One, and both of those withdraw to the same Ethereum USDC. The same asset also has a different symbol and name on each chain. Today each of these cases is a hardcoded branch in bridge code, and every new chain, provider, or multi-route asset adds another branch.

This RFC replaces the address pair with two types. A `Token` describes one token on one chain, with its own symbol and name. A `RouteOption` names the exact source token and destination token that one provider transfers. The backend builds these tokens and routes for each chain pair from the Arbitrum token lists, the LiFi APIs, and the configured routes. A new multi-route asset then needs configuration, not new code.

Because the backend now owns the model, the frontend can load only what it renders. The initial response drops from about 1,573 KB to between 1.2 KB and 1.5 KB. The smaller response is a welcome side effect, not the reason for the change.

# 2. Background

Today the frontend owns token management. It loads complete token lists, merges them into `bridgeTokens`, and discovers providers on the client. Each `ERC20BridgeToken` stores the parent-chain address in `address` and the child-chain address in `l2Address`. The bridge picks one of the two addresses based on the transfer direction.

## One address pair per token does not scale

A pair holds exactly one token on each side, with one symbol and one name. Real assets break each part of that rule.

- **PYUSD has two destinations.** The canonical gateway maps Ethereum PYUSD to the token that `CommonAddress` calls `ArbitrumOne.PYUSD_CANONICAL`. The bridge needs to deliver native PYUSD instead, which is `ArbitrumOne.PYUSD`. To get there, it disables the canonical transfer in `TokenTransferDisabledUtils.ts` and allows the LiFi transfer through the hardcoded `isPyusdDeposit` and `isPyusdWithdrawal` checks.
- **USDC has two tokens on Arbitrum One that withdraw to one.** Native USDC and bridged USDC.e both withdraw to Ethereum USDC. The bridge handles this case with `isUsdcToken` and `getUsdc` in `app/api/crosschain-transfers/utils.ts`, plus the `isToken*USDC*` helpers in `util/TokenUtils.ts`. 18 files call those helpers.
- **Symbols and names differ by chain.** USDC is "USDC" on Ethereum, "USDC.e" with the name "Bridged USDC" on ApeChain, and "USD Coin" on Base. `getUsdc` hardcodes each of these values. `ERC20BridgeToken` has room for one symbol and one name, so a withdrawal of USDC.e overwrites the name by hand.
- **Some tokens exist on one chain only.** Stock tokens on Robinhood have no counterpart on the other chain, so a pair has no meaning for them.
- **Some routes work in one direction only.** A pair implies that the same two tokens connect both ways.

Each new case adds a branch in shared bridge code. The branches also spread, because every caller that reads `address` or `l2Address` has to know which assets break the rule. The code already admits the gap. Next to the hardcoded WETH metadata, a comment reads "Temporary solution until token lists support overrides."

## The lists also cost every visitor 1.57 MB

The client-side lists make every visitor download every token, and most visitors never open a picker. A 60-day PostHog snapshot reports these numbers:

| Behavior                                 |  Users | Share of bridge visitors |
| ---------------------------------------- | -----: | -----------------------: |
| Switched any network                     | 15,549 |                    12.8% |
| Switched the source chain only           |  3,290 |                     2.7% |
| Switched the destination chain only      |  3,681 |                     3.0% |
| Switched both chains                     |  8,578 |                     7.1% |
| Opened the source token picker           | 24,229 |                    19.9% |
| Searched in the source token picker      |  7,068 |                     5.8% |
| Changed the source token                 | 13,709 |                    11.3% |
| Opened the destination token picker      |  8,898 |                     7.3% |
| Searched in the destination token picker |  2,803 |                     2.3% |
| Changed the destination token            |  4,874 |                     4.0% |

Almost half of the users who open a picker close it without a change. For the source picker, that was 10,520 users, or 43.4% of openers. For the destination picker, it was 4,024 users, or 45.2% of openers. Loading both complete lists on page load makes every visitor pay for data that few visitors use.

## Other Resources

- [PostHog bridge token behavior dashboard](https://us.posthog.com/project/27078/dashboard/1957153)

# 3. Goals & Non-Goals

## Goals

The token model must support these cases:

- one source token with many destination tokens, such as Ethereum PYUSD
- many source tokens that reach one destination token, such as Arbitrum One USDC and USDC.e
- a different symbol and name for the same asset on each chain
- tokens that exist on one chain only, such as stock tokens on Robinhood
- routes that work in one direction only
- canonical, LayerZero, and LiFi routes for the same source token
- swap-only tokens with no same-asset token on the destination chain
- canonical imports for tokens without a canonical route in the generated registry
- batched deposits that name the extra token on both chains
- source and destination selections from URL query parameters
- native tokens represented by the zero address
- public caching without wallet-specific keys
- cached values below the 2 MiB limit

The design succeeds when it meets these targets:

- An API test covers each case in the list above, and every test passes.
- PYUSD, USDC, and USDT0 need no token-specific branch outside `packages/app/src/token-registry/constants.ts`.
- A new multi-route asset or chain pair needs a configuration change only, with no change to bridge code.
- Every caller receives the exact source token and destination token, with no direction-based address lookup.

The smaller initial response, about 1.2 KB to 1.5 KB instead of 1,573 KB, is a bonus. It is not a success criterion.

## Non-Goals

- The design does not preserve the old token-management API. The new API replaces it.
- The design adds no compatibility layer for the old token types. The [implementation plan](#6-implementation-plan) moves every caller to the new types and deletes the old ones.
- The selection response does not list every swap destination. The destination picker endpoint returns that list when the user asks for it.

# 4. Proposed Design

The backend owns token normalization, route construction, destination validation, and default selection. The frontend owns display state, URL state, and search inside the lists that the backend returns.

The backend caches token metadata once per chain and routes once per chain pair. `unstable_cache` stores each entry for one hour, so every endpoint and every token change reuses one upstream result. A warm request for another token reads the cached entries.

## Tokens and routes share one model across providers

### A token has one identity

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

`Token.id` joins the chain ID and the lowercase token address. Native tokens use `0x0000000000000000000000000000000000000000`, so native tokens and ERC-20 tokens use the same model.

The backend lowercases addresses and applies curated metadata before it creates a `Token`.

### A route describes what a provider can transfer

```ts
type RouteOption =
  | {
      provider: 'canonical';
      sourceToken: Token;
      destinationToken: Token;
      batchDeposit?: BatchDeposit;
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

A `RouteOption` describes what a provider can transfer. It is not an executable route. `availableRoutes` holds at most one `RouteOption` for each provider that supports the selected source token. Canonical and LayerZero routes always name a destination token. A canonical route can also carry a `batchDeposit`, described in [Canonical deposits declare batch support](#canonical-deposits-declare-batch-support). A LiFi route names a destination token when a same-asset token exists on the destination chain. When no same-asset token exists, the LiFi route omits `destinationToken`, and the backend picks the destination native token as the default.

The LiFi route does not list every possible swap destination. The destination picker endpoint returns that list.

LiFi can offer several paths from one token to another, such as two different bridges or a bridge followed by a swap. The registry does not model these paths. After the user picks a destination, the bridge requests a live LiFi quote for that source and destination. `useRoutesUpdater` keeps the cheapest LiFi path as `lifi-cheapest` and the fastest as `lifi-fastest`. If one path is both the cheapest and the fastest, it becomes a single `lifi` route. The bridge then ranks these with the other runtime routes. Two LiFi paths from token A to token B therefore produce one LiFi `RouteOption` and up to two runtime routes.

## Multi-route assets are configuration, not code

Each token on each chain is its own `Token`, and each provider route names its own source and destination. The cases that need hardcoded branches today become entries in `packages/app/src/token-registry/constants.ts`.

- Ethereum PYUSD keeps its canonical route and gains a LiFi route to `ArbitrumOne.PYUSD`. One entry in `defaultDestinationOverrides` makes the LiFi destination the default.
- Ethereum USDC keeps its canonical route to USDC.e and has a LiFi route to native USDC. One entry in `defaultDestinationOverrides` makes native USDC the default, which is the token the bridge delivers today.
- Arbitrum One USDC and USDC.e are two `Token` values, each with its own symbol and name. Each one can carry its own route to Ethereum USDC, so the many-to-one case needs no special handling.
- Ethereum USDT reaches Arbitrum One USDT0 through an entry in `layerZeroConfig`. `curatedTokenMetadata` gives USDT0 its own symbol and name.
- Robinhood USDC withdraws to Ethereum USDC through Robinhood's canonical token list. `blockedSourceRoutes` blocks the reverse direction.

Callers no longer pick an address by direction. Balances, approvals, gas estimates, and transfer construction all read `sourceToken` and `destinationToken` from the selection response or from the chosen route.

## Canonical routes come from the network registry

The bridge already knows every canonical bridge, so the registry needs no extra configuration. `getCanonicalBridge` in `server/canonicalBridge.ts` combines two sources:

- `getArbitrumNetwork` gives the parent chain and its gateway router. It covers the SDK's networks and the Orbit chains in `orbitChainsData.json`.
- `BRIDGE_TOKEN_LISTS` gives the child chain's token lists.

```ts
type CanonicalBridge = {
  parentChainId: number;
  childChainId: number;
  parentGatewayRouter: Address;
  tokenListUrls: string[];
};
```

A pair has a canonical bridge when one chain is the other chain's parent. Canonical routes come from the child chain's list entries whose `bridgeInfo` names the parent chain. Imports call the parent gateway router.

The PoC builds Ethereum to Arbitrum One and Ethereum to Robinhood this way, in both directions. A new chain needs its `orbitChainsData.json` entry and its token list, which the bridge already requires.

A chain that a user adds in the browser lives in `localStorage`, so the server cannot see it. It only needs the native token and canonical imports, so the frontend builds its selection and calls the chain's RPC, as the bridge does today.

## Canonical deposits declare batch support

A batched deposit sends an ERC-20 token and an extra amount of the destination chain's native currency in one transaction. Today `useIsBatchTransferSupported` decides batch support on the client. Instead, the backend adds `batchDeposit` to the canonical route:

```ts
type BatchDeposit = {
  // The extra token that the user sends on the source chain
  sourceToken: Token;
  // The token that the user receives on the destination chain
  destinationToken: Token;
};
```

A canonical route gets `batchDeposit` when all of these hold:

1. The pair is a canonical deposit.
2. The source token is not the native token.
3. `batchDepositExcludedSourceTokens` does not list the source token. The list holds Ethereum USDC, which the current bridge never batches.

Imports follow the same rules. LayerZero and LiFi routes never carry the field.

The two tokens depend on the destination chain's gas token:

| Pair                     | Source-chain token       | Destination-chain token   |
| ------------------------ | ------------------------ | ------------------------- |
| Ethereum to Arbitrum One | ETH, `1:0x0000…0000`     | ETH, `42161:0x0000…0000`  |
| Ethereum to Robinhood    | ETH, `1:0x0000…0000`     | ETH, `4663:0x0000…0000`   |
| Arbitrum One to Xai      | XAI, `42161:0x4cb9…9d66` | XAI, `660279:0x0000…0000` |

On a custom gas token chain such as Xai, `batchDeposit.sourceToken` is an ERC-20 with its own balance and approval. The frontend reads it from the route, so it needs no list of those chains.

## The backend picks the default destination

If the request has no `destinationToken` query parameter, the backend picks the first match in this order:

1. A configured override for the source token.
2. A canonical destination.
3. A LayerZero destination.
4. A same-asset LiFi destination.
5. The destination native token, if LiFi supports the source token.

An override changes the default and leaves the other routes in place. For example, Ethereum PYUSD has both a canonical route and a LiFi route, and its default destination is LiFi PYUSD on Arbitrum One. Ethereum USDC defaults to native USDC, which LiFi delivers, and its canonical route still delivers USDC.e.

If the request has a `destinationToken`, the backend checks that the selected source can reach it. If the source cannot reach it, the backend returns the default destination and no error.

`availableRoutes` stays the same short provider list for a given source token. Runtime route construction uses the selected destination to decide which providers apply.

## The URL and token imports go through the selection endpoint

The page reads `sourceChain`, `destinationChain`, `sourceToken`, and `destinationToken` from the URL and calls the selection endpoint during the initial render. If the chain pair is unsupported, the page falls back to Ethereum and Arbitrum One. If the URL has no source token, the page uses native ETH.

If `sourceToken` has no canonical route in the registry, the selection endpoint tries a canonical import. This covers tokens that the registry does not contain, and tokens that only LiFi lists. LiFi lists about 7,400 Ethereum tokens that are missing from the Arbitrum token lists, and the 20 we sampled had never been bridged. Without the import, those tokens would only get a LiFi swap.

The pasted address can belong to either chain. The backend resolves the source token and adds a canonical route next to any LiFi routes. Canonical comes first in the default order, so the predicted child token becomes the default destination. Until the first deposit deploys it, that token uses the parent token's symbol, name, and decimals, as the bridge does today. The import skips source tokens in `blockedSourceRoutes`.

An import makes up to five RPC calls, so the backend caches each result for one hour. Imported tokens stay out of the cached registry. The frontend keeps them in a session overlay, so the source picker can show them, and picking one again reads the cached import.

Because the selection endpoint handles imports, the API needs no separate import endpoint.

## The API has three endpoints

### Get the selected tokens and routes

```text
GET /api/token-registry/selection/[sourceChainId]/[destinationChainId]
```

The endpoint accepts these query parameters:

| Name               | Required | Meaning                                             |
| ------------------ | -------- | --------------------------------------------------- |
| `sourceToken`      | No       | Source token address. Defaults to the zero address. |
| `destinationToken` | No       | Requested destination token address.                |

The endpoint returns this shape:

```ts
type SelectedTokenAvailability = {
  sourceToken: Token;
  destinationToken: Token;
  availableRoutes: RouteOption[];
};
```

If the source token has no canonical route in the registry, the endpoint tries a canonical import. If the destination is invalid, the endpoint returns the default destination. If the pair is unsupported or the source token is unavailable, the endpoint returns `404`.

The frontend calls this endpoint on initial load, on a source or destination selection, on a chain change, on a network flip, and on an import.

### Get the source picker tokens

```text
GET /api/token-registry/source-tokens/[sourceChainId]/[destinationChainId]
```

The endpoint takes no query parameters. It returns every source token that has at least one route and a valid default destination for the pair:

```ts
type PickerTokens = {
  pinnedTokens: Token[]; // in display order
  tokens: Token[]; // sorted by symbol
};
```

The frontend calls this endpoint when the source picker opens. The SWR key holds only the chain pair, so a new source selection does not reload the list.

### Get the destination picker tokens

```text
GET /api/token-registry/destination-tokens/[sourceChainId]/[destinationChainId]?sourceToken=0x...
```

`sourceToken` names the current source token and defaults to the zero address. The endpoint returns a `PickerTokens` with every fixed-route destination and every destination token that the LiFi connection accepts. For an imported token, the list also holds the imported canonical destination.

The frontend calls this endpoint when the destination picker opens. The SWR key holds the chain pair and the source token, so a new destination selection does not reload the list.

## Token metadata is cached per chain, and routes per pair

All three endpoints read from the same server path:

```text
token lists + LiFi tokens         token lists + LiFi connection + configured routes
          |                                         |
  one entry per chain                       one entry per pair
          |                                         |
          +------------------+----------------------+
                             |
                       unstable_cache
                             |
            +----------------+----------------+
            |                |                |
        selection     source tokens   destination tokens
```

The cached values have these shapes:

```ts
// token-registry-chain-[chainId]-v[version]
type CachedChainToken = Omit<Token, 'id' | 'chainId'> & {
  coinKey?: string;
};

// token-registry-pair-[sourceChainId]->[destinationChainId]-v[version]
type CachedPairRoutes = {
  providers: ProviderRoutes[];
  lifiDestinationAddresses: Address[];
};
```

A request reads the pair entry and both chain entries in parallel, then builds the token indexes in memory. Each entry revalidates after one hour, and each key includes `REGISTRY_CACHE_VERSION`. The route build reads LiFi `coinKey` values from the chain entries, so a cold build fetches LiFi token metadata once per chain.

The split keeps every entry under the data-cache limit. Next stores nothing for an entry over 2 MiB. Its size check counts the entry's JSON after a second escaping, so every quote counts twice. Measured that way, the single Ethereum to Arbitrum One registry was 2,217,540 bytes, so Next never cached it. Token metadata was 92% of that size.

After the split, the Ethereum token entry uses 64% of the limit, and every Ethereum pair shares it. Each route entry uses 26% or less. The [detailed measurements](#detailed-measurements) list every entry. The builder logs an error when an entry passes 1.5 MiB.

The split has two costs. A request reads three entries instead of one. The entries also expire separately, so a route can name a token that its chain entry does not have yet. The backend skips that route until both entries agree.

## The common path costs about 1 KB

The design sends 1.2 KB to 1.5 KB on initial load. At observed picker-open rates, the average visitor downloads about 290 KB of raw token-management data. The current bridge sends about 1,573 KB on every page load.

| User action                       | Additional request cost                                                  |
| --------------------------------- | ------------------------------------------------------------------------ |
| Open the bridge                   | One selection response. The measured examples were 1,194 to 1,528 bytes. |
| Open the source picker for a pair | 1,329,848 bytes on the first open. SWR serves later opens from cache.    |
| Open the USDC destination picker  | 325,857 bytes on the first open for that pair and source token.          |
| Change the source token           | One selection response. The source picker list stays cached.             |
| Change the destination token      | One selection response. The destination picker list stays cached.        |
| Change or flip networks           | One selection response for the new pair. Picker lists still load lazily. |

The 290 KB estimate counts one source picker response for 19.9% of visitors and one destination picker response for 7.3% of visitors. It also counts the small selection requests from token and network changes. It does not assume that the two picker audiences are separate groups. The [detailed measurements](#detailed-measurements) in the appendix list every response size and latency.

## The trade favors the common visit

The main gain is the model. Route rules and per-chain token metadata live in one place in the backend, and every caller receives the exact tokens on both sides of a transfer. URL selections and canonical imports resolve on the first request.

The loading strategy is a second trade. Each selection change now costs a request, and the initial response gets about a thousand times smaller. We think that is the right trade while picker-open rates stay low and the selection response stays small.

The design has three costs that reviewers should weigh:

- The first request for a cold pair waits for all upstream token and route data. In the measured run, that wait was about 4.8 seconds.
- The source picker response is large, at about 1.33 MB raw and 301 KB gzipped.
- A request reads three cache entries, and the entries can expire at different times.

The cold-pair wait is the cost we like least. A visitor who lands on a cold pair waits almost five seconds for the selection response.

# 5. Alternatives Considered

Both options below use the token and route model above. They differ only in what the page loads and when.

### Option 1: Curated source tokens with wallet balances

Before wallet connection, the bridge shows a curated source list. After connection, it ranks tokens by balance, and the user can still search for a token with a zero balance.

We rejected this option. It keeps the first response small, but it needs a balance index or many RPC calls. Wallet-specific responses cannot share one public cache, and every wallet address adds cache entries. Someone also has to maintain the curated list. Wallet balances also say nothing about destinations. The bridge still needs route data to know which destination tokens are valid.

### Option 2: Load every token on both chains and every route for the pair

When the page opens, the bridge loads every token on the source chain and every token on the destination chain. The lists include tokens that have no route for the selected pair. One more API call returns every possible route for the pair. The pickers then filter the token lists against those routes on the client.

We rejected this option. Token lists keyed by chain reuse well across pairs, but the page downloads about 1.57 MB before any picker opens. More than 80% of visitors never open the source picker, and more than 92% never open the destination picker. Most of the tokens in the lists also have no route for the selected pair. The option spends bandwidth on every visit to save a later request for a small group of users. This design gets the same reuse on the server, where it caches token metadata by chain, without the browser download.

# 6. Implementation Plan

The work has three milestones. The bridge does not consume the new API until the second milestone, and the third milestone deletes the old system.

## Build the pair registry and the API

1. Define shared schemas for `Token`, `RouteOption`, and each endpoint response. The route handlers and the bridge client both use them.
2. Fetch canonical, LayerZero, and LiFi data independently. Validate every upstream response with Zod before normalization.
3. Cache token metadata per chain and provider routes per pair with `unstable_cache`. Keep every entry below 1.5 MiB as Next measures it.
4. If one provider fails on a cold build, omit that provider and keep the data from the healthy providers.
5. If an upstream call fails during a rebuild, keep the last good entry.
6. Apply the transfer-disabled and withdraw-only lists after each cache read, so a list change applies without a rebuild.
7. Apply the OFT deposit block when the pair entry builds, because a token rarely becomes an OFT. Cache the trimmed LayerZero metadata in its own entry, which uses 16% of the limit. A listed token already has its canonical child address in the registry, so the metadata check needs no RPC call. For a token that the metadata does not mark as an OFT, call `oftVersion()` on the parent chain when the chain entry builds, in batched multicalls. The result belongs to the token, so every pair on that chain reuses it. If the metadata is unavailable on a cold build, fail the build instead of dropping the block. An import runs the same check when it resolves.
8. Find canonical bridges in the bridge's chain registry. A pair has a canonical bridge when one chain is the other's parent. The registry also gives the gateway router.
9. For a chain that pays gas in its own token, give that token the zero address on the child chain. Take its name, symbol, and logo from `orbitChainsData.json`, and read its decimals from the parent chain contract.
10. Keep imported tokens outside the cached registry. Resolve an import during selection for every source token without a canonical route, cache the result, and add its canonical route.
11. Implement the three endpoints.
12. Add the production pair and route configuration after representative pairs pass the API tests.

## Move the bridge to the API

### Replace selection state

Add a token-registry client and one selection resource. Its key is the source chain, the destination chain, the source token, and the destination token. Use this resource for the initial render and for every selection change. Parse the URL query parameters once, and pass the normalized values to the selection endpoint. If a response arrives for a key that no longer matches the URL state, ignore it.

Replace `useSelectedToken` and `useDestinationToken` with the `sourceToken` and `destinationToken` from the response. Keep successful imports in a session overlay. When a user selects an imported token again, call the selection endpoint so that the backend resolves its canonical route.

When the source token or the chain pair changes, clear the amount and the selected runtime route. The selection response replaces an invalid destination with the backend default.

### Replace both token pickers

Change `TokenSearch` to request the source endpoint when the source picker opens, and key its client cache by chain pair. Change `DestinationTokenSearch` to request the destination endpoint when the destination picker opens, and key its client cache by chain pair and source token.

Both pickers keep their current behavior:

- search by symbol, name, or address
- list virtualization
- selected imported tokens in the source list
- every reachable token in the destination list
- the existing analytics for picker open, search, and selection
- chain-specific explorer links

Remove the token-list management panel, the provenance labels, and the list toggles.

Both pickers show tokens in this order:

1. `pinnedTokens`, in the order the server returns them
2. tokens with a balance, highest balance first
3. the other tokens, in the server's symbol order

The server decides the pins and keeps today's rules. Both pickers pin the native currency, ETH, and USDG on the pairs where `isUsdgSurfacedLikeEth` returns true. The destination picker also pins native USDC, USDT, and WBTC. The client only sorts `tokens` by balance, so a balance cannot move a pinned token.

### Feed `availableRoutes` into runtime route construction

Replace client-side provider discovery with `availableRoutes`. A `RouteOption` is not an executable route.

For canonical and LayerZero, compare the `destinationToken` of each route with the selected destination. For LiFi, request a live quote for the selected destination. Do not create a canonical or LayerZero runtime route for a destination that only LiFi reaches.

`useRoutesUpdater` and the existing runtime layer keep these checks:

- amount rules
- feature flags and testnet restrictions
- LiFi slippage, disabled bridges, and disabled exchanges
- live LiFi quotes and liquidity
- fastest and cheapest route selection
- the route that the user selected

Before the bridge evaluates a new selection key, clear the old runtime route, even when the provider name stays the same.

### Read batch support from the canonical route

Replace `useIsBatchTransferSupported` with a read of `batchDeposit` on the canonical route:

- Show the second amount field only when the canonical route has `batchDeposit`.
- Read the balance and the approval for the extra amount from `batchDeposit.sourceToken`. On a custom-gas-token chain, add the extra amount to the fee-token approval, as the bridge does today.
- Show the received extra amount in `batchDeposit.destinationToken`.
- Keep the `batch-transfers` disabled-feature flag in the runtime layer.

### Replace paired-address consumers

Replace every direction-based read of `address` or `l2Address` with the explicit `sourceToken` and `destinationToken` from the selection or from the chosen route. Migrate the callers in this order:

1. Balance display, maximum amount, and transfer readiness.
2. Gas estimates and gas summaries.
3. Approval checks, approval targets, and spender display.
4. Canonical and LayerZero transfer construction.
5. LiFi quote inputs and transfer context.
6. Token warnings and first-deployment confirmation.
7. Explorer links, analytics, and pending transaction records.

Keep the zero address in bridge logic. Translate it only in a provider adapter whose SDK uses another value for the native token.

### Replace other token-list responsibilities

Token lists also own price updates and imported-token markers today. Replace each responsibility directly instead of adding fields to `Token`.

- Add a price resource keyed by `Token.id`. Give prices their own refresh policy, separate from the one-hour registry cache.
- Derive imported status from the session overlay. Combine that status with the existing deployment check for first-deployment confirmation.
- Derive provider availability from `availableRoutes`.
- Keep warning-token checks in the transfer layer.
- Keep the picker pins in the server configuration.

For a configured Orbit chain, build the native `Token` from `orbitChainsData.json`. For a custom chain that a user adds in the browser, build the native `Token` from its registered chain configuration in the browser.

## Delete the old token management

Before the token state goes, move the unrelated outbox and transaction methods out of `useArbTokenBridge`. After the last caller moves, delete these parts:

- `ERC20BridgeToken`, `ContractStorage`, `l2Address`, `isL2Native`, and `listIds`
- `bridgeTokens` and its methods to add tokens, update tokens, add lists, and remove lists
- `useSelectedToken`, `useDestinationToken`, and the legacy balance syncers
- `TokenListSyncer`, `useTokenLists`, `TokenListUtils`, `TokenSearchUtils`, and `mergeBridgeTokens`
- the old LiFi token-list endpoint and registry
- the token-list settings, storage, and management UI
- the client-side provider discovery helpers that `availableRoutes` replaces
- `useIsBatchTransferSupported`, which `batchDeposit` replaces

Keep the bridge execution, outbox, warning, account, and transaction-history code that still has production callers.

# 7. Testing Plan

API tests cover these cases:

- default selection without a destination query
- explicit destination selection and the fallback for an invalid destination
- URL selection and automatic canonical import
- a canonical import for a token that only LiFi lists, next to its LiFi route
- no import for a source token that `blockedSourceRoutes` lists
- import by the source-chain address and by the destination-chain address
- canonical routes for Ethereum to Robinhood from its token list
- selection of an imported token again after the user picks another token
- one-way canonical and LayerZero routes
- LiFi source tokens without a same-asset destination
- one-to-many and many-to-one token mappings
- `batchDeposit` on canonical deposits, with the extra token on both chains
- no `batchDeposit` for native, excluded, or withdrawal source tokens
- tokens that exist on one chain only
- independent provider failures and malformed upstream payloads
- a failed rebuild that keeps the last good entry
- transfer-disabled, withdraw-only, and OFT deposit blocks on canonical routes
- native-token metadata and zero-address identity
- every chain entry and pair entry below 1.5 MiB, measured the way Next measures it
- one cached entry per chain, shared by every pair that touches the chain
- warm requests for different tokens that reuse the same cached entries

Bridge acceptance tests run before and after the bridge moves to the API. They use fixed token and provider fixtures, so live token-list contents cannot change the results. Each behavior below needs this proof:

| Behavior             | Required proof                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Initial render       | The bridge requests only selection data and renders the default tokens and routes.                              |
| Explicit destination | The backend accepts a reachable destination and falls back when the destination is invalid.                     |
| Source picker        | The picker loads on open, searches the complete list, and keeps the selected import visible.                    |
| Destination picker   | The picker shows fixed-route destinations and every reachable LiFi token.                                       |
| Connected ranking    | Pinned tokens stay first, then tokens with a balance, then the other tokens.                                    |
| Disconnected ranking | The picker shows the pinned tokens, then the server order, without wallet-specific requests.                    |
| Provider failure     | Healthy providers and their routes stay available.                                                              |
| Rapid changes        | Late selection, import, and balance responses cannot replace the current selection key.                         |
| Native tokens        | Zero-address tokens use the correct metadata, decimals, balance, approval, and execution path.                  |
| Both directions      | Balances, gas, approvals, quotes, and execution receive the exact source-chain and destination-chain addresses. |
| Batch deposits       | The second amount field appears only with `batchDeposit`, and the extra amount reaches the destination address. |
| Route blocks         | Transfer-disabled tokens get no canonical route. Withdraw-only and OFT-blocked tokens get no canonical deposit. |
| Runtime policy       | Settings, live quotes, and warnings stay unchanged.                                                             |
| Records              | Analytics payloads and pending transaction records keep their current meaning.                                  |
| Cache                | Every chain entry and pair entry stays below 1.5 MiB through the real `unstable_cache` path.                    |
| Deletion             | Repository searches find no production callers of the legacy token types, hooks, stores, or endpoints.          |

The migration is complete when every token-selection path uses the new API and the old token-management system no longer exists.

# 8. Rollout & Migration

The bridge moves to the new API in one step. The migration adds no compatibility types, no feature flag, and no second production path.

Existing analytics event names and stored transaction shapes stay the same. Some existing fields require a canonical parent address. At each of those write boundaries, the bridge maps the chain-specific token to its canonical parent address. Token-list settings that users stored locally go away with the management UI.

To invalidate every cache entry at once, bump `REGISTRY_CACHE_VERSION`. No manual cache purge is needed.

To roll back, revert the migration.

# 9. Open Questions

**Can we drop the `oftVersion()` fallback?**
On master, `isBlockedOftDeposit` calls `oftVersion()` on the parent token when the LayerZero metadata does not mark it as an OFT. The registry has to make that call for thousands of Ethereum tokens on each chain entry build. The fallback only matters for an OFT that LayerZero has not marked yet, and we do not know how often that happens.

Before the migration, add an analytics event to master's `isOftTokenOnChain` through `trackEvent`. Send the token address, the chain pair, and whether `oftVersion()` found an OFT. If only a few tokens come back as OFTs, drop the fallback and list those tokens in the registry configuration. The OFT check then reads the LayerZero metadata and that list, and the chain entry build makes no RPC calls for it.

# 10. FAQ

**Does a new source selection reload the source picker list?**
No. The source picker SWR key holds only the chain pair. The destination picker key holds the chain pair and the source token, so a new destination selection does not reload that list either.

**Why is there no import endpoint?**
The selection endpoint already handles imports. If `sourceToken` has no canonical route in the registry, the endpoint tries a canonical import with the source-chain address or the destination-chain address.

**Why is `batchDeposit` on the route and not on the selection?**
One source token can have a canonical route and a LiFi route, and only the canonical route can carry the extra amount. A flag on the selection would say "batch supported" while the user has the LiFi route selected.

**Does a configured destination override hide other routes?**
No. An override changes the default destination only. Ethereum PYUSD has both a canonical route and a LiFi route, and its default is LiFi PYUSD on Arbitrum One. Ethereum USDC defaults to native USDC through LiFi, and its canonical route still delivers USDC.e.

# 11. Appendix

## Glossary

- **Pair registry.** Every token and every provider route for one source chain and one destination chain, such as Ethereum to Arbitrum One. The backend assembles it on each request from three cached entries: the token entry for each chain and the route entry for the pair. All three endpoints read from it. The direction matters. Arbitrum One to Ethereum has its own route entry, because a route can work in one direction only.
- **Route.** A way to move a source token on one chain to a destination token on another chain. The registry stores routes as `RouteOption` values, one for each provider that supports the source token. A `RouteOption` says what a provider can transfer. It is not executable. The bridge turns it into runtime routes with live data, such as a LiFi quote, and the user picks one runtime route to execute.

## Detailed measurements

The measurements ran on August 24, 2026 against live Ethereum and Arbitrum One data.

| Response                              | Raw bytes | Gzip bytes |
| ------------------------------------- | --------: | ---------: |
| Native ETH selection                  |     1,194 |        194 |
| Ethereum USDC selection               |     1,528 |        406 |
| Source picker, 5,623 tokens           | 1,329,848 |    301,111 |
| USDC destination picker, 1,244 tokens |   325,857 |     75,586 |

The cache entries were measured on October 23, 2026, the way Next checks its 2 MiB limit.

| Cache entry                     | Size as Next measures it | Share of 2 MiB | Tokens now | Tokens at 100% |
| ------------------------------- | -----------------------: | -------------: | ---------: | -------------: |
| Ethereum tokens                 |                1,332,088 |          63.5% |      6,877 |        ~10,800 |
| Arbitrum One tokens             |                  380,033 |          18.1% |      1,713 |         ~9,500 |
| Robinhood tokens                |                   92,222 |           4.4% |        460 |        ~10,500 |
| Ethereum to Arbitrum One routes |                  535,464 |          25.5% |      8,553 |        ~33,500 |
| Arbitrum One to Ethereum routes |                  510,498 |          24.3% |      8,553 |        ~35,100 |
| Ethereum to Robinhood routes    |                  383,587 |          18.3% |      7,217 |        ~39,500 |
| Robinhood to Ethereum routes    |                  351,283 |          16.8% |      7,300 |        ~43,600 |

A route entry counts its source tokens and the destination tokens that LiFi accepts. The 100% column assumes the same average size per token.

`Cached registry lookup` is the time spent waiting for the cached pair registry. A cold lookup includes the registry build. A warm lookup reads the cached value. `Handler total` runs from route-handler entry to the point before response serialization.

| Request state                         | Cached registry lookup | Handler total |
| ------------------------------------- | ---------------------: | ------------: |
| Cold selected-token request           |             4,757.1 ms |    4,762.8 ms |
| Warm selected-token request           |                 3.6 ms |        6.2 ms |
| Warm request for another source token |                 3.5 ms |        7.8 ms |

Warm destination-token requests for two more source tokens finished in 12.2 ms and 13.4 ms. A warm source-token response finished in 32.7 ms.
