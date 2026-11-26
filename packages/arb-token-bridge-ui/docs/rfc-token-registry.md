# RFC: Token registry files for the bridge pickers

| **Authors**            | @name, @name                                             |
| ---------------------- | -------------------------------------------------------- |
| **Created**            | 2026-11-18                                               |
| **Modified**           | 2026-11-18                                               |
| **Status**             | **`draft`** → `draft-review` → `in-progress` → `shipped` |
| **Reference revision** |                                                          |

### Design Doc Review

| Reviewer | Status        | Last Review |
| -------- | ------------- | ----------- |
| @name    | `in-progress` | YYYY-MM-DD  |
| …        |               |             |

## TL;DR

This RFC lets the bridge pickers list tokens on every chain in the registry, not only the two selected chains. A user picks a token on any chain without changing the network first.

A job in the token-lists repo builds the registry every hour and publishes it to S3 as static files: an index of chains and pairs, one file per chain, and `top.json` with up to 1,000 ranked tokens per chain. The portal's API reads these files to answer four requests: the selection, the destination list, a search, and the wallet's balances. The browser reads `top.json` directly from the CDN.

For example, the selection for Ethereum USDC lists every chain that USDC reaches, with each chain's default token:

```ts
// GET /api/token-registry/files/selection?sourceChainId=1&sourceToken=0xa0b8…eb48
{
  sourceChainId: 1,
  sourceToken: { chainId: 1, address: '0xa0b8…eb48', symbol: 'USDC', … },
  destinationChains: [
    {
      chainId: 42161,
      // the token selected when the user picks this chain: native USDC through LiFi
      defaultToken: { address: '0xaf88…5831', symbol: 'USDC', providers: ['lifi'], … },
      // the token that the canonical bridge delivers: USDC.e
      canonicalToken: { address: '0xff97…5cc8', symbol: 'USDC.e', providers: ['canonical'], … },
    },
    // … 4 more chains
  ],
  destinationChainId: 42161,
  destinationToken: { chainId: 42161, address: '0xaf88…5831', symbol: 'USDC', … },
}
```

On load, the page requests only the selection, which is about 0.5 KB compressed. Today the page downloads 218 KB of token lists, compressed, on every visit. The pickers load their lists when the user opens them:

- The source picker loads `top.json` once, 200 KB compressed, and reuses it on every chain.
- The destination picker loads every token that the source token reaches, 57 KB to 75 KB compressed.

The average visitor downloads about 46 KB compressed instead of 218 KB. In return, a search for a token outside the top 1,000 of its chain waits for the server.

The [PoC](https://arbitrum-portal-git-token-poc-top-offchain-labs.vercel.app/token-registry-poc/top) implements the design.

# 1. Overview

This RFC describes how the bridge pickers get their tokens once they list every chain in the token registry. It covers the files that the token-lists repo publishes, the portal API that reads them, when the page loads each list, the caches between them, and how the bridge moves off its current token management.

# 2. Background

## Loading every list in the browser does not scale

Today the page fetches the token lists of the selected source and destination chains, merges them into `bridgeTokens`, and finds the providers on the client. It downloads 218 KB compressed on every load, and the pickers show only those two chains. To pick a token on a third chain, the user changes the network first.

Listing every chain this way means downloading the whole registry: 12,020 tokens on 23 chains, 2.76 MB raw and 787 KB compressed. The Ethereum file alone is 1.52 MB, and each new chain adds to the total.

Most visitors never open a picker. A 60-day PostHog snapshot reports these numbers:

| Behavior                                 |  Users | Share of bridge visitors |
| ---------------------------------------- | -----: | -----------------------: |
| Opened the source token picker           | 24,229 |                    19.9% |
| Searched in the source token picker      |  7,068 |                     5.8% |
| Opened the destination token picker      |  8,898 |                     7.3% |
| Searched in the destination token picker |  2,803 |                     2.3% |

More than 80% of visitors never open the source picker, and more than 92% never open the destination picker. They still pay for both lists.

## The model has one address pair per token

Each `ERC20BridgeToken` stores the parent-chain address in `address` and the child-chain address in `l2Address`. That model cannot describe a token with two destinations, such as Ethereum PYUSD, or two tokens that withdraw to one, such as Arbitrum One USDC and USDC.e. Each of these cases is a hardcoded branch in bridge code today.

The registry gives each token on each chain its own entry, and the API names every destination token with the providers that reach it.

## Other Resources

- [PostHog bridge token behavior dashboard](https://us.posthog.com/project/27078/dashboard/1957153)
- [PoC](https://arbitrum-portal-git-token-poc-top-offchain-labs.vercel.app/token-registry-poc/top), code in `packages/app/src/app/token-registry-poc/top`
- Registry generator: `src/lib/tokenRegistry` in the token-lists repo

# 3. Goals & Non-Goals

## Goals

- Pick a source token on any registry chain without a network change first.
- List every token that the source token reaches, on every destination chain.
- Find any registry token by symbol, name, or address, including tokens outside the top 1,000.
- Show the tokens that the wallet holds first, on every chain.
- Keep the page-load response under 1 KB compressed.
- Serve every token list from a public cache, with no wallet-specific key.
- Keep the bridge's URL parameters: `sourceChain`, `destinationChain`, `token`, and `destinationToken`.

The design succeeds when it meets these targets:

- A new chain needs a registry entry in the token-lists repo, and no portal code.
- PYUSD, USDC, and USDT0 need no token-specific branch outside `packages/app/src/token-registry/constants.ts`.
- An API test covers each goal, and every test passes.

## Non-Goals

- The design does not change runtime route construction. LiFi quotes and route ranking stay in `useRoutesUpdater`.
- The design does not cache balances. Balances depend on the wallet and change with every transfer.
- The design adds no compatibility layer for the old token types.

# 4. Proposed Design

## A job publishes the registry as files every hour

The token-lists repo builds the registry in `src/lib/tokenRegistry`. A cron workflow runs it every hour, at minute 2, and syncs the files to S3 with `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.

| File               | Content                                       | Read by             |
| ------------------ | --------------------------------------------- | ------------------- |
| `index.json`       | every chain with its parent chain, every pair | the API             |
| `chains/<id>.json` | every token on the chain                      | the API             |
| `top.json`         | up to 1,000 tokens per chain, in rank order   | the API and browser |

The job reads the Arbitrum token lists, the LiFi token API, `orbitChainsData.json`, LayerZero's metadata, and a curated list of tokens that are the same asset on several chains. It records what the API needs on each token:

- `parentAddress` names the token's canonical parent token, from the list's `bridgeInfo`.
- `counterparts` maps each other chain to the same asset on that chain, such as Arbitrum One USDC for Ethereum USDC. For each chain, the job tries four sources in order and keeps the first one that names exactly one token:
  1. the curated groups
  2. native Ether, when both chains pay gas in Ether
  3. the `bridgeInfo` links
  4. LiFi's `coinKey`
- `isLifi` marks a token that LiFi routes on at least one of the chain's LiFi pairs.
- `oftBlockedChainIds` lists, on a canonical parent token, the child chains that its canonical deposit may not reach, because LayerZero bridges the token there. The job applies master's OFT deposit rule to each child chain, from LayerZero's metadata and `oftVersion()` calls. The rule depends on the child chain: a deposit is allowed when LayerZero knows the canonical child token, and blocked when LayerZero has its own OFT deployment there. OFT deployments rarely change, so an hourly check is enough, and the API makes no LayerZero request and no RPC call for it.

In `index.json`, `hasLifi` marks a pair where the bridge offers LiFi and LiFi supports both chains.

`top.json` keeps up to 1,000 tokens per chain and orders all of them together:

1. the curated tokens, with each asset's tokens together, such as USDC on every chain
2. every chain's native token
3. the tokens that LiFi trades, most traded first, whatever their chain
4. the other tokens, by symbol

A token's rank is its position in the file. The pickers show the tokens that the wallet holds above all of these. Without steps 1 and 2, the native tokens of chains that LiFi does not trade would rank below thousands of Ethereum, Arbitrum One, and Base tokens.

## The API builds the routes from the files

The CDN caches each API response for one hour by query string, so the API computes a given response about once per hour, not once per user. To compute it, the API fetches each file with `next: { revalidate: 3600 }`, so Next keeps the file for one hour. The Ethereum file uses 72% of Next's 2 MiB fetch-cache limit.

For a source token and a destination chain, the API collects every destination token and the providers that reach it:

- **Canonical.** The canonical bridge connects a chain to its parent. A deposit sends a parent token to the child token whose `parentAddress` points to it. A withdrawal sends a child token to its `parentAddress`. Ether moves as Ether when both chains pay gas in Ether. The API drops a deposit to a chain in the parent token's `oftBlockedChainIds`, except for the tokens in `canonicalBlockExemptions`.
- **LayerZero.** `layerZeroConfig` names the destination token.
- **LiFi.** On a pair with `hasLifi`, every source token with `isLifi` reaches every destination token with `isLifi`.

The bridge's block lists stay in the portal, so a list change takes effect without a new registry. `isCanonicalTransferAllowed` reads the transfer-disabled and withdraw-only lists, and `blockedSourceRoutes` and `blockedLifiSourceRoutes` remove routes by source token.

When the files give a source token only LiFi routes, or none, on a pair with a canonical bridge, the API tries a canonical import. This covers a token that nobody has bridged to the chain yet. `getCanonicalBridge` finds the gateway router in the bridge's chain registry. The import makes a few RPC calls and caches the result for one hour. An imported token is not in the files, so the import applies the OFT rule itself, with LayerZero's metadata. The all-chains destination list tries imports only when no chain has a route, because each import costs RPC calls.

## The backend picks the default destination

For each destination chain, the backend picks the first token in this order:

1. The token that the user picked, or its counterpart on this chain.
2. The pair's entry in `defaultDestinationOverrides`.
3. The source token's counterpart on this chain.
4. The canonical destination.
5. The LayerZero destination.
6. The native token.

A default never hides another route. Ethereum USDC defaults to native USDC on Arbitrum One through LiFi, and its canonical route still delivers USDC.e.

The selection lists the chains with a canonical route first.

## The API has four endpoints

Every endpoint takes chain IDs and token addresses. Native tokens use the zero address.

### Get the selection

```text
GET /api/token-registry/files/selection?sourceChainId=1&sourceToken=0x...&destinationChainId=42161&destinationToken=0x...
```

Only `sourceChainId` is required. `sourceToken` defaults to the native token. The endpoint returns the `Selection` type in `packages/app/src/token-registry/registryFiles.ts`: the source token, every reachable chain with its default token, and the requested destination chain and token when the source reaches them.

The endpoint handles two invalid inputs:

- A chain outside the registry falls back to Ether on Ethereum to Arbitrum One.
- An unknown token on a registry chain selects no token. The source picker then opens on that chain.

### Get the destination tokens

```text
GET /api/token-registry/files/destination-tokens?sourceChainId=1&sourceToken=0x...&destinationChainId=42161&q=usd
```

Without `destinationChainId`, the endpoint returns the tokens of every reachable chain, up to 1,000 per chain. The response is a `TokenList`. `isComplete` is true when no chain reached the limit. The picker then searches the list in the browser. Otherwise it sends the search to the server with `q`.

### Search every token

```text
GET /api/token-registry/files/search?q=usdc&chainId=1
```

The endpoint searches every chain file, or one chain with `chainId`, and returns the 50 best matches. An exact symbol comes first, then a symbol prefix, then a symbol that contains the query, then a name that contains it. Matches of the same quality keep the rank order. An address matches only its own token. If no file has a pasted address, the endpoint reads the token from the chain: the selected chain, or Ethereum and Arbitrum One without one.

### Get the wallet's balances

```text
GET /api/token-registry/files/balances?address=0x...
```

The endpoint makes one `eth_call` per chain. The call loads a small contract with a state override, and the contract reads the balance of every token in the chain file, top 1,000 or not. The response lists the tokens with a balance. If an RPC fails or refuses the state override, the response names the chain in `failedChainIds`, and the other chains still answer.

## The page loads each list when the user needs it

The page reads the bridge's URL parameters and requests the selection. It updates the URL when the user changes a chain or a token.

| User action                      | Request                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open the bridge                  | One selection, 0.5 KB to 0.6 KB compressed.                                                                                                                                                                                     |
| Hover or focus the source button | `top.json` starts to load with SWR `preload`, so the picker rarely waits.                                                                                                                                                       |
| Open the source picker           | `top.json`, 200 KB compressed, once for every chain.                                                                                                                                                                            |
| Search the source picker         | One search when the user stops typing for 250 ms, 2.5 KB compressed. The page filters `top.json` until it answers. On a chain with fewer than 1,000 tokens, the page searches `top.json` alone, unless the query is an address. |
| Change the source token          | One selection. `top.json` stays cached.                                                                                                                                                                                         |
| Open the destination picker      | One destination list for the source token, 57 KB to 75 KB compressed.                                                                                                                                                           |
| Connect a wallet                 | One balances request, in parallel with the lists.                                                                                                                                                                               |

The destination picker opens on the chain from the `destinationChain` parameter when the source reaches it. Otherwise it opens on all chains.

Both pickers show the tokens with a balance above every other token, in the list and in search results. Each group keeps its order. The source picker also adds the held tokens outside the top 1,000. The lists render first, and the balances fill in when they arrive.

## Four caches sit between the job and the user

| Cache            | What it holds                       | Lifetime                                                 |
| ---------------- | ----------------------------------- | -------------------------------------------------------- |
| S3 and the CDN   | the registry files, for the browser | 5 minutes, then stale while it revalidates, up to 1 hour |
| Next fetch cache | each registry file, for the API     | 1 hour                                                   |
| CDN              | each API response, by query string  | 1 hour, then stale while it revalidates, up to 1 day     |
| `unstable_cache` | each canonical import               | 1 hour                                                   |

A registry change usually reaches the API responses within about three hours: the hourly job, then the fetch cache, then the response cache. A URL that nobody requested for a while still serves its old response once, up to a day old, while the CDN refreshes it.

Next keeps its fetch cache across deployments. A change in what a file means, such as a new ranking, therefore needs a new folder version, such as `v3`, so that new code never reads old files.

## The trade favors the common visit

At observed picker-open rates, the average visitor downloads about 175 KB raw, or 46 KB compressed:

- one selection, 3.6 KB raw
- `top.json` for 19.9% of visitors, 750 KB raw
- one destination list for 7.3% of visitors, 297 KB raw

The estimate does not assume that the two picker audiences are separate groups. It is a lower bound: hovering over the source button also loads `top.json`, so more visitors than the 19.9% who open the picker download it. Today every visitor downloads 218 KB compressed, or 1,210 KB raw.

The design has four costs that reviewers should weigh:

- A token outside `top.json` shows up in a search only when the server answers. On the dev server, that took about 20 ms with the files cached and 250 ms without them. Today the search runs in the browser, but only on two chains.
- Balances take about 0.45 seconds for 23 chains, close to today's 0.25 to 0.45 seconds for two chains. The first request after a server instance starts takes about 1.2 seconds, because it opens a connection to each RPC. Each request also costs 23 RPC calls, and nothing caches them.
- The first selection with an empty fetch cache takes about 1.2 seconds, because the API fetches and parses every file it needs. Next refreshes an expired file in the background, so only an empty cache makes the user wait.
- `top.json` grows when a chain gains tokens. Ethereum, Arbitrum One, and Base reach 1,000 today. At 1,000 on every chain, the file would hold 23,000 tokens.

We think the slower long-tail search is the right price. On 20 of the 23 chains, `top.json` already holds every token, so only an Ethereum, Arbitrum One, or Base token can be missing from it. The source picker shows every token in the file with no request at all once `top.json` is cached.

# 5. Implementation Plan

The work has four milestones. The bridge keeps its current token management until the third milestone, and the fourth deletes it.

## Publish the registry

1. Ship the `Cache-Control` header on the S3 uploads (token-lists#214).
2. Ship token-lists#215, which keeps only the rank order in `top.json`.
3. Ship the OFT block lists with the job (token-lists#214). The job copies the bridge's LayerZero chain keys, so a chain that LayerZero adds needs an entry in both repos.
4. Add a Cloudflare cache rule for the registry files. Cloudflare answers `cf-cache-status: DYNAMIC` for `.json` today, so every request reaches S3.
5. Alert when the job fails, or when `index.json` is more than 3 hours old.
6. Point `TOKEN_REGISTRY_URL` at the production folder.

## Build the API

1. Move the PoC's server code to production modules, and validate every registry file with Zod before use.
2. Implement the four endpoints with the cache headers above. Rate-limit the balances endpoint, and split each chain's balance call into calls of about 2,000 tokens. Ethereum's single call reads about 7,000 tokens, close to the gas cap of some RPCs.
3. Add the API tests from the testing plan.

## Move the bridge to the API

1. Replace `useSelectedToken` and `useDestinationToken` with one selection resource, keyed by the URL parameters.
2. Replace `TokenSearch` with a source picker that reads `top.json` and the search endpoint.
3. Replace `DestinationTokenSearch` with a destination picker that reads the destination-tokens endpoint.
4. Feed the providers of the selected destination token into `useRoutesUpdater`, in place of client-side provider discovery.
5. Replace every direction-based read of `address` or `l2Address` with the source token and the destination token from the selection.
6. Read balances from the balances endpoint.

## Delete the old token management

After the last caller moves, delete `ERC20BridgeToken`, `bridgeTokens`, `TokenListSyncer`, `useTokenLists`, the token-list settings and management UI, and the client-side provider discovery helpers.

# 6. Testing Plan

The token-lists repo tests the generator:

- the rank order in `top.json`, and the limit of 1,000 tokens per chain
- each counterpart rule
- the `isLifi`, `oftBlockedChainIds`, and `parentAddress` fields, and `hasLifi` on the pairs

API tests cover these cases:

- the default destination for each step of the default order
- a requested destination token, and its counterpart on another chain
- a chain outside the registry, and an unknown token on a registry chain
- canonical routes in both directions, LayerZero routes, and LiFi routes
- the transfer-disabled, withdraw-only, and OFT deposit blocks
- a canonical import for a token that the files do not route
- the destination list at the 1,000-token limit, and `isComplete`
- a search by symbol, by name, and by a pasted address that no file has
- a balances request with one failing RPC

Bridge acceptance tests run on fixed registry fixtures, so a new registry cannot change the results:

| Behavior           | Required proof                                                                     |
| ------------------ | ---------------------------------------------------------------------------------- |
| Initial render     | The bridge requests only the selection and renders both tokens.                    |
| URL                | Each URL parameter selects its token or chain, and each pick updates the URL.      |
| Source picker      | The picker lists every chain by rank and finds a token outside the top 1,000.      |
| Destination picker | The picker lists every reachable token and opens on the URL's destination chain.   |
| Balances           | Held tokens come first in both pickers, and a failing chain hides only its tokens. |
| Runtime routes     | The providers of the selected token produce the same runtime routes as today.      |
| Deletion           | Repository searches find no production callers of the legacy token types.          |

# 7. FAQ

**Why does the server read the balances?**
The balance contract reads every token in the chain files, and only the server loads them. The browser has `top.json`, so a browser call would miss the held tokens outside the top 1,000, or download the 2.76 MB of chain files to find them. The server also answers in one request instead of one RPC call per chain.

**Why does the browser read `top.json` from the CDN and not from the API?**
The file is the same for every user and changes once per hour. S3 and the CDN serve it without a function call.

**Does a new source token reload `top.json`?**
No. `top.json` does not depend on the selection. Only the selection and the destination list depend on the source token.

**Why does the destination list come from the API?**
The destinations depend on the source token, the canonical bridges, LayerZero, LiFi, and the bridge's block lists. The API applies the block lists to every response, so the browser never sees a blocked route.

**Why not cache balances?**
A balance belongs to one wallet and changes with every transfer. The balances endpoint sends `Cache-Control: private, no-store`, and the token lists stay in their own shared caches.

# 8. Appendix

## Glossary

- **Registry.** The files that the token-lists job publishes: `index.json`, one chain file per chain, and `top.json`.
- **Rank.** A token's position in `top.json`. A token outside the file ranks after every token in it, by symbol.
- **Counterpart.** The same asset on another chain, such as Arbitrum One USDC for Ethereum USDC.
- **Provider.** A way to move a token between two chains: `canonical`, `layerzero`, or `lifi`.

## What the user downloads

Measured on November 18, 2026, on a local Next dev server, against a registry generated that day with 23 chains. Compressed sizes use gzip. Today's numbers come from the production bridge on the same day, from Ethereum to Arbitrum One: five token lists, the LiFi token list, and the warning list.

| Download                               | When                          | Tokens |    Raw | Compressed |
| -------------------------------------- | ----------------------------- | -----: | -----: | ---------: |
| Selection, Ethereum ETH                | page load, token change       |      1 | 3.6 KB |     0.5 KB |
| Selection, Ethereum USDC               | page load, token change       |      1 | 3.6 KB |     0.6 KB |
| `top.json`                             | first source picker open      |  3,600 | 750 KB |     200 KB |
| Search for "usdc"                      | source picker search          |     50 |  11 KB |     2.5 KB |
| Destination list, ETH to all chains    | destination picker open       |  1,345 | 297 KB |      75 KB |
| Destination list, USDC to all chains   | destination picker open       |  1,013 | 230 KB |      58 KB |
| Destination list, USDC to Arbitrum One | destination picker, one chain |  1,000 | 226 KB |      57 KB |
| Balances, one active wallet            | wallet connect                |    322 |  86 KB |      23 KB |

Today the page downloads 218 KB compressed, or 1,210 KB raw, of token lists on every load, whether or not the user opens a picker.
