# Token Registry & Routes — Design

## Requirements

- one source token to multiple destination tokens
- multiple routes for the same source token
- per-chain normalization of token metadata, baked directly into the token (no override layer)
- native tokens, represented with the zero address (`0x0000...0000`)
- answer "which tokens on the source chain can be transferred to the destination chain?"
- LiFi swap: source and destination tokens can be unrelated assets; some tokens
  are only transferable via swap (e.g. APE on ApeChain → USDC/ETH on Superposition)
- list which destination tokens a `(token, sourceChain, destinationChain)` can be swapped to
- LiFi fastest / cheapest information, with per-route data (gas estimates, fees, ...)
- user-imported tokens, session-only, going through the same architecture
- CCTP and LayerZero hardcoded; canonical and LiFi generated programmatically
- scale to 5-digit token counts per chain pair
- no rebuild to refresh data — served through Next.js API routes with caching

## Architecture overview

Two strictly separated layers:

1. **Tokens** — normalized per-chain metadata. One record per `(chainId, address)`.
2. **Routes** — transferability facts, stored compactly per ordered chain pair,
   materialized into rich route objects on demand for the selected token only.

On top of those, a **quote layer** handles amount-specific runtime data
(received amount, gas, fees, fastest/cheapest variants).

The UI only ever sees normalized `Token`s, materialized `RouteOption`s, and
`RouteQuote`s.

## Token model

```ts
type Address = `0x${string}`; // always lowercase
type TokenId = `${number}:${Address}`; // `${chainId}:${address}`

const NATIVE = '0x0000000000000000000000000000000000000000';

type Token = {
  id: TokenId;
  chainId: number;
  address: Address; // NATIVE for the chain's native token
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};
```

- Native tokens are ordinary `Token`s with the zero address. No sentinel, no
  special type. `isNative` is derived (`address === NATIVE`). This matches the
  LiFi API directly and handles chains whose native token is not ETH (APE on
  ApeChain).
- Normalization (USDT0 naming, APE logo, ETH logo, ...) is applied while
  generating the token record. The emitted `Token` is final — no override
  object exists anywhere at runtime.
- Provider-internal concepts (LiFi's `coinKey`, ...) never appear on `Token`.
  They are consumed server-side during generation only.

### Token registry

Global registry, sharded per chain:

```
GET /api/tokens/[chainId]  →  TokenPayload[]   // Omit<Token, 'id' | 'chainId'>
```

Token metadata exists once per chain, shared by every chain pair touching that
chain — not duplicated per pair. The wire format strips `id` and `chainId`
(both derivable from the endpoint, ~30% of the payload); the client re-derives
them during hydration.

## Route storage (compact, per ordered chain pair)

Routes are stored per **ordered** pair. Pairs are only generated for supported
directions (some pairs are deposit-only or withdrawal-only). An unsupported
direction is a 404, not an empty artifact.

A provider that does not serve a pair is **absent** — never an empty
placeholder.

```ts
type ProviderRoutes =
  | { provider: 'canonical'; routes: Record<Address, Address> } // source → destination address
  | { provider: 'cctp'; routes: Record<Address, Address> } // source → destination address
  | {
      provider: 'layerzero';
      routes: Record<
        Address,
        {
          destination: Address;
          oftAdapter: Address;
          endpointId: number;
        }
      >;
    }
  | {
      provider: 'lifi';
      // source → same-asset counterpart (resolved at generation via LiFi's
      // coinKey, server-side); null → swap-only
      routes: Record<Address, Address | null>;
    };

type RouteMapArtifact = {
  sourceChainId: number;
  destinationChainId: number;
  providers: ProviderRoutes[]; // only providers that serve this pair
};
```

```
GET /api/routes/[sourceChainId]/[destinationChainId]            →  RouteMapArtifact
GET /api/swap-destinations/[sourceChainId]/[destinationChainId] →  Address[]
```

The pair's **swap destination set** (LiFi `toTokens`) is not in the artifact:
most sessions are regular bridges or same-asset LiFi transfers and never need
it, and it is the single largest block of pair data (it more than halved the
withdrawal artifact when split out). It is its own lazily-fetched resource,
requested only when the user opens the destination picker on a swap-capable
token. Whether a token _can_ swap stays answerable from the artifact alone
(`address in lifi.routes`).

Why this shape scales to 10k+ tokens:

- the provider tag is stored once per section, not once per route
- chain ids are implied by the artifact, so entries are bare addresses
- every section is just addresses keyed by source address; the bulky swap
  destination set ships separately, on demand
- nothing derivable client-side is persisted

Escape hatches if size still hurts (not needed initially):

- reference tokens by integer index into a per-chain token array instead of
  address strings
- compute standard-gateway canonical child addresses offline (CREATE2
  derivation) and store only a source-address list plus a small
  custom-gateway exceptions map

### Integrity rule

Every address emitted into a route artifact must resolve in the corresponding
chain's token registry. When the canonical generator derives USDC.e's address
on Arbitrum One, it also emits USDC.e's `Token` record into the Arbitrum One
registry. A route must never point at a token the registry cannot resolve.

## Materialized routes (runtime API)

`RouteOption[]` is never stored or shipped in bulk. When the user selects a
source token, selectors check it against each provider section and build the
2–3 route objects for that token only.

```ts
type RouteOption =
  | { provider: 'canonical'; sourceTokenId: TokenId; destinationTokenId: TokenId }
  | { provider: 'cctp'; sourceTokenId: TokenId; destinationTokenId: TokenId }
  | {
      provider: 'layerzero';
      sourceTokenId: TokenId;
      destinationTokenId: TokenId;
      oftAdapter: Address;
      destinationEndpointId: number;
    }
  | {
      provider: 'lifi';
      sourceTokenId: TokenId;
      // from lifi.routes; undefined → swap-only
      destinationTokenId?: TokenId;
    };
```

### LiFi same-asset counterpart

The counterpart mapping is resolved **at generation time, server-side**, using
LiFi's `coinKey` from its tokens API: a source token whose coinKey has a match
on the destination chain gets that match as its stored value in `lifi.routes`;
otherwise the value is `null`. The client never sees coinKey — it just reads
the stored counterpart (or `null` → the user must pick from the swap set).

LiFi assigns no coinKey to some tokens (PYUSD, ENA, ...), so a small curated
coinKey table fills the gaps before matching — same approach as
`CUSTOM_TOKENS` in the old LiFi tokens API
(`app/api/crosschain-transfers/lifi/tokens/registry.ts`).

### Swap is derived, not stored

"Can this token be swapped?" is not a flag on the token or the route:

```ts
const canSwap = (sourceToken) => sourceToken.address in lifi.routes;
// possible outputs = the pair's lazily-fetched swap destination set
```

## Quotes (runtime, amount-specific)

The registry answers "can it move"; quotes answer "how well" once an amount is
known. `lifi-fastest` / `lifi-cheapest` are quote results, not registry routes.

```ts
type QuoteRequest = {
  sourceTokenId: TokenId;
  destinationTokenId: TokenId;
  amount: bigint;
  slippage?: number;
};

type QuoteCommon = {
  amountReceived: bigint;
  gasEstimate: { amount: bigint; token: TokenId; amountUSD?: number };
  fees?: { amount: bigint; token: TokenId; amountUSD?: number }[];
  durationMs?: number;
};

type RouteQuote = QuoteCommon &
  (
    | { provider: 'canonical' }
    | { provider: 'cctp' }
    | { provider: 'layerzero'; nativeFee: bigint; lzTokenFee: bigint }
    | {
        provider: 'lifi';
        variants: ('fastest' | 'cheapest')[]; // merged when identical
        step: LifiStep;
        tool: ToolDetails;
      }
  );
```

Quoting a LiFi route returns up to two quotes (fastest and cheapest), collapsed
into one with `variants: ['fastest', 'cheapest']` when they are the same
underlying route. Gas estimates, fees and duration come from the LiFi routes
API onto the quote.

## Selectors

```ts
// hydration — once per pair load (view.ts)
hydrateTokens(chainId, payload): Token[]
buildRegistryView({ artifact, sourceChainTokens, destinationChainTokens, overlays? }): RegistryView

// selectors — all read the hydrated view (selectors.ts)
getSourceTokens(view, search?): Token[]
// the precomputed source list, filtered via the search index

filterTokens(view, tokens, search?): Token[]
// generic search primitive (also used by the destination picker)

getRoutes(view, sourceTokenId): RouteOption[]
// section-map lookups + session-overlay routes

hasSwapRoute(view, sourceTokenId): boolean
// lifi section membership — answerable without the swap set

getDestinationTokens({ view, sourceTokenId, swapDestinations? }): Token[]
// fixed outputs ∪ swap set (when the swap set has been fetched)

getSwapDestinationTokens({ view, sourceTokenId, swapDestinations }): Token[]

getDefaultDestinationToken(view, sourceTokenId): Token | null
// priority: layerzero > cctp > canonical > lifi counterpart

getRoutesForPair({ view, sourceTokenId, destinationTokenId, swapDestinations? }): RouteOption[]
// routes whose destinationTokenId matches
// + the lifi route if destinationTokenId ∈ swapDestinations
```

`getRoutesForPair` feeds the quote layer once a destination is chosen:
pick USDC.e → canonical (+ lifi); pick native USDC → cctp (+ lifi);
pick ETH → lifi swap only.

## Provider interface — one machinery for generation and quoting

```ts
interface RouteProvider {
  id: ProviderId;

  // server: everything this provider supports for an ordered pair
  generate(pair: ChainPair): Promise<{
    tokens: Token[];
    providerRoutes: ProviderRoutes | null; // null → absent from artifact
  }>;

  // runtime: quote a materialized route
  quote(route: RouteOption, request: QuoteRequest): Promise<RouteQuote[]>;
}

// canonical only — used by the import flow
interface CanonicalProvider extends RouteProvider {
  resolve(
    pair: ChainPair,
    sourceTokenAddress: Address,
  ): Promise<{
    tokens: Token[]; // source + destination Token records
    routes: RouteOption[];
  } | null>;
}
```

| Provider  | generate                                                                                                                                                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| canonical | merge the arbed token lists (priority-ordered, first list wins, deduped by child address; a failing list is skipped) → one route per entry per direction                                                                                                                         |
| cctp      | hardcoded entries (native USDC, Ethereum↔ArbitrumOne, Sepolia↔ArbitrumSepolia)                                                                                                                                                                                                 |
| layerzero | hardcoded entries (USDT@Ethereum ↔ USDT0@ArbitrumOne, adapter addresses)                                                                                                                                                                                                        |
| lifi      | connections API (membership only — bare addresses) joined with **per-chain** tokens API calls (metadata + coinKey; one request per chain so each response fits Next's 2MB fetch-cache entry limit and is reused across pairs) → normalized tokens, counterpart mapping, swap set |

Only canonical implements `resolve`: CCTP and LayerZero are hardcoded and
therefore complete, and the LiFi snapshot is exhaustive by construction — a
token missing from the artifact is definitively unsupported by those
providers, so import never probes them.

### Canonical exclusions

Some tokens must not move through the canonical bridge even though the token
lists would generate a route for them — e.g. PYUSD deposits are LiFi-only
(its withdrawal, `PYUSD_CANONICAL` → Ethereum PYUSD, stays canonical). This
is data, not code: a per-ordered-pair exclusion list of source addresses
(`canonicalRouteExclusions`), applied by the canonical generator **and** by
`canonical.resolve`, so an excluded token cannot come back through import.
The token records themselves are still emitted — the token stays visible for
its remaining routes.

## Serving & caching (no build-time JSON)

Generation runs inside Next.js route handlers; freshness comes from caching,
not rebuilds:

- handlers wrap their compute in `unstable_cache` with a tag
  (`tokens-42161`, `routes-1-42161`) and a `revalidate` window — long for
  token registries (~24h), shorter for LiFi-backed route artifacts (~1h)
- upstream fetches (token lists, LiFi connections API) use
  `fetch` with `next: { revalidate }` and are cached independently
- `revalidateTag` allows on-demand invalidation
- responses send `Cache-Control: s-maxage, stale-while-revalidate` so the CDN
  absorbs traffic; the client consumes through SWR
- CCTP / LayerZero entries are constants in handler code — changing them is a
  deploy, by design
- all cache keys embed a `CACHE_VERSION` constant — bump it whenever
  generation logic changes, so stale entries can never serve old shapes
  (`unstable_cache` entries survive dev-server restarts and even `.next`
  deletion is not always enough)

New LiFi tokens appear when the cache revalidates. No rebuild, no deploy.

## Client data flow

The bridge always has an active ordered pair (source chain, destination
chain). When the pair is set — initial load, direction flip, or chain change —
the client fetches (via SWR):

- `/api/tokens/[sourceChainId]` and `/api/tokens/[destinationChainId]`
- `/api/routes/[sourceChainId]/[destinationChainId]`

Those three payloads are hydrated **once** into a `RegistryView` — token
`Map`s, the joined + sorted source-token list, a precomputed lowercase search
index, per-provider section `Map`s, and the merged session overlay. All
selectors read the view, so searching and selecting cost an `includes()` /
`Map.get` instead of re-joining 6k tokens per keystroke.

The view is the single availability source for the pair: it powers the token
picker list, search, route materialization on token select, fixed destination
token options, and the default destination. Token registries are shared
across pairs, so flipping direction only fetches the reverse route artifact.

`/api/swap-destinations/[src]/[dst]` is fetched lazily — only when the user
opens the destination picker on a token with a lifi route. Quotes
(`amount`-specific) and import resolution are separate calls — the routes
endpoint only answers "what exists on this pair".

## User-imported tokens (session-only)

The user pastes an address on the source chain — typically a token our lists
missed. Import only considers **canonical** (the other providers are complete
by construction, see above):

```
1. lowercase; if already resolvable in base or overlay → just select it
2. run canonical.resolve(pair, address): derive the child (or parent) address
   on-chain, check registration, fetch metadata for both Token records
3. null → "not transferable to <destination chain>"
4. otherwise merge the returned tokens + route into an in-memory session
   overlay (same shapes as registry + artifact fragments)
```

Selectors read base + overlay, so imported tokens get search, route listing,
swap destinations and quoting identically to generated ones. Nothing is
persisted — the overlay lives for the browser session only.

## Example — USDC, Ethereum → Arbitrum One

Stored (artifact, abridged):

```jsonc
{
  "sourceChainId": 1,
  "destinationChainId": 42161,
  "providers": [
    { "provider": "canonical", "routes": { "0xa0b8...": "0xff97..." } }, // → USDC.e
    { "provider": "cctp", "routes": { "0xa0b8...": "0xaf88..." } }, // → native USDC
    {
      "provider": "lifi",
      "routes": { "0xa0b8...": "0xaf88...", "0x9876...": null }, // null → swap-only
    },
  ],
}
```

Materialized when the user selects USDC (`1:0xa0b8...`):

```ts
[
  { provider: 'canonical', sourceTokenId: '1:0xa0b8...', destinationTokenId: '42161:0xff97...' },
  { provider: 'cctp', sourceTokenId: '1:0xa0b8...', destinationTokenId: '42161:0xaf88...' },
  { provider: 'lifi', sourceTokenId: '1:0xa0b8...', destinationTokenId: '42161:0xaf88...' }, // stored counterpart
];
```

One source token, three routes, two destination tokens, plus the full LiFi
swap set (lazily fetched from `/api/swap-destinations`) if the user wants
something else entirely.

## Migration plan

1. **Types + trivial providers** — token/route/quote types, selectors, cctp
   and layerzero providers (hardcoded data proves the whole shape end to end)
2. **API routes + caching** — `/api/tokens/[chainId]` and
   `/api/routes/[source]/[dest]` with `unstable_cache`
3. **Canonical + LiFi generators** — address derivation, connections snapshot,
   coinKey counterpart mapping
4. **Quote layer** — per-provider `quote()`, LiFi fastest/cheapest collapse
5. **UI adoption** — source token search → `getSourceTokens`; route
   eligibility → `getRoutes` / `getRoutesForPair`; destination picker →
   `getDestinationTokens` / swap set
6. **Import** — `canonical.resolve` + session overlay; remove the legacy
   parent-address-keyed token storage

## End-to-end example — generation to usage

The full lifecycle for **Ethereum (1) → Arbitrum One (42161)**, with USDC as
the main character. "Generation" runs server-side inside our Next.js route
handlers, lazily on first request, then cached — there is no build step.
Everything else is the frontend consuming cached endpoints.

### Phase 1 — Generation (server, lazy, cached)

Nothing happens at deploy. The first request to an endpoint after a cold
cache triggers its compute inside `unstable_cache`; subsequent requests hit
the cache until `revalidate` expires.

#### `GET /api/tokens/42161` (and `/api/tokens/1`)

Server-side, the handler:

1. Fetches upstream token lists (`fetch` with `next: { revalidate: 86400 }`)
   — the existing arbified lists give us canonical tokens like USDC.e.
2. Fetches LiFi's tokens API for the chain —
   `GET li.quest/v1/tokens?chains=42161` — metadata for LiFi-supported
   tokens, **including `coinKey`, which stays server-side**.
3. Normalizes everything: lowercase addresses, curated fixes applied directly
   (USDT0 naming, ETH logo), native token added under the zero address.

Response (cached with tag `tokens-42161`, ~24h) — slim array, `id`/`chainId`
re-derived during client hydration:

```jsonc
[
  {
    "address": "0x0000000000000000000000000000000000000000",
    "symbol": "ETH",
    "name": "Ether",
    "decimals": 18,
  },
  {
    "address": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
  },
  {
    "address": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    "symbol": "USDC.e",
    "name": "Bridged USDC",
    "decimals": 6,
  },
  // ... ~1.5k entries
]
```

#### `GET /api/routes/1/42161`

Server-side, the handler checks the supported-pairs config (1→42161
supported — if not, **404**, no empty artifact), then runs each provider's
`generate(pair)`:

| Provider  | What runs server-side                                                                                                               | Upstream called                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| canonical | for each parent-chain token, derive the child address                                                                               | arbified token list `bridgeInfo` / gateway router via RPC                                     |
| cctp      | emit hardcoded entry                                                                                                                | none                                                                                          |
| layerzero | emit hardcoded entry                                                                                                                | none                                                                                          |
| lifi      | build counterpart map by matching `coinKey` between from/to sides (curated coinKeys fill LiFi's gaps: PYUSD, ENA); collect swap set | `li.quest/v1/connections?fromChain=1&toChain=42161` + per-chain `li.quest/v1/tokens?chains=N` |

Providers returning `null` are omitted from the array. Response (cached with
tag `routes-1-42161`, ~1h):

```jsonc
{
  "sourceChainId": 1,
  "destinationChainId": 42161,
  "providers": [
    {
      "provider": "canonical",
      "routes": {
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "0xff970a61...", // USDC → USDC.e
        "0xdac17f958d2ee523a2206206994597c13d831ec7": "0xfd086bc7...", // USDT → bridged USDT
        // ... ~10k entries
      },
    },
    {
      "provider": "cctp",
      "routes": {
        "0xa0b86991...": "0xaf88d065...", // USDC → native USDC
      },
    },
    {
      "provider": "layerzero",
      "routes": {
        "0xdac17f95...": {
          "destination": "0xfd086bc7...",
          "oftAdapter": "0x6c96de32...",
          "endpointId": 30110,
        },
      },
    },
    {
      "provider": "lifi",
      "routes": {
        "0xa0b86991...": "0xaf88d065...", // coinKey USDC matched → counterpart
        "0x1234abcd...": null, // some token: swap-only, no counterpart
      },
    },
  ],
}
```

The pair's swap destination set (LiFi `toTokens`, same metadata join) is
generated alongside but served separately:
`GET /api/swap-destinations/1/42161 → ["0xaf88d065...", "0x0000...0000", ...]`

### Phase 2 — Pair load (frontend, runtime)

User opens the bridge; the pair defaults to 1→42161. Three SWR fetches fire:

```
GET /api/tokens/1          (CDN/SWR cached)
GET /api/tokens/42161
GET /api/routes/1/42161
```

No further availability calls happen for this pair. If the user flips
direction, only `GET /api/routes/42161/1` is new — both token registries are
already cached.

The three payloads are hydrated once into the `RegistryView` (token maps,
joined + sorted source list, lowercase search index over all tokens,
per-provider section maps, merged session overlay).

### Phase 3 — Token picking & route materialization (frontend, pure functions, no network)

**Token picker opens** → `getSourceTokens(view)`: the precomputed source
list, rendered in full through a fixed-row-height virtualized list (~14 DOM
rows regardless of token count). User types "USDC" → one `includes()` per
token against the search index.

**User selects USDC** → `getRoutes(view, '1:0xa0b8...')` materializes by
checking that address against each section map:

```ts
[
  { provider: 'canonical', sourceTokenId: '1:0xa0b8...', destinationTokenId: '42161:0xff97...' },
  { provider: 'cctp', sourceTokenId: '1:0xa0b8...', destinationTokenId: '42161:0xaf88...' },
  { provider: 'lifi', sourceTokenId: '1:0xa0b8...', destinationTokenId: '42161:0xaf88...' },
];
```

`getDefaultDestinationToken` applies priority (layerzero > cctp > canonical >
lifi) → **native USDC** preselected. Because USDC has a lifi route,
`GET /api/swap-destinations/1/42161` is fetched (the one lazy call) and the
destination picker shows `getDestinationTokens` = {USDC.e, native USDC} ∪
swap set (so also ETH, ARB, ...) — searchable via `filterTokens` and
virtualized exactly like the source list.

### Phase 4 — Quoting (runtime, on amount entry, per route)

User keeps native USDC as destination and types **100**.
`getRoutesForPair(artifact, USDC, nativeUSDC)` → `[cctp, lifi]` (canonical is
excluded — its destination is USDC.e). Each is quoted:

- **cctp** → frontend, via RPC: `estimateGas` on the TokenMessenger contract
  → `RouteQuote { provider: 'cctp', amountReceived: 100000000n, gasEstimate: {...} }`
- **lifi** → frontend calls **our server proxy**
  `GET /api/crosschain-transfers/lifi?fromToken=...&toToken=...&fromAmount=100000000`,
  which calls LiFi's routes API server-side and returns fastest + cheapest.
  Same underlying route → collapsed:
  `RouteQuote { provider: 'lifi', variants: ['fastest','cheapest'], amountReceived: 99850000n, gasEstimate, fees, durationMs: 30000, step, tool }`
- (layerzero, when applicable, quotes frontend-side via `quoteSend()` RPC)

UI renders two route cards from the quotes. User picks one and executes —
past this point we're out of registry territory.

### Phase 5 — Import (runtime, the miss path)

User pastes `0xdead...beef` (chain 1) — not in `tokens/1`, not in the session
overlay. Frontend calls:

```
GET /api/import/1/42161/0xdeadbeef...
```

Server-side, `canonical.resolve(pair, address)` runs — and only canonical
(CCTP/LayerZero are hardcoded, the LiFi snapshot is exhaustive; a miss there
is definitive). It derives the child address via the gateway router (RPC),
confirms registration, and fetches symbol/name/decimals for both sides:

```jsonc
{
  "tokens": [
    { "id": "1:0xdead...", "symbol": "DEAD", "decimals": 18, ... },
    { "id": "42161:0xbabe...", "symbol": "DEAD", "decimals": 18, ... }
  ],
  "routes": [
    { "provider": "canonical", "sourceTokenId": "1:0xdead...", "destinationTokenId": "42161:0xbabe..." }
  ]
}
```

Frontend merges this into the **in-memory session overlay**; selectors read
base + overlay, so DEAD is now searchable, selectable, and quotable like any
generated token. `null` would instead surface "not transferable to Arbitrum
One". Nothing persisted — gone on tab close.

### Swap-only contrast, briefly

ApeChain → Superposition, user selects native APE (`33139:0x0000...`): the
artifact has only a lifi section, `routes["0x0000..."] = null`. The
materialized route has no `destinationTokenId`, so the UI fetches the pair's
swap destinations and requires a choice from `getSwapDestinationTokens`
(USDC, ETH, ...). Quoting then proceeds identically through the LiFi proxy.

## PoC implementation (Ethereum ↔ Arbitrum One)

Implemented in `packages/app`:

| Piece                                                                               | Location                                            |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| Types, constants (hardcoded providers, exclusions, curated coinKeys), normalization | `src/token-registry/{types,constants,normalize}.ts` |
| Selectors + hydration (`RegistryView`)                                              | `src/token-registry/{selectors,view}.ts`            |
| Generation (canonical, cctp, layerzero, lifi) + caching                             | `src/token-registry/server/generate.ts`             |
| Import (`canonical.resolve`)                                                        | `src/token-registry/server/resolveImport.ts`        |
| API routes (tokens, routes, swap-destinations, import)                              | `src/app/api/token-registry/**`                     |
| UI (virtualized source + destination pickers, session import)                       | `src/app/token-registry-poc/`                       |
| Unit tests (selectors, view, generation, normalization)                             | `src/token-registry/__tests__/`                     |

Measured (live data, cold generation, no cache):

| Payload                                                   | Size                     |
| --------------------------------------------------------- | ------------------------ |
| `tokens/1` — 4.9k tokens                                  | 850 KB raw / 224 KB gzip |
| `tokens/42161` — 1.5k tokens                              | 288 KB raw / 80 KB gzip  |
| `routes/1/42161` — canonical 940, cctp 1, lz 1, lifi 4.7k | 321 KB raw / 155 KB gzip |
| `routes/42161/1`                                          | 150 KB raw / 74 KB gzip  |
| `swap-destinations/1/42161` — 1.2k addresses              | 54 KB raw / 28 KB gzip   |
| `swap-destinations/42161/1` — 4.7k addresses              | 209 KB raw / 108 KB gzip |

Cold generation: ~1–3s per endpoint (upstream-fetch bound), then cached.
Re-measure anytime with the network-gated harness:

```bash
MEASURE=1 pnpm exec vitest --config vitest.config.ts --run --reporter=verbose src/token-registry
```

**Import demo:** PEPE is deliberately excluded from all generation
(`isExcludedToken` in `constants.ts`) even though it has a canonical route —
paste `0x6982508145454ce325ddbe47a25d4ec3d2311933` (Ethereum → Arbitrum One)
into the picker to watch the import flow resolve it on-chain and add it for
the session.

Not in the PoC yet: the quote layer (per-provider `quote()`, LiFi
fastest/cheapest), testnet pairs (Sepolia ↔ ArbitrumSepolia CCTP), and chains
beyond Ethereum/Arbitrum One.
