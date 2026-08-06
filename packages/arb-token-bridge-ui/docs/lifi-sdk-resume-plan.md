# LiFi SDK Execution and Resume Plan

## Goal

Move LiFi execution control behind the bridge boundary instead of driving LiFi transactions directly from the UI. The UI should start a transfer through `TransferStarter`, store resume data only after an actual source-chain transaction exists, and recover ongoing transfers from LiFi status/history plus local route state.

## Phase 1: SDK Boundary and Local Resume

Status: implemented.

Use LiFi SDK execution at the `LifiTransferStarter` boundary:

- `TransferPanel` creates a `LifiTransferStarter` with the selected LiFi route.
- `LifiTransferStarter` configures the LiFi EVM provider from wagmi.
- `LifiTransferStarter.transfer` calls LiFi SDK `executeRoute`.
- Approval handling is delegated to LiFi SDK.
- The UI no longer fetches or submits `getStepTransaction` manually.

Persist route state only after source transaction execution:

- Approval-only activity is not stored.
- A route with no actual source-chain transaction hash can be dropped.
- Once LiFi reports a route execution tx hash, the transfer is added to pending history and the existing LiFi localStorage cache.
- The saved cache entry includes `lifiRoute` so the route can be resumed.
- Existing localStorage entries are carried forward by the cache migration, but old entries without `lifiRoute` are not resumable.

Resume through the same boundary:

- Transaction history shows Resume only for pending LiFi transfers with a saved multi-step route.
- Resume constructs `LifiTransferStarter` from the cached transaction and calls LiFi SDK `resumeRoute`.
- Route updates from resume are written back to the existing LiFi transaction cache.

Status state:

- Do not add a separate `lifiRouteExecutionStatus`.
- Use existing `status` and `destinationStatus` for transaction history state.
- Use the saved `lifiRoute` only for route execution/resume state.

## Recovery Rules

Local route state is useful only when all of these are true:

- The transaction is LiFi.
- The transaction has a source-chain tx hash.
- The transaction is still pending according to existing status fields.
- The cached LiFi route has more than one step.

LiFi status/history remains the source of truth for transaction status:

- `getTransactionHistory` can reconstruct transaction rows from LiFi backend state.
- `getStatus` updates pending LiFi rows by source tx hash, tool, source chain, and destination chain.
- Locally cached route metadata is merged into API/history transactions when the tx hashes match.

## Phase 2: Multi-Step Route Support

Status: implemented.

Enable LiFi multi-step routes and keep recovery behavior explicit when local route state and LiFi status state diverge:

- Enable `allowSwitchChain` and `allowDestinationCall` in LiFi route requests.
- Return and select from all LiFi routes, including routes with more than one step.
- Store all step tool details in route protocol data while keeping the compact route UI on the first tool.
- Add a `Multi-step` badge for routes with more than one LiFi step.
- Represent route `gas` and `fee` as arrays. Single-step routes have one item, and multi-step routes include costs across all steps.
- Use route boundary amounts: first step input as `fromAmount`, last step output as `toAmount`, and summed step durations.
- Update warnings and readiness checks to consume gas/fee arrays.
- Check LiFi native gas requirements separately on source and destination chains.
- Keep API/status data authoritative for `status`, `destinationStatus`, `destinationTxId`, and explorer link.
- Keep local cache authoritative only for `lifiRoute`.
- Persist the latest LiFi `RouteExtended` after route execution updates once a source tx exists, so resume uses LiFi's exact execution/process state.
- Hide Resume when LiFi status says the transfer is terminal.
- Hide Resume when the local route is absent, single-step, or no longer has actionable remaining steps.
- Preserve route metadata across status refreshes while avoiding duplicate transaction rows.

Phase 2 coverage:

- LiFi requests enable multi-step execution options.
- Multi-step parsing includes all step costs, all tools, final output amount, and summed duration.
- Gas estimates aggregate by source and destination chain at the starter boundary.
- Native route costs stay separated by chain for readiness checks.
- Cached `lifiRoute` survives when LiFi API/history returns a newer status for the same tx.
- API/history status remains authoritative for merged LiFi rows.
- Terminal LiFi transactions do not show Resume even if a cached multi-step route exists.

Open questions for phase 2:

- Whether to expose a different UI action when LiFi status is pending but no local route is available.
- Whether to add telemetry for resume attempts, resume success, and resume failure.
- Whether to prune cached `lifiRoute` once LiFi status reaches a terminal state.
