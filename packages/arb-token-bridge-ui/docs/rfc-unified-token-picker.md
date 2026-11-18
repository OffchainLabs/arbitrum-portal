# RFC: Unified token and network picker

Status: Draft for PM and engineering review. Created: 2026-11-18. Updated: 2026-11-19.

This RFC combines the registry PoC's data and routing model with the interaction design of the bridge prototype. It is the common proposal for what the picker does and how it gets its data.

Only decisions marked **Agreed** below reflect explicit agreement in this discussion. **Proposed** means a choice made while drafting this RFC, with its reason recorded. **Open** means PM or engineering still needs to decide. A proposed default does not close an open question.

## 1. References and scope

The technical baseline is [Token registry files for the bridge pickers](rfc-token-registry.md), the [PoC UI](../../app/src/app/token-registry-poc/top/TopTokensPoc.tsx), the [file contracts](../../app/src/token-registry/registryFiles.ts), and the [registry API implementation](../../app/src/token-registry/server/registryFiles.ts).

The technical review includes the local changes in the `token-poc-top` workspace on November 18, 2026, above commit `f37f836b`. Those changes are not all published. This draft does not claim that every proposed feature already exists in the PoC.

The UX reference is [milobooke/arbitrum-bridge-prototype at 7e3ee49](https://github.com/milobooke/arbitrum-bridge-prototype/tree/7e3ee49ef2e6a9ccceb106f95c0ab8e7e68695ac), specifically its [application bundle](https://github.com/milobooke/arbitrum-bridge-prototype/blob/7e3ee49ef2e6a9ccceb106f95c0ab8e7e68695ac/app.js) and [responsive styles](https://github.com/milobooke/arbitrum-bridge-prototype/blob/7e3ee49ef2e6a9ccceb106f95c0ab8e7e68695ac/styles.css). Its wallets, balances, quotes, imports, and transactions are simulated. The comparison includes source inspection and browser checks of the reference and wired PoC.

The agreed scope is the full demo interface and interactions, backed by real data. This includes the bridge form, picker, route cards, settings, recipient entry, review, progress, and session transaction history. The PoC uses the existing bridge SDK for approvals, transfers, and claims. Q7 is resolved; data coverage and production validation gaps are listed separately below.

The technical RFC remains the detailed reference for registry generation and migration. This document records the proposed UX changes and API additions. If approved, these choices must be reconciled into the technical RFC before implementation. The older `rfc-token-management-poc.md` describes an earlier design and is not the baseline for this proposal.

## 2. Shared direction

- Use one token-and-network picker on each side. Selecting USDC on Base chooses both values.
- Use our registry, real balances, and backend destination eligibility. The UX must not infer route support from token symbols.
- Use the prototype's search, recent selections, responsive layout, and contextual explanations as design references.
- In both lists, show held tokens first, then curated tokens, native tokens, and everything else.
- Keep lists public and cacheable. Fetch wallet data separately.
- Preserve the existing bridge URL parameters and runtime transfer behavior.

## 3. Proposed user experience

### Search tokens and networks together

| Input or action                          | Expected result                                                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search `base` in All networks            | Show tokens on Base and a Base network suggestion. Keep token-name matches distinguishable from the network suggestion.                            |
| Select the Base suggestion               | Apply the Base filter. Consume the network word so it does not continue filtering token names. Browsing a suggestion does not change the transfer. |
| Search `usdc base` or `base usdc`        | Find USDC matches on Base, independent of word order. Selecting the Base suggestion leaves `usdc` as the token query.                              |
| Search `usdc`                            | Find matching tokens across the allowed networks. Show the network on every result.                                                                |
| Search while Ethereum is selected        | Show Ethereum matches first and a separate On other networks section with relevant results. Provide Search all networks.                           |
| Search `base` while Ethereum is selected | Keep the visible Ethereum filter until the user selects Base. Show the Base suggestion and Base results in On other networks.                      |
| Paste a full address                     | Match the address exactly on the allowed networks. Never substitute a token because its symbol matches.                                            |
| Search for a token outside `top.json`    | Search the full registry through the API. Label incomplete results while that request is pending.                                                  |

The prototype does not fully implement the first example: a network-only query can suggest Base without returning all Base tokens. Returning those tokens is an explicit addition requested in this discussion.

Normalize case and whitespace. Match network names from supported chain metadata. Define any network aliases in shared data. A partial or ambiguous network name suggests possible networks without silently choosing one. Q3 covers ranking and ambiguous token-versus-network terms.

Destination search covers all registry networks. Selecting a destination keeps the current source when it can reach that exact token. Otherwise, the backend resolves a compatible source and the UI explains the change. If no valid source exists, keep the previous transfer and show the reason.

### Browse and rank tokens

The default order on both sides is held, curated, native, then everything else. A token appears once, in its highest-priority category. Non-held tokens retain the registry's cross-chain order rather than appearing in one large block per chain.

The published order already incorporates trading activity. Do not restore a volume column or download volume values just to recreate that order in the browser.

For search, the proposed rule preserves the current PoC: matching held tokens first, then match quality, then registry rank. This can put an exact non-curated match above a partial curated match. Q3 asks PM to confirm this exception to the default browsing order.

Held tokens outside the top list remain discoverable. Merge matching held tokens with public search results before display and deduplicate by chain and address. A public response capped at 50 results must not silently remove a matching held token. On the destination side, selecting a held token must resolve a valid source before the transfer changes.

### Recent selections

Show a Recent row above the list when the query is empty. Each shortcut identifies the token and network. Keep separate histories for source and destination, newest first, without duplicates.

The proposed default is four visible entries per side, stored for the current page session. Add an entry only after a user selects a token, not when a default is loaded. Recent shortcuts do not change the list's ranking.

Show recent shortcuts across network filters, as in the demo. Resolve a recent destination through the same backend selection check as any other destination. It may update the source when necessary. Q4 covers persistence and the final count.

### Token rows and balances

Show the symbol, name, token logo, network, token balance when known, and selected state. Label native assets as Gas token. Make the contract address available with copy and explorer actions that do not select the row.

The registry already represents each token by its chain and address. Two tokens with the same symbol remain separate results. Native tokens use the zero address within their chain.

Fiat values are in scope. The wired PoC reads prices from the existing LI.FI token registry, refreshed every minute. Missing prices display as unknown. A network total is shown only when every known holding on that network has a price. Holdings retain registry order within the held group; value-based ordering and price coverage remain choices for PM review. Raw amounts of different assets are never compared.

A failed balance request means balance unknown, not zero. Keep public token results visible and report partial chain failures. Refresh wallet data after account changes and successful transfers. Do not leave the PoC's disabled automatic revalidation as the production freshness policy.

### Destination variants and route information

Keep distinct destination assets, such as native USDC and bridged USDC.e, visible with their real names and provider information. A default does not hide the other eligible variants.

The proposed design uses labels on rows rather than a Same asset section above holdings. A same-asset label must come from backend-confirmed counterpart metadata. Canonical delivery alone does not justify claiming that two arbitrary tokens are interchangeable.

Provider labels describe supported transfer methods. They do not promise a live quote, a particular fee, or a delivery time. The bridge still requests live routes for the selected pair and amount.

### Selection, defaults, and changes to the other side

Browsing networks and typing into search are temporary picker state. Selecting a token commits its token and network together. Closing without a selection preserves the transfer.

The backend keeps a valid explicit destination, or its eligible counterpart on a newly selected destination chain. Otherwise it uses the existing default order: configured override, source counterpart, canonical destination, LayerZero destination, then native token. Every candidate must be eligible.

Source and destination selections close the picker and return focus to the amount, matching the demo. The backend resolves any required change to the other side, and the form explains it. Each side remembers its browsing filter. Q1 is resolved by the full-demo instruction.

A destination choice may change the source when the current source cannot reach it. This behavior is agreed. Network filters stay enabled. Selecting a token asks the backend to preserve the exact requested destination and resolve a valid source, then updates both sides together. Show the old and new source with the reason. A failed lookup leaves the transfer unchanged. The fallback source preference is proposed: keep the current source network where possible, then prefer the destination parent network, confirmed counterparts, and registry rank. Every candidate must pass the forward route rules.

If a source change causes a destination fallback, show the old and new destination with the reason. Preserve the user's amount only when it still refers to the same source asset. Clear obsolete quotes and revalidate the new selection before continuing. Duplicate selections and direction reversal also go through backend eligibility checks, because routes can be one-way.

### Desktop, mobile, and keyboard behavior

Use a network sidebar on desktop and compact network chips on mobile. Keep search and recent selections visible while scrolling through tokens. Retain list virtualization for large results.

Focus search when opening the picker. Arrow keys move through results, Enter selects, and Escape clears a non-empty query before closing. On close, return focus to the amount, matching the demo. Keyboard selection must remain on the same token when late search or balance responses change the list.

Use accessible dialog and listbox semantics, a visible focus indicator, and an announced active option. Check the mobile layout with the keyboard open and respect reduced-motion settings. The prototype is a visual reference, not proof that these accessibility requirements already pass.

### Loading, errors, and imports

Show available local results immediately while a remote search runs. Distinguish loading, no matches, a failed request, and a truncated result set. Offer retry or a narrower search when appropriate. Never show No matches solely because a request failed.

A pasted unknown address uses real metadata lookup and supported import behavior. Identify the lookup network and require a deliberate selection. Do not invent a symbol, decimals, address, counterpart, or route.

The local PoC looks up unknown addresses on the selected chain, or on Ethereum, Arbitrum One, and Base in All networks. Preserve that bounded lookup initially and let users choose another supported network explicitly. Metadata discovery alone does not establish transfer eligibility.

Keep the existing imported-token warning. The prototype also has verification flags for listed tokens, which our top-file contract does not have. Q6 covers those flags and the product meaning of Unverified. Absence of an imported flag is not evidence that a token is safe.

## 4. Technical contract

### Data ownership

| Owner                   | Responsibility                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry job            | Chain and token metadata, curated rank, counterparts, canonical relationships, LiFi participation, and generated OFT restrictions.             |
| Portal API              | Eligible destinations, default selection, portal block rules, real import resolution, full-registry search, and uncached wallet balance reads. |
| Picker                  | Temporary query and network filter, recent selections, rendering, keyboard state, and held-first ordering using separately loaded balances.    |
| Existing bridge runtime | Live quotes, approvals, wallet network switching, transfer construction, submission, history, and claims.                                      |

Keep `index.json`, `chains/<id>.json`, and `top.json`. Keep object-shaped JSON and logo URLs. `top.json` contains up to 1,000 tokens per chain, not a global cap of 1,000.

Keep the four current endpoint responsibilities:

| Endpoint                                       | Contract retained                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/api/token-registry/files/selection`          | Resolve source, reachable destination chains, defaults, and the preferred destination.    |
| `/api/token-registry/files/destination-tokens` | Return eligible destination tokens and providers, optionally filtered by chain and query. |
| `/api/token-registry/files/search`             | Search the full registry and resolve supported unknown-address lookups.                   |
| `/api/token-registry/files/balances`           | Return held tokens and partial chain failures. Keep `private, no-store`.                  |

A disconnected initial page needs only the small selection response for token discovery. Load the top list on source-picker intent, and destination lists on demand. A connected wallet may request balances separately. Keep the current 250 ms search debounce as the starting point.

Keep local and server search semantics identical. Local results are provisional when the loaded list is incomplete. Preserve the existing completeness signal and result limits initially. A two-character threshold may delay full source search, but the UI must not present a one-character local search as exhaustive.

Public files and public API responses remain wallet-independent. Merge balances and recents in the client. A late response for an earlier source, query, or filter must not replace current results. Changing the account clears the previous account's balance display immediately.

### Additions required by the UX

These are proposed implementation tasks, not fields already supplied by the PoC:

- Make supported network names and aliases available to both local and server search. Do not add a second hardcoded chain list to the picker.
- Extend matching to token-plus-network queries and network-only queries. Expose network suggestions separately from token results.
- Support scoped matches and On other networks results with clear completeness information. Destination selections from either section use the same backend source-resolution rules.
- Merge locally known held matches with remote results. Define a wallet-independent eligibility lookup for held destinations not present in a capped response.
- Expose confirmed counterpart identity if the UI shows a same-asset label. Current `DestinationOption` provider IDs are not enough to derive it.
- Provide a reason when selection resolution changes a requested destination. Do not duplicate backend default rules in UI copy logic.
- Preserve import provenance in every display path that needs a warning, including recents. Resolve verification semantics before adding a general verification badge.
- Validate external registry files and request inputs at the boundary before production use. The PoC's type assertions do not provide runtime validation.

Choose the exact additive response fields during implementation review. These additions must not change the meaning of existing fields without a contract version change.

### Caching and freshness

Retain the technical RFC's separation between file caching, API response caching, canonical-import caching, and private balances. An hourly generator does not mean every browser sees updates within one hour: CDN, Next, and API caches can each serve older data.

Do not describe a redeploy as a guaranteed cache reset. Version file contracts when their meaning changes. Q8 covers the acceptable age of ranking and eligibility data, consistency between browser and API snapshots, and how urgent route blocks bypass cached responses. The UI must tolerate a token in `top.json` no longer being eligible when the API resolves it.

### Payload format decision

Keep the current format. On the November 18 top-file snapshot, array encoding saved only about 3 to 5 KB in local Brotli tests. Replacing logo URLs with numeric sprite indexes saved about 36 to 43 KB of JSON, but those measurements exclude the replacement images. A shared URL dictionary increased the compressed size. These are experimental results, not a committed performance target.

There is no proven total-download benefit that justifies adding tuple decoding or sprite generation to this work. Keep volume out of the picker payload and use the published ordering.

## 5. Differences and decisions

This register covers the behavior and technical differences identified in the reviewed picker and bridge flows. The full interface is in scope. Differences caused by real data or unsupported backend capabilities remain explicit.

| ID  | Difference                                                                                                                                                                 | Decision and reason                                                                                                                                                            | Status                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| D01 | Our PoC uses registry files and real APIs; the prototype uses a static snapshot and simulated transfers.                                                                   | Use our technical foundation and the prototype as the UX reference.                                                                                                            | Agreed                                                         |
| D02 | The reference publishes a bundled application, while our PoC uses maintained TypeScript.                                                                                   | Port the demo styles and interaction structure into React components, using the existing SDK and registry APIs.                                                                | Implemented choice                                             |
| D03 | Our order is held, curated, native, remainder. The prototype has native-before-pins scoring and a destination same-asset group above holdings.                             | Keep our agreed list order on both sides. Use counterpart labels without an extra top-ranked section.                                                                          | Agreed order; proposed labels                                  |
| D04 | Our top list is capped per chain. The prototype also uses a global most-traded list in All networks.                                                                       | Keep the per-chain coverage and existing cross-chain rank so smaller chains remain represented.                                                                                | Proposed                                                       |
| D05 | Our search matches a whole token query. The prototype splits words and also recognizes network names. Network-only search still requires a token-word match in its bundle. | Add mixed search and the requested `base` behavior. Confirm ambiguity and search ordering in Q3.                                                                               | Proposed; Q3 open                                              |
| D06 | Our search uses public server results with a cap. The prototype searches its loaded snapshot and applies wallet-value scoring.                                             | Keep full-registry server search and merge held matches locally. Never send a wallet address to public search to rank results.                                                 | Proposed                                                       |
| D07 | The prototype shows other-network results. Our picker filters to one chain or all chains.                                                                                  | Add a separate section without silently changing the active filter. Resolve a valid source on selection in both sections.                                                      | Proposed                                                       |
| D08 | The demo has recent selections across filters; the original PoC had none.                                                                                                  | Keep four visible recent selections per side for the page session, across filters. Revalidate destination selections.                                                          | Implemented; production retention open, Q4                     |
| D09 | The demo contains static prices and sorts holdings by dollar value.                                                                                                        | Use live LI.FI prices for fiat values. Keep unknown prices unknown and preserve registry order within holdings for now.                                                        | Fiat in scope; source and ordering proposed, Q5                |
| D10 | The original PoC opened the destination picker after a source change.                                                                                                      | Return to the form and focus the amount after either selection, as in the demo. Explain backend adjustments.                                                                   | Agreed, Q1 resolved                                            |
| D11 | The original PoC restricted destinations to the current source. The prototype adjusts the source when necessary.                                                           | Allow destination-first selection. Preserve a compatible source; otherwise resolve a valid replacement and explain the change. Source preference order remains a draft choice. | Agreed behavior; proposed preference order                     |
| D12 | Defaults in our PoC use explicit preferences, counterpart metadata, and configured overrides. The prototype uses symbol aliases and heuristics.                            | Keep backend defaults, including current Robinhood rules. Preserve a valid user preference and explain fallbacks.                                                              | Proposed                                                       |
| D13 | The prototype can generate synthetic counterpart addresses. Our API resolves real canonical relationships and imports.                                                     | Never use synthetic identities or symbol equality as proof of a route or counterpart.                                                                                          | Proposed                                                       |
| D14 | The prototype invents imported metadata and a network when needed. Our lookup reads real metadata on bounded networks.                                                     | Keep real lookup and name the network. Include Base from the current local PoC; the existing technical RFC still mentions only Ethereum and Arbitrum One.                      | Proposed                                                       |
| D15 | Prototype verification flags cover listed tokens and curated pins. Our warning currently describes imported tokens only.                                                   | Preserve import provenance. Do not translate registry membership into a safety claim.                                                                                          | Open, Q6                                                       |
| D16 | The demo simulates EVM and Solana wallets. The PoC registry and selection APIs use EVM identities.                                                                         | Use real AppKit EVM connection. Solana requires extending registry identities and selection APIs; do not add a simulated wallet or fake token rows.                            | Implementation gap, Q9                                         |
| D17 | The prototype offers same-chain swaps and reverses some identical selections automatically. Our registry defines directional supported pairs.                              | Do not infer a swap or reverse route. Keep current supported pairs and revalidate any direction change.                                                                        | Proposed                                                       |
| D18 | Prototype provider chips include CCTP and simulated route recommendations. Our picker contract exposes canonical, LayerZero, and LiFi.                                     | Preserve real runtime provider behavior. Do not add a provider because a demo displays it. Reconcile CCTP labeling with existing runtime routes before release.                | Proposed                                                       |
| D19 | The original PoC stopped at selection. The demo has routes, review, progress, and history.                                                                                 | Port the whole interface. Read live quotes and prices, invoke existing approval/transfer SDKs, and derive status from receipts or provider execution updates.                  | Agreed full interface, Q7 resolved                             |
| D20 | The demo replaces the form with a picker and uses a mobile sheet.                                                                                                          | Use its CSS dimensions and responsive behavior, including inline desktop picker, mobile chips, recents, and keyboard navigation.                                               | Implemented; physical keyboard and accessibility review remain |
| D21 | Prototype loading delays are simulated. Our results can arrive late, fail, or be incomplete.                                                                               | Drive loading from real requests. Keep stale responses from changing current selection and preserve partial balance failures.                                                  | Proposed                                                       |
| D22 | The prototype uses tuples, numeric logo indexes, and packed flags. Our files use objects and logo URLs.                                                                    | Keep our file format because measured transfer savings are small or exclude image cost.                                                                                        | Proposed                                                       |
| D23 | The demo snapshot contains prices, market cap, and volume. Our published top file has metadata and rank only.                                                              | Use live prices separately. Keep the published rank. Do not invent volume, market cap, verification flags, or Popular group boundaries absent from metadata.                   | Implemented choice; data coverage open                         |
| D24 | The prototype loads its snapshot before rendering. Our PoC loads selection first and lists on demand.                                                                      | Keep on-demand loading, public caches, and separate private balances. Preserve URL parameters.                                                                                 | Proposed                                                       |
| D25 | The demo hardcodes network groups and warnings.                                                                                                                            | Derive networks from the index and group child chains using parentChainId. Reuse real Nova restrictions. Featured-network groups need authoritative metadata.                  | Implemented choice                                             |
| D26 | The prototype has a fixed snapshot. Our browser and API can observe different cached registry versions.                                                                    | Keep backend resolution authoritative and define the freshness policy before production rollout.                                                                               | Open, Q8                                                       |
| D27 | Custom user-added chains are supported elsewhere in the bridge but are not fully covered by this registry picker.                                                          | Preserve existing custom-chain behavior until its replacement is specified and tested. Do not remove it as incidental cleanup.                                                 | Open, Q9                                                       |
| D28 | The PoC suppresses automatic SWR revalidation. The prototype balances never need real refresh.                                                                             | Refresh balances after wallet changes and transfers, and define periodic freshness during implementation.                                                                      | Proposed                                                       |
| D29 | A destination-chain control in the PoC can update the selection and URL immediately. The prototype's network rail filters the picker before a token is selected.           | Treat picker network changes as browsing. Commit token and network together on token selection, so closing the picker cancels unfinished browsing.                             | Proposed                                                       |
| D30 | The demo can retain an amount after changing source assets.                                                                                                                | Clear the amount when source identity changes. Discard old quotes, bind review to a quote snapshot, and reject an expired quote or changed signing account.                    | Implemented choice                                             |

## 6. Decisions still needed

Q1, Q2, and Q7 are resolved. Selections return to the form; destination choices may adjust the source; the full demo interface is in scope. The user reconfirmed held → curated → native → rest on both sides on November 19. Source fallback preferences remain an implementation choice.

| ID  | Owner                     | Decision needed                                                                                                      | Draft recommendation and consequence                                                                                                                                                                                            |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q3  | PM and engineering        | Should relevance outrank curated/native priority during search? How should ambiguous network and token names behave? | Keep held matches first, then relevance, then registry rank. Recognize an exact network query such as `base`; keep ambiguous matches visible with explicit network suggestions. Confirm ordering within holdings as part of Q5. |
| Q4  | PM and design             | How many recents, and should they survive page reloads or wallet changes?                                            | Start with four entries per side for the page session. Longer persistence needs a retention and account-switch policy. Revalidate destinations under either choice.                                                             |
| Q5  | PM and engineering        | Which live price source and missing-price policy should ship? Should holdings sort by value within the held group?   | Fiat display is in scope. The PoC uses LI.FI prices, omits incomplete totals, and keeps registry order within holdings.                                                                                                         |
| Q6  | PM and engineering        | What does Unverified mean, which source supplies it, and which warnings require acknowledgement?                     | Keep the existing imported-token warning and production warning flows. Define a separate contract before labeling listed tokens as verified or unverified.                                                                      |
| Q8  | Engineering with PM input | How stale may rankings and eligibility be? How are urgent blocks applied, and must browser/API snapshots be atomic?  | Separate ranking freshness from eligibility freshness. Define invalidation or revalidation for urgent blocks before launch. Do not promise that an hourly job provides hourly end-to-end freshness.                             |
| Q9  | Engineering and PM        | How do Solana, same-chain swaps, standalone CCTP, and custom-chain onboarding enter the registry model?              | Extend authoritative identities and eligibility before showing these capabilities. The full UX scope is agreed; current backend coverage is not equivalent to the simulated demo.                                               |

## 7. Acceptance criteria

Use fixed registry and wallet fixtures for behavior checks. Use a live environment separately to verify cache headers and real API integration. These criteria describe work to prove during implementation; they are not results of this RFC draft.

| Scenario                                               | Required outcome                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search `base`                                          | Base suggestion plus tokens on Base. Selecting the suggestion changes only the picker filter.                                                           |
| Search `usdc base` and `base usdc`                     | Equivalent eligible token matches on Base. Selecting Base preserves the remaining token query.                                                          |
| Ethereum filter with a Base match                      | Separate other-network section. Clear network labels and no silent filter change.                                                                       |
| Default browsing on either side                        | Held, curated, native, remainder; deduplicated across chains and categories.                                                                            |
| Held token outside the top file or public search cap   | Matching source token remains discoverable. A destination selection must resolve a valid source before updating the transfer.                           |
| Search beyond the per-chain top limit                  | Full registry search finds the token. A capped result explains that more matches exist.                                                                 |
| Recent selection after source change                   | Resolve the requested destination and preserve or adjust the source. Keep chain and address identity exact.                                             |
| USDC and USDC.e destinations                           | Both appear when eligible, with accurate provider and counterpart information.                                                                          |
| Same symbol on unrelated contracts                     | No inferred equivalence or fabricated canonical route.                                                                                                  |
| Change source with an explicit destination             | Preserve it when valid; otherwise follow the agreed fallback UX and explain the change.                                                                 |
| Choose a destination unsupported by the current source | Keep the requested destination and resolve a compatible source. Explain any source change. If no route exists, keep the previous transfer and show why. |
| Unknown address                                        | Real metadata on an identified network, correct provenance warning, and independent route validation.                                                   |
| One balance RPC fails                                  | Other balances render. The failed chain is unknown, not shown as zero or empty holdings.                                                                |
| Wallet changes during a request                        | Old account balances never appear under the new account.                                                                                                |
| Search or source changes during a request              | Late responses cannot overwrite the active query, selection, or keyboard target.                                                                        |
| URL load, refresh, and navigation                      | Preserve supported query parameters and resolve the same valid token identities.                                                                        |
| Desktop, mobile keyboard, and keyboard-only use        | Network filtering, recents, search, selection, focus restoration, and escape behavior work without losing access to controls.                           |
| Import or block rules                                  | Transfer-disabled, withdraw-only, OFT, and existing warning behavior remain enforced.                                                                   |
| Route and transaction integration                      | Correct source and destination feed real quotes, approvals, transfers, and claims; no simulated values enter execution.                                 |
| Initial loading and caching                            | No full registry download on initial disconnected load. Public responses contain no wallet-specific ranking; balances remain private.                   |
| Registry update or urgent block                        | The approved Q8 policy holds even when browser and API caches differ.                                                                                   |
| Custom-chain navigation                                | Existing supported behavior still works until an approved replacement is available.                                                                     |

## 8. Delivery and reconciliation

1. Review the proposed choices and resolve the open questions that affect first-release scope. Record the approver and date in this document.
2. Reconcile the technical RFC with this decision register. In particular, update mixed search, import lookup networks, post-selection flow, freshness, and provider-label coverage.
3. Implement and verify shared search semantics and the required API additions before wiring the new picker. Keep fixtures for the differences above.
4. Build the responsive picker, recents, and keyboard behavior against those contracts. Exercise the acceptance scenarios on both sides.
5. Integrate with real bridge selection and quote state. Verify existing approval, warning, custom-chain, and claim behavior before removing any old token-management code.
6. Remove replaced production callers once the new path passes acceptance. Do not introduce a permanent duplicate token model.

This RFC does not authorize a production deployment or declare PM approval. It provides the shared behavior, technical boundaries, and decision record for that review.

## 9. Wired PoC and verification

The PoC is at `/token-registry-poc/top` in the `token-poc-top` workspace. It ports the demo's full layout while keeping network and token identities in the registry model.

### Connected behavior

- The picker replaces the bridge form on desktop and becomes a sheet on mobile. Each side remembers its filter. Search recognizes network names and mixed queries, offers network suggestions, and searches the full registry beyond the top list. Recents, keyboard selection, copy, and explorer actions use real token identities.
- Both lists retain held → curated → native → rest. No Same asset section precedes holdings. The published top-file order supplies curated/native ordering; it does not expose group boundaries for a separate Popular heading.
- Destination selection calls the backend resolver. A compatible source stays selected; otherwise the backend returns a valid replacement and the UI explains it. Neither symbols nor reverse-route assumptions establish support.
- Wallet connection uses the existing AppKit instance. Portfolio inspection remains read-only under Prototype notes. The transfer form reads the connected account's selected-token balances directly, so an inspected address cannot supply spendable funds.
- Prices come from the existing LI.FI registry through `/api/token-registry/files/prices`. Quotes come from the real LI.FI endpoint and canonical/LayerZero SDK estimates. Quotes refresh every 30 seconds on the form. Unknown fees and prices stay unknown.
- Settings use the demo popover. Auto slippage currently maps to the existing 0.5% default; this is an explicit implementation choice. Route priority changes the default selection. A custom recipient is included in the quote and execution request.
- Max reserves estimated source-paid gas with the existing 40% buffer and provider fees. Native deposits include retryable costs; custom gas-token deposits include child gas paid in the bridged token. Nova uses the existing ETH-only amount limit. A changed selection invalidates an in-flight Max calculation.
- Review captures the exact quote and recipient. Confirm invokes existing SDK approval and transfer methods. The adapter checks the signing account, prevents duplicate starts, and rejects quotes older than 90 seconds. This expiry is a PoC choice, not a provider guarantee.
- Progress comes from source receipts, Arbitrum messages, LayerZero status, or LI.FI execution updates. A timer never marks a transfer complete. Canonical withdrawals expose Claim only when the message is confirmed. LI.FI failures with execution state expose Resume. RPC outages retain the last confirmed state and show a retry message.
- Txns contains transfers started in the current page session. Reload clears this session history, matching the demo's in-memory history model. Production recovery across reloads remains necessary before release.

### Remaining differences and gaps

- The registry supplies EVM chains. The demo's simulated Solana flow, same-chain swaps, custom-chain onboarding, and standalone CCTP option are not yet covered by this registry integration. Actual LI.FI routes can name their underlying providers. No simulated route is added to fill a visual slot.
- Network groups use parent-chain metadata rather than the demo's handpicked featured networks. Token logos use registry URLs rather than sprite indexes. Holdings keep stable registry order within their group; the demo sorts them by dollar value.
- General verification flags, volume, market cap, and curated-group boundaries are absent from the current file contract. Imported tokens show provenance warnings. Missing fields are not fabricated.
- AppKit provides the actual connection/account dialogs. Their contents depend on installed wallets and differ from the demo's simulated EVM/Solana buttons. The surrounding nav and connected-account control follow the reference layout.
- The port invokes existing SDKs directly with explicit source/destination addresses. This proves an integration path; it does not establish parity with every warning, smart-contract-wallet flow, fee check, and recovery path in the production TransferPanel. Those need a production integration review.

### Observed checks

Headless Chrome checks used the running Next application and live APIs. Search results, prices, destination responses, and provider quotes were not mocked.

- Desktop and mobile form/picker layouts, Base search and suggestion, remembered filters, settings, route cards, empty transaction history, and navigation passed. Mobile width was 390 pixels; desktop width was 1440 pixels.
- A live 0.1 ETH Ethereum → Arbitrum query returned the canonical bridge and LI.FI routes through Layerswap and Relay. Amounts, costs, providers, and availability can change on subsequent requests.
- Live checks of the new interface also passed destination-first Xai selection, source-change explanations, URL reload, read-only holdings, held-first ordering on both sides, recents, and account clearing.
- Amount tests cover integer precision beyond JavaScript's safe integer range, decimal rejection, fee reservation, and unknown fiat prices.
- An injected read-only test wallet passed AppKit connection, live account balance reads, live canonical quotes, recipient validation, review, and transaction rejection. The SDK reached `eth_sendTransaction`; the test connector rejected it before signing, and the UI showed the error without inventing a transaction hash. No approvals, transfers, or claims were submitted. Successful signing, cross-chain completion, claim, resume, and production warning parity still require wallet-based acceptance tests. Physical mobile keyboards and screen readers were not tested.
- All 304 app tests passed. Repository type checking and ESLint on the changed code passed.
- The earlier full repository test command reached 1,330 passing bridge tests and eight failing subgraph tests requiring `localhost:3000`; the PoC server uses 3017. It stopped before integration tests. Do not count that run as a full pass.

### Test it locally

1. In `token-poc-top`, run `mise exec -- pnpm --filter app run css:build`.
2. Run `mise exec -- pnpm --filter app exec next dev --port 3017` and open `http://localhost:3017/token-registry-poc/top`.
3. Search `base` and `usdc base`, select a network suggestion and token, and reopen the picker to check its filter and recents.
4. Select Xai native XAI as the destination from Ethereum ETH. Confirm the source changes to the backend-resolved Arbitrum XAI and that the form explains why.
5. Open Prototype notes to inspect a real address or API responses. Inspection does not connect a signing wallet.
6. Enter an amount to compare live routes. Use Bridge settings to change priority and slippage. Connect a wallet to check balance-aware amounts, custom recipients, and review.
7. Treat Confirm as a real wallet transaction flow. Approvals and transfers require wallet confirmation; they are not demo animations.
