# PR19 Latest Review Comments (Last 4 Days)

Generated at: `2026-03-30T12:06:12Z`
PR: `#19` `feat(earn): [4/5] LiFi Integration`
Window: comments created at or after `2026-03-26T12:06:12Z`

## Snapshot

- 27 review comments matched the window.
- All 27 were created on `2026-03-27`.
- No newer review comments were found on `2026-03-28`, `2026-03-29`, or `2026-03-30` before the snapshot time.
- Highest concentration is in `packages/app/src/components/earn/LiquidStakingActionPanel.tsx` (`14` comments).
- Three comments are `bump` replies on older unresolved threads. Those are recorded here with the older thread context so they are actionable.
- Later addressed in PR4 commit `de3bde649`:
  `3000056663`, `3000062401`, `3000067086`, `3000070600`, `3000214435`, `3000662473`, `3000728820`, `3000737411`.

## Working Checklist

### `packages/arb-token-bridge-ui/src/util/NumberUtils.ts`

- [x] `3000035029` at `:179`: reviewer asked to reuse `truncateExtraDecimals` instead of duplicating similar trimming logic. Addressed in working tree by deleting the unused `normalizeAmountForParseUnits` helper and keeping `truncateExtraDecimals` as the shared util.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000035029>

### `packages/arb-token-bridge-ui/src/app/api/crosschain-transfers/lifi.ts`

- [x] `3000045925` at `:1`: reviewer questioned whether this file needs any changes at all. Resolved for this PR by keeping the reusable `getLifiRoutes` abstraction and explicitly not switching earn over to an internal API-to-API call. Shared service extraction is deferred to follow-up work.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000045925>

### `packages/app/src/lib/earn/utils.ts`

- [x] `3000056663` at `:65`: use `addressesEqual` when matching `LIQUID_STAKING_OPPORTUNITIES` by token address. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000056663>

### `packages/app/src/hooks/earn/useTransactionQuote.ts`

- [x] `3000062401` at `:101`: keep the variable in the SWR key; reviewer does not want data that is not part of the key. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000062401>

### `packages/app/src/components/earn/MyPositionsPage.tsx`

- [x] `3000067086` at `:76`: simplify the projected earnings fallback to `positionData.projectedEarningsUsd ? positionData.projectedEarningsUsd : null`. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000067086>

### `packages/app/src/components/earn/LiquidStakingDetailPage.tsx`

- [x] `3000070600` at `:44`: reviewer questioned lowercasing plus `getAddress` normalization in the same path; likely remove redundant address normalization. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000070600>

### `packages/app/src/components/earn/LiquidStakingActionPanel.tsx`

- [x] `3000214435` at `:61`: reuse `EarnTokenOption` directly instead of introducing a parallel type. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000214435>
- [x] `3000216864` at `:79`: reuse the existing helper from `VaultActionPanel` instead of duplicating it here. Addressed in working tree by moving `normalizeTokenAddress` into `app/lib/earn/utils.ts` and reusing it from both action panels.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000216864>
- [x] `3000252768`, `3000258794` at `:208`: stop using `useEffect` to sync props into local state; reviewer suggests lifting `selectedAction` or tightening initialization, and folding the second effect into the same cleanup. Addressed in working tree by initializing `selectedAction` from `initialAction` once and resetting local state in the action-change handler instead of syncing via effects.  
  Links: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000252768>, <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000258794>
- [x] `3000270376` at `:237`: normalize liquid staking data before it reaches the component, ideally in the API or the fetch hook. Addressed in working tree by moving quote shaping into `useLiquidStakingQuote`, which returns normalized liquid-staking quote data to the component.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000270376>
- [ ] `3000505711` at `:248`: reviewer prefers using Radix Tabs directly instead of the current wrapper.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000505711>
- [x] `3000520688` at `:262`: allow any input amount and convert to raw units, instead of rejecting values up front. Addressed in working tree by removing upfront decimal truncation from `EarnActionPanelInput` and leaving raw-unit conversion to the quote/transaction path.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000520688>
- [ ] `3000524104` at `:375`: reviewer thinks this code path is unnecessary and should be removed.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000524104>
- [x] `3000531339` at `:396`: remove alias variables that only rename the same values. Addressed in working tree by removing the rename-only locals in `handleTransactionSuccess` and using the source values directly.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000531339>
- [x] `3000536499` at `:418`: move the selected-action-derived asset/history logic into a utility. Addressed in working tree by moving the liquid-staking history/input asset shaping into `getLiquidStakingHistoryValues` in `app/lib/earn/utils.ts`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000536499>
- [x] `3000545259` at `:460`: reviewer wants SWR optimistic updates here and called out missing failed-transaction handling. Addressed in working tree by moving liquid-staking history mutation into the SWR-backed history/success hooks and only inserting the history row after `useEarnTransactionExecution` finishes with a confirmed receipt, so failed transactions are not added.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000545259>
- [x] `3000637722` at `:523`: shift this handling down into the API or hook layer instead of keeping it in the component. Addressed in working tree by moving liquid-staking transaction success, popup details, analytics, and optimistic history handling into `useLiquidStakingTransactionSuccess`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000637722>
- [ ] `3000648560` at `:699`: reuse the existing dialog support instead of rebuilding dialog behavior in this file.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000648560>
- [ ] `3000656919` at `:1`: broad refactor request to split this file into smaller buy/sell pieces and move more logic into hooks or APIs.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000656919>

### `packages/app/src/components/earn/AllOpportunitiesPage.tsx`

- [x] `3000662473` at `:54`: simplify projected earnings fallback to `positionData.projectedEarningsUsd ? positionData.projectedEarningsUsd : null`. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000662473>

### `packages/app/src/app/api/onchain-actions/v1/earn/opportunity/[category]/[id]/transaction-quote/route.ts`

- [x] `3000666298` at `:154`: reviewer asked whether the behavior should be passed as SWR options instead. Addressed in working tree by removing the route-level quote cache and relying on SWR refresh behavior in `useTransactionQuote`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000666298>

### `packages/app/src/app/api/onchain-actions/v1/earn/adapters/LiFiAdapter.ts`

- [x] `3000668730` at `:60`: `bump` on older thread `2866001670`. Underlying ask: quote refresh cadence should prevent the quote-expiry errors seen here. Addressed in working tree by removing the route-level cache and adding periodic SWR quote refresh while the user has an active quote.  
  Links: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000668730>, <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r2866001670>
- [x] `3000669486` at `:85`: `bump` on older thread `2866010329`. Underlying ask: the adapter should not call `getLifiRoutes` directly; reviewer wants this to go through the API path. Resolved for this PR by deciding not to introduce internal API-to-API calls and by keeping the existing helper abstraction until shared service extraction is done in follow-up work.  
  Links: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000669486>, <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r2866010329>
- [x] `3000712922` at `:416`: reviewer thinks this code is unnecessary and should be removed. Addressed in working tree by dropping the unnecessary empty-string fallbacks for optional LiFi icon fields in `transformToStandard`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000712922>

### `packages/app/src/app/api/onchain-actions/v1/earn/lib/lifiQuote.ts`

- [x] `3000716935` at `:8`: `bump` on older thread `2866087113`. Underlying ask: reuse the existing similar type instead of creating a new one here. Addressed in working tree by reusing LiFi SDK types in `lifiQuote.ts` instead of maintaining local duplicate shapes.  
  Links: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000716935>, <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r2866087113>

### `packages/app/src/app/api/onchain-actions/v1/earn/lib/lifiTransactions.ts`

- [x] `3000728820` at `:60`: use `addressesEqual` instead of manual address comparison. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000728820>
- [x] `3000737411` at `:119`: same ask as above on the second address comparison site. Addressed in `de3bde649`.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#discussion_r3000737411>

## Suggested Order

- Start with the focused correctness and cleanup items outside `LiquidStakingActionPanel`.
- Then handle the `LiquidStakingActionPanel` comments in one pass, because many of them overlap on component shape and state ownership.
- Treat the three `bump` replies as still-open escalations on older threads, not as new standalone asks.

## Later Follow-up

- [x] Issue comment `4142295658`: disconnected liquid-staking flow was surfacing a raw LiFi `fromAddress` error, and custom slippage input was still broken for values starting with a preset prefix. Addressed in working tree by returning preview quotes without executable step data when `userAddress` is missing, and by preserving custom slippage input instead of clearing it when it temporarily matches a preset prefix.  
  Link: <https://github.com/OffchainLabs/arbitrum-portal-private/pull/19#issuecomment-4142295658>
