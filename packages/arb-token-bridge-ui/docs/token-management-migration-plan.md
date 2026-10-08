# Token management migration plan

## Purpose

The [token management RFC](./rfc-token-management-poc.md) defines the API, token model, route model, caching, imports, and picker-loading behavior. This plan does not redefine those decisions. It maps the production bridge to the RFC and defines when the old system can be deleted.

The migration uses two PRs. PR 1 implements the API from the RFC. PR 2 moves the bridge to that API and deletes the old token-management system.

## PR 1: Implement the RFC API

Build the three endpoints defined by the RFC:

```text
GET /api/token-registry/selection/[sourceChainId]/[destinationChainId]
GET /api/token-registry/source-tokens/[sourceChainId]/[destinationChainId]
GET /api/token-registry/destination-tokens/[sourceChainId]/[destinationChainId]
```

Reuse PoC code only when it matches the RFC. The API response and cache format come from the RFC, not from the current PoC implementation.

### Build the registry

1. Define the shared `Token`, `RouteOption`, and endpoint response schemas. Use the schemas in both the route handlers and the bridge client.
2. Build canonical, LayerZero, and LiFi data independently. Validate every upstream response with Zod before normalization.
3. Assemble one pair registry and cache it with `unstable_cache`. A provider failure omits only that provider's data.
4. Read native-token metadata from `orbitChainsData.json`. Add validated decimals because the file does not contain them today.
5. Keep imported tokens outside the cached registry. Resolve them during selection and return only their canonical route.
6. Add the production pair and route configuration after representative pairs prove the model.

### Implement endpoint behavior

The selection endpoint returns the source token, the selected destination token, and the compact route list. Without an explicit destination, it returns the default route suggestions. With an explicit destination, it returns only routes that reach that token.

The source endpoint returns the complete transferable source list for the pair. The destination endpoint returns every destination that the selected source token can reach, including every LiFi destination.

### Prove the API

PR 1 is complete when tests prove these cases:

- default selection without a destination query
- exact route filtering after destination selection
- URL selection and automatic canonical import
- canonical-only behavior for imported tokens
- one-way canonical and LayerZero routes
- LiFi tokens without a same-asset destination
- independent provider failures
- malformed upstream payloads
- native-token metadata and zero-address identity
- one cached value below 2 MiB for every production pair
- warm requests for different tokens reusing the same cached pair registry

The production bridge does not consume the API in this PR.

## PR 2: Migrate callers and delete the old system

PR 2 moves each caller directly to the RFC model. It does not add a compatibility token type, a feature flag, or a second production path.

### 1. Replace selection state

Add a token-registry client and one selection resource keyed by this tuple:

```text
source chain + destination chain + source token + destination token
```

Use that resource for the initial bridge render. Parse the RFC query parameters once, then pass the normalized values to the selection endpoint. Ignore any response whose tuple no longer matches the current URL state.

Replace `useSelectedToken` and `useDestinationToken` with the returned `sourceToken` and `destinationToken`. Keep imported tokens in a session overlay so that a URL import or picker import remains visible when the source picker opens.

Clear the amount, the selected runtime route, and an invalid destination when the source token or chain pair changes.

### 2. Replace both token pickers

Change `TokenSearch` to request the source endpoint only when the source picker opens. Change `DestinationTokenSearch` to request the destination endpoint only when the destination picker opens.

Keep these picker behaviors:

- search by symbol, name, or address
- list virtualization
- the selected imported token in the source list
- every reachable token in the destination list
- existing picker-open, search, and selection analytics
- chain-specific explorer links

Remove the token-list management panel and provenance labels with the list toggles.

For a disconnected user, render the curated order from the registry. For a connected user, load balances after the picker data arrives and rank tokens by balance.

Load the selected token balance separately from picker ranking. Split picker balance reads into bounded multicalls, keep successful chunks when one fails, and use curated order as the tie-breaker. Repeat the reads when the account or relevant chain changes. Ignore results for an old account or chain.

### 3. Feed static availability into runtime routes

Use `availableRoutes` to replace client-side discovery for canonical, LayerZero, and LiFi availability. Do not turn `availableRoutes` into executable routes.

Keep these checks in `useRoutesUpdater` and the existing runtime layer:

- amount and batch-transfer rules
- feature flags and testnet restrictions
- LiFi slippage, disabled bridges, and disabled exchanges
- live LiFi quotes and liquidity
- fastest and cheapest route selection
- user-selected route state
- transfer-disabled, withdraw-only, and live gateway checks

When the selected destination is a LiFi-only token, do not create canonical or LayerZero runtime routes. Clear the old runtime route before evaluating a new selection tuple, even when the provider name stays the same.

### 4. Replace paired-address consumers

The current `ERC20BridgeToken` stores a parent address in `address` and a child address in `l2Address`. Replace every direction-based address choice with the explicit `sourceToken` and `destinationToken` from the selection or chosen route.

Migrate these groups:

1. Balance display, max amount, and transfer readiness.
2. Gas estimates and gas summaries.
3. Approval checks, approval targets, and spender display.
4. Canonical and LayerZero transfer construction.
5. LiFi quote inputs and transfer context.
6. Token warnings and first-deployment confirmation.
7. Explorer links, analytics, and pending transaction records.

Provider adapters translate the zero address only at SDK boundaries that use another native-token representation. Business logic continues to treat the native token as a normal `Token`.

Preserve the existing analytics event names and stored transaction shapes in this migration. At their write boundaries, map the chain-specific token back to any canonical parent address that an existing field requires.

### 5. Separate data that token lists own today

Removing token lists also removes price updates and imported-token markers. Replace those jobs directly instead of adding them to `Token`.

- Add a price resource keyed by `Token.id`. Keep its refresh policy separate from the one-hour registry cache.
- Derive imported status from the session overlay. Use that state with the existing deployment check for the first-deployment confirmation.
- Derive provider availability from `availableRoutes`.
- Keep warning-token checks in the transfer layer.
- Keep stable picker ordering in registry metadata.

For configured Orbit chains, construct the native `Token` from `orbitChainsData.json`. For a browser-added custom chain, construct its native token from the registered chain configuration and keep that pair out of the public cache.

### 6. Delete legacy token management

Move the unrelated outbox and transaction methods out of `useArbTokenBridge` before deleting its token state.

Delete these groups after their last caller moves:

- `ERC20BridgeToken`, `ContractStorage`, `l2Address`, `isL2Native`, and `listIds`
- `bridgeTokens` and the token add, update, list-add, and list-remove methods
- `useSelectedToken`, `useDestinationToken`, and the legacy balance syncers
- `TokenListSyncer`, `useTokenLists`, `TokenListUtils`, `TokenSearchUtils`, and `mergeBridgeTokens`
- the old LiFi token-list endpoint and registry
- token-list settings, storage, and management UI
- client-side canonical, LayerZero, and LiFi discovery helpers replaced by `availableRoutes`

Do not delete bridge execution, outbox, warning, account, or transaction-history code merely because it shares a module with token state.

## Verification matrix

Run the same acceptance cases before and after PR 2. Use deterministic token and provider fixtures so the result does not depend on live token-list contents.

| Behavior | Required proof |
| --- | --- |
| Initial render | The bridge requests only selection data and renders the default tokens and routes. |
| Explicit destination | An arbitrary LiFi destination removes canonical and LayerZero routes. |
| Source picker | The picker loads lazily, searches the complete list, and keeps the selected import visible. |
| Destination picker | The picker shows fixed-route destinations and every reachable LiFi token. |
| Connected ranking | Chunked multicalls rank balances and retain partial results after one chunk fails. |
| Disconnected ranking | The picker uses the curated order without wallet-specific requests. |
| Provider failure | Healthy providers and their routes remain available. |
| Rapid changes | Late selection, import, and balance responses cannot replace the current tuple. |
| Native tokens | Zero-address tokens use the correct metadata, decimals, balance, approval, and execution path. |
| Both directions | Balances, gas, approvals, quotes, and execution receive the exact source-chain and destination-chain addresses. |
| Runtime policy | Batch rules, settings, live quotes, warnings, disabled transfers, and withdraw-only behavior remain unchanged. |
| Records | Analytics payloads and pending transaction records keep their current meaning. |
| Cache | Every production pair stays below 2 MiB through the real `unstable_cache` path. |
| Deletion | Repository searches find no production callers of the legacy token types, hooks, stores, or endpoints. |

The migration is complete when the bridge uses the RFC API for every token-selection path and the legacy token-management system no longer exists.
