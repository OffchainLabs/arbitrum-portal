# ADR: Wallet ecosystems in the bridge

- **Status:** Proposed
- **Date:** 2026-10-16
- **Scope:** `packages/arb-token-bridge-ui`, `packages/app` (header wallet)

## Context

The bridge was built for one kind of wallet. Components read the account from wagmi's `useAccount`, every chain id resolved to an ethers provider, and addresses were lowercased wherever they were compared or stored.

Solana breaks each of those assumptions:

- A base58 address is case-sensitive, so lowercasing corrupts it.
- A Solana chain has no ethers provider and no Arbitrum parent or child.
- A Solana → Arbitrum transfer involves two wallets: a Solana wallet signs, and an EVM address receives.

We want to add Solana as a LiFi source without changing what EVM users see. We also want the next ecosystem to cost a config file and a set of compile errors, not a search through the UI.

## Decision

### An ecosystem is a property of the chain

`getWalletEcosystem(chainId)` returns `'evm'` or `'solana'`. It reads the network metadata registry, which is built from the chains each ecosystem declares. Everything the bridge knows about an ecosystem without making an RPC call sits in one object, `wallet/ecosystems/<name>.ts`, typed as `EcosystemConfig`:

- address and transaction id validation and normalization
- the native token address used in balance requests and LiFi quotes
- whether tokens have separate parent and child addresses, meaning the chain has Arbitrum's token bridge
- whether its chains have an EVM gas price, whether transfers sign with wagmi's ethers signer, and whether AppKit identifies its networks by chain id
- the explorer account path
- the built-in chains
- the AppKit namespace
- the display name and analytics asset type
- the feature flag, `isEnabled()`

Cross-ecosystem helpers in `util/AddressUtils.ts` (`isValidAddress`, `normalizeAddress`, `isValidTransactionId`, `addressesEqual`) loop over `ecosystems`. They have no `if (solana)` cases. EVM normalization still lowercases, so EVM comparisons behave as on master. Solana normalization returns the address unchanged.

### Components ask for a wallet, not for wagmi

`WalletContext` holds one handle per ecosystem. A handle is the same shape everywhere: `account` (address, chain id, status, wallet info), `isConnected`, `disconnect` and `signer`. Components get handles through hooks:

- `useWallets()` returns `sourceWallet` and `destinationWallet` for the selected networks.
- `useWalletForChain(chainId)` returns the wallet for any chain.

Wallet library calls for the transfer flow stay in the wallet layer. `useEvmWallet` wraps wagmi and AppKit's `eip155` namespace, and `useSolanaWallet` wraps AppKit's `solana` namespace. Features that only exist on EVM, such as Earn, Buy, Recover Funds and withdrawal claims, still read wagmi directly, because they never involve another ecosystem.

The two-wallet case follows from the handles. The source wallet signs. The recipient is the typed destination address or, on a cross-ecosystem transfer, the destination wallet. `requiresRecipientAddress` and `getRecipientToHighlight` in `services/destinationAddress.ts` encode those rules once, and the transfer panel, network boxes, route card and header all read them.

### No ecosystem branches in the UI

A component that needs ecosystem-specific behaviour calls a helper or reads the config. It never compares against `'solana'` or `ChainId.Solana`. For example:

- explorer links come from `getAccountExplorerUrl`, which reads `explorerAccountPath`
- the wallet name in the header comes from `ecosystems[ecosystem].name`
- the connect modal opens on `getEcosystemConfig(chainId).namespace`

Capabilities that only EVM chains have today, such as a gas price or Arbitrum's token bridge, are required fields of the config, not checks against `'evm'`. A new ecosystem config fails to compile until it answers each of them. The one check left is ENS and Unstoppable Domains in `useAccountMenu`, which narrows the address to `0x${string}`: those services only resolve EVM addresses, so no other ecosystem can answer yes.

### Per-ecosystem implementations live in typed records

Behaviour that does need an RPC or an SDK lives in a `Record<WalletEcosystem, …>` next to the code that uses it:

| Record                   | File                                        |
| ------------------------ | ------------------------------------------- |
| native currency          | `services/nativeCurrency.ts`                |
| native currency fallback | `hooks/useNativeCurrency.ts`                |
| token metadata           | `services/tokenMetadata.ts`                 |
| account type             | `util/AccountUtils.ts`                      |
| balance client           | `wallet/balance/getBalanceClient.ts`        |
| LiFi SDK provider        | `token-bridge-sdk/LifiRouteExecutor.ts`     |
| source transaction wait  | `token-bridge-sdk/LifiTransferStarter.ts`   |
| LiFi routes              | `app/api/crosschain-transfers/constants.ts` |
| default wallet handle    | `wallet/WalletContext.ts`                   |
| wallet hooks             | `wallet/WalletProvider.tsx`                 |

The types follow the same rule. `WalletContextValue` is mapped over `WalletEcosystem`, and the address and signer of each ecosystem come from `AddressByEcosystem` and `Signers` in `wallet/types.ts`. Adding a member to `WalletEcosystem` makes each record and type map fail to compile, in its own file, until it gets an entry. That compile error is the checklist.

### Execution goes through LiFi's SDK providers

One `LifiTransferStarter` runs every LiFi route. It takes only the route, so it needs no provider to estimate gas or to start, and the factory returns it before creating any provider. Each wallet handle has a `signer` whose method names follow LiFi's provider options: `getWalletClient` for EVM, `getWalletAdapter` for Solana. `LifiRouteExecutor` registers one LiFi provider per enabled ecosystem that has a signer. It takes the signers from the source and destination wallets, plus the caller's `switchChainAsync`. Chain switching is a UI concern, so it stays with the caller instead of the signer.

Signers read the wallet when called, not when created, so a route signs with the account connected at that moment. Before it runs or resumes a route, the executor picks the signer from the sender's address format and checks that it is still the sender's account. The starter returns `sourceChainTransaction.wait()`, which reads a record keyed by ecosystem: EVM waits for the receipt through the source chain provider, and Solana resolves at once because LiFi only reports the signature after confirmation. Gas estimates come from the route. When the source chain has no gas price, as on Solana, the starter returns LiFi's quoted fees as well, and the gas summary shows those.

### Network metadata doesn't need an EVM provider

`util/networkMetadata.ts` registers every built-in chain with its ecosystem. Chain names, native currency and explorers come from that registry. Code paths that used to create an ethers provider just to read chain data now read the registry, so selecting Solana doesn't create an EVM provider for it. Arbitrum-specific setup, such as the token bridge parameters, runs only when both chains have Arbitrum's token bridge.

Chains of an ecosystem without Arbitrum's token bridge only reach Arbitrum through LiFi. The supported chain ids, the root networks of the network list and their explorer URLs are read from those ecosystems' `chains`, so they need no per-chain entry. Built-in EVM chains do: `defaultRpcUrls` in `util/networks.ts` must have an entry for each of them, or the build fails.

### Balances share one cache

`useTokenBalances` fetches through the balance client of the chain's ecosystem and caches by chain, address and token. The source, destination, native currency and max-amount hooks read the same entries, so they don't fetch the same balance separately. The panel refreshes them once the source transaction confirms.

### The feature flag is checked once, at the ecosystem

`ecosystems.solana.isEnabled()` is the only Solana flag. It gates:

- address and transaction id validation (API data can pass `ignoreFeatureFlag`)
- whether `isSupportedChainId` accepts Solana
- the Solana LiFi pairs
- AppKit's Solana adapter and network

The flag is a build-time env var. Modules that read it at load time, such as the LiFi pair map, therefore see the same value for the whole session. With the flag off, Solana addresses are invalid, the chain is unsupported, and every handle resolves to the EVM wallet, so the bridge behaves as on master.

### The provider is there for tests too

The wallet layer is a React context instead of module-level hooks so tests can inject wallets. `createWalletTestWrapper` takes a `WalletContextValue` and query params, and `createBridgeTestWrapper` adds wagmi, React Query and the app store. A test describes the state, for example "Solana connected, EVM disconnected, source is Solana", and renders the real hooks and components. It doesn't need AppKit, a browser wallet or mocks of individual wagmi hooks.

The default context value is a set of disconnected handles. A component rendered outside the provider sees "no wallet" instead of crashing, and the default signers throw a "Connect a wallet" error if called.

## Boundaries

| Layer                | Knows about ecosystems                                  | Examples                                                                      |
| -------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `wallet/`            | Yes. One file or folder per ecosystem, plus registries  | `ecosystems/solana.ts`, `solana.tsx`, `balance/solana.ts`, `solana/appKit.ts` |
| `services/`, `util/` | Through records and `ecosystems` loops only             | `nativeCurrency.ts`, `AddressUtils.ts`, `AccountUtils.ts`                     |
| `token-bridge-sdk/`  | LiFi provider and source wait records, one LiFi starter | `LifiRouteExecutor.ts`, `LifiTransferStarter.ts`                              |
| components and hooks | No. Handles, helpers and capability checks only         | `NavWallet.tsx`, `NetworkWalletButton.tsx`, `Route.tsx`                       |

EVM-only routes (canonical bridge, CCTP, OFT) stay EVM-only. LiFi is the only route that crosses ecosystems.

## Consequences

**Adding an ecosystem** means:

- new files in the wallet layer: config, wallet hook, network, AppKit wiring, signer, balance client
- an entry in each typed record, which the compiler enforces
- network enablement for the chain itself: chain id, query slug, UI config, LiFi routes

The compiler checks every step except a few. It doesn't check the chain's UI config in `util/bridgeUiConfig.ts`, the RPC URL that LiFi's SDK uses for the chain in `AppProviders.tsx`, the env vars or the dependencies. It also can't check that the chain id equals LiFi's id for that chain. The query slug is checked: `types/ChainQueryParam.ts` keys its slugs by every non-Orbit `ChainId`.

**Two wallets** are visible in the UI. The header lists every connected wallet and offers to connect a wallet of each enabled ecosystem that isn't connected yet. Each network box shows its side's connected wallet. A user can connect only the source wallet and type a recipient instead of connecting the destination.

**Solana needs a keyed RPC.** LiFi sends and confirms Solana transactions through `solanaRpcUrl`, and its confirmation loop relies on `getBlockHeight`. The URL is `NEXT_PUBLIC_RPC_URL_SOLANA`, then Alchemy's Solana endpoint with `NEXT_PUBLIC_ALCHEMY_KEY_SOLANA` or `NEXT_PUBLIC_ALCHEMY_KEY` (the Alchemy app must have Solana enabled), then the rate-limited `api.mainnet-beta.solana.com`.

**Testing** relies on wallet injection and on module reloading for the load-time flag. Tests that flip the flag call `vi.resetModules()` and set the env var before importing.
