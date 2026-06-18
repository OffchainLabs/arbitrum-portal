# Token management migration plan

## Purpose

The [token management RFC](./rfc-token-management-poc.md) defines the API, token model, route model, cache, import flow, and picker-loading behavior. This plan maps the production bridge to that design.

Deliver the migration in two pull requests:

1. Implement and test the RFC API.
2. Move the bridge to the API and delete the old token-management system.

Do not add compatibility types, a feature flag, or a second production path.

## PR 1: Implement the RFC API

Create these endpoints:

```text
GET /api/token-registry/selection/[sourceChainId]/[destinationChainId]
GET /api/token-registry/source-tokens/[sourceChainId]/[destinationChainId]
GET /api/token-registry/destination-tokens/[sourceChainId]/[destinationChainId]
```

Reuse PoC code when it matches the RFC. Treat the RFC as the contract for endpoint responses and the cached registry.

### Build the pair registry

1. Define shared schemas for `Token`, `RouteOption`, and each endpoint response. Use the schemas in the route handlers and the bridge client.
2. Fetch canonical, LayerZero, and LiFi data independently. Validate every upstream response with Zod before normalization.
3. Combine provider data into one pair registry and cache it with `unstable_cache`.
4. If one provider fails, omit that provider and keep data from healthy providers.
5. Read native-token metadata from `orbitChainsData.json`. Add and validate decimals because the file does not contain them.
6. Keep imported tokens outside the cached registry. Resolve an import during selection and return its canonical route.
7. Add all production pair and route configuration after representative pairs pass the API tests.

### Implement the endpoints

The selection endpoint returns the source token, the selected destination token, and the compact route set for the source token. Without `destinationToken`, it chooses the default destination. With `destinationToken`, it validates that destination and silently returns the default when the requested token is unreachable.

The source endpoint returns every transferable source token for the pair. The destination endpoint returns every token that the selected source can reach, including LiFi swap destinations.

### Test the API

PR 1 is complete when tests cover:

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
- independent provider failures
- malformed upstream payloads
- native-token metadata and zero-address identity
- one cached value below 2 MiB for every production pair
- warm requests for different tokens that reuse the same cached pair registry

The production bridge does not consume the API in PR 1.

## PR 2: Migrate the bridge and delete the old system

### Replace selection state

Add a token-registry client and one selection resource keyed by:

```text
source chain + destination chain + source token + destination token
```

Use this resource for the initial bridge render and every selection change. Parse the URL query parameters once, then pass normalized values to the selection endpoint. Ignore a response when its key no longer matches the current URL state.

Replace `useSelectedToken` and `useDestinationToken` with `sourceToken` and `destinationToken` from the response.

Keep successful imports in a session overlay. When a user selects an imported token again, call the selection endpoint so that the backend resolves its canonical route.

When the source token or chain pair changes, clear the amount and the selected runtime route. Let the selection response replace an invalid destination with the backend default.

### Replace both token pickers

Change `TokenSearch` to request the source endpoint when the source picker opens. Key its client cache by chain pair.

Change `DestinationTokenSearch` to request the destination endpoint when the destination picker opens. Key its client cache by chain pair and source token.

Preserve these picker behaviors:

- search by symbol, name, or address
- list virtualization
- selected imported tokens in the source list
- every reachable token in the destination list
- existing picker-open, search, and selection analytics
- chain-specific explorer links

Remove the token-list management panel, provenance labels, and list toggles.

For a disconnected user, show the registry's curated order. For a connected user, load balances after picker data arrives and rank tokens by balance.

Load the selected token balance separately from picker ranking. Split picker balance reads into bounded multicalls. If one chunk fails, keep successful chunks and use curated order as the tie-breaker. Repeat balance reads when the account or relevant chain changes. Ignore results for an old account or chain.

### Feed availability into runtime route construction

Use `availableRoutes` instead of client-side provider discovery. Do not treat `availableRoutes` as executable routes.

For canonical and LayerZero, compare each route's `destinationToken` with the selected destination. For LiFi, request a live quote for the selected destination. Do not create a canonical or LayerZero runtime route for a LiFi-only destination.

Keep these checks in `useRoutesUpdater` and the existing runtime layer:

- amount and batch-transfer rules
- feature flags and testnet restrictions
- LiFi slippage, disabled bridges, and disabled exchanges
- live LiFi quotes and liquidity
- fastest and cheapest route selection
- user-selected route state
- transfer-disabled, withdraw-only, and live gateway checks

Clear the old runtime route before evaluating a new selection key, even when the provider name remains the same.

### Replace paired-address consumers

`ERC20BridgeToken` stores the parent address in `address` and the child address in `l2Address`. Replace direction-based address selection with the explicit `sourceToken` and `destinationToken` from the selection or chosen route.

Migrate these callers:

1. Balance display, maximum amount, and transfer readiness.
2. Gas estimates and gas summaries.
3. Approval checks, approval targets, and spender display.
4. Canonical and LayerZero transfer construction.
5. LiFi quote inputs and transfer context.
6. Token warnings and first-deployment confirmation.
7. Explorer links, analytics, and pending transaction records.

Translate the zero address only in provider adapters whose SDK uses another native-token value. Keep the zero address in bridge business logic.

Preserve existing analytics event names and stored transaction shapes. At each write boundary, map the chain-specific token to a canonical parent address when an existing field requires one.

### Replace other token-list responsibilities

Token lists currently own price updates and imported-token markers. Replace those responsibilities directly instead of adding them to `Token`.

- Add a price resource keyed by `Token.id`. Give prices a refresh policy separate from the one-hour registry cache.
- Derive imported status from the session overlay. Combine that status with the existing deployment check for first-deployment confirmation.
- Derive provider availability from `availableRoutes`.
- Keep warning-token checks in the transfer layer.
- Keep stable picker ordering in registry metadata.

For configured Orbit chains, construct the native `Token` from `orbitChainsData.json`. For a custom chain added in the browser, use its registered chain configuration and keep that pair outside the public cache.

### Delete legacy token management

Move unrelated outbox and transaction methods out of `useArbTokenBridge` before deleting its token state.

After the last caller moves, delete:

- `ERC20BridgeToken`, `ContractStorage`, `l2Address`, `isL2Native`, and `listIds`
- `bridgeTokens` and its token add, update, list-add, and list-remove methods
- `useSelectedToken`, `useDestinationToken`, and the legacy balance syncers
- `TokenListSyncer`, `useTokenLists`, `TokenListUtils`, `TokenSearchUtils`, and `mergeBridgeTokens`
- the old LiFi token-list endpoint and registry
- token-list settings, storage, and management UI
- client-side provider discovery helpers replaced by `availableRoutes`

Keep bridge execution, outbox, warning, account, and transaction-history code when it still has production callers.

## Verification matrix

Run the same acceptance cases before and after PR 2. Use deterministic token and provider fixtures so tests do not depend on live token-list contents.

| Behavior             | Required proof                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Initial render       | The bridge requests only selection data and renders the default tokens and routes.                              |
| Explicit destination | The backend accepts a reachable destination and falls back when the destination is invalid.                     |
| Source picker        | The picker loads on open, searches the complete list, and keeps the selected import visible.                    |
| Destination picker   | The picker shows fixed-route destinations and every reachable LiFi token.                                       |
| Connected ranking    | Chunked multicalls rank balances and retain partial results after one chunk fails.                              |
| Disconnected ranking | The picker uses curated order without wallet-specific requests.                                                 |
| Provider failure     | Healthy providers and their routes remain available.                                                            |
| Rapid changes        | Late selection, import, and balance responses cannot replace the current selection key.                         |
| Native tokens        | Zero-address tokens use the correct metadata, decimals, balance, approval, and execution path.                  |
| Both directions      | Balances, gas, approvals, quotes, and execution receive the exact source-chain and destination-chain addresses. |
| Runtime policy       | Batch rules, settings, live quotes, warnings, disabled transfers, and withdraw-only behavior remain unchanged.  |
| Records              | Analytics payloads and pending transaction records keep their current meaning.                                  |
| Cache                | Every production pair stays below 2 MiB through the real `unstable_cache` path.                                 |
| Deletion             | Repository searches find no production callers of the legacy token types, hooks, stores, or endpoints.          |

The migration is complete when every token-selection path uses the RFC API and the legacy token-management system no longer exists.
