# UI to API Mapping

## 1. Opportunities Discovery Page (Empty State)

**A. Top Stats Cards:**

- Active Positions USD → `GET /v2/portfolio/positions/{user}?allowedNetworks=["arbitrum"]` → sum all `position.usdValue`
- Total Earnings USD → `GET /v2/portfolio/total-returns/{user}/{network}/{vault}` (aggregate across all vaults) → sum `totalReturns`
- Total Earnings % Change → `GET /v2/portfolio/total-returns/...` → `unrealizedGainPercent`
- Net APY % → Calculate weighted average: `Σ(position.apy × position.usdValue) / totalValue` from positions endpoint

**B. Opportunities Table:**

- All rows → `GET /v2/detailed-vaults?network=arbitrum&perPage=1000`
- Vault Name → `vault.name`
- Token → `vault.asset.symbol`
- Token Icon → `vault.asset.logo`
- Chain → `vault.network` (hardcoded "Arbitrum" for now)
- Chain Icon → Static asset
- APY % → `vault.apy` or `vault.apyBase + vault.apyReward`
- APY Stars (rating) → **❌ NOT IN API** (derive from APY percentile or hardcode logic)
- Type Badge → **⚠️ CATEGORIZE** from `vault.tags` array (map to "Liquid Staking" / "Lend" / "Fixed Yield")
- TVL → `vault.tvl`
- Protocol Name → `vault.protocol.name`
- Protocol Logo → `vault.protocol.logo`

**Search Bar:**

- ❌ No search endpoint → Client-side fuzzy search on `vault.name`, `protocol.name`, `asset.symbol`

**Filters:**

- Chains → Client-side filter on `vault.network`
- Position Type → Client-side filter on categorized type
- Token → Client-side filter on `vault.asset.symbol`
- Protocol → Client-side filter on `vault.protocol.name`
- ❌ No multi-select API support → Fetch all, filter client-side

**Sort Dropdown:**

- Sort by APY/TVL → Client-side sort on `vault.apy` / `vault.tvl`

---

## 2. Opportunities Discovery Page (With Positions)

Same as above, but:

- "Your Opportunities" section → Filter where `userAddress` has position via `GET /v2/portfolio/positions/{user}`
- Match `position.vaultAddress` with vaults from detailed-vaults

---

## 3. Liquid Staking - No Position

**Opportunity Header:**

- Vault Name → `GET /v2/detailed-vaults/{network}/{vault}` → `vault.name`
- Protocol → `vault.protocol.name`
- Protocol Logo → `vault.protocol.logo`

**Stats Cards:**

- APY % → `vault.apy`
- TVL → `vault.tvl`
- Risk Score → `vault.riskScore` or `vault.riskLevel`

**Charts (30D/90D/1Y tabs):**

- APY Chart → `GET /v2/historical/{network}/{vault}/apy?period=30d`
- TVL Chart → `GET /v2/historical/{network}/{vault}/tvl?period=30d`

**Stake Panel:**

- User ETH Balance → `GET /v2/transactions/context/{user}/{network}/{vault}` → `context.userBalances.wallet`
- Exchange Rate (1 ETH = X wstETH) → `context.exchangeRate` or `vault.sharePrice`
- You'll Receive Amount → Calculate: `inputAmount * exchangeRate`
- USD Value → `inputAmount * asset.price` (price from vault endpoint)

**Transaction Preparation:**

- Transaction Data → `GET /v2/transactions/deposit/{user}/{network}/{vault}?amount={amount}` → Returns `{ transactions: [{ to, data, value }], gasEstimate, expectedOutput }`

---

## 4. Liquid Staking - Has Position (Stake Tab)

**Position Summary Card:**

- Position Value USD → `GET /v2/portfolio/positions/{user}/{network}/{vault}` → `position.usdValue`
- Deposited Amount → `position.balance * vault.sharePrice` (in asset units)
- Total Earnings → `GET /v2/portfolio/total-returns/{user}/{network}/{vault}` → `totalReturns`

**APY Breakdown:**

- Base APY → `GET /v2/detailed-vaults/{network}/{vault}/apy` → `apyBreakdown.base`
- Reward APY → `apyBreakdown.reward`
- Net APY → `apyBreakdown.net`

**Stake More Panel:**

- Same as no position stake panel
- Shows current position value at top

---

## 5. Liquid Staking - Has Position (Withdraw Tab)

**Withdraw Panel:**

- Your Position → `GET /v2/portfolio/positions/{user}/{network}/{vault}` → `position.balance` (in shares)
- Position Value USD → `position.usdValue`
- You'll Receive Amount → Calculate: `withdrawAmount * vault.sharePrice`
- USD Value → `receiveAmount * asset.price`

**Transaction Preparation:**

- Transaction Data → `GET /v2/transactions/withdraw/{user}/{network}/{vault}?amount={amount}` → Returns encoded tx

---

## 6. Lend - No Position (Supply Panel)

**Opportunity Header:**

- Same as Liquid Staking

**Stats Cards:**

- Supply APY → `vault.apy`
- Max LTV → **❌ NOT IN VAULTS API** → Need Aave SDK: `UiPoolDataProvider.getReservesHumanized()` → `reserve.baseLTVasCollateral`
- Liquidation Threshold → **❌ NOT IN VAULTS API** → Aave SDK: `reserve.reserveLiquidationThreshold`
- Supply Market Cap → `vault.tvl`
- Utilization Rate → **❌ NOT IN VAULTS API** → Aave SDK: `totalDebt / totalLiquidity`

**Supply Panel:**

- User USDT Balance → `GET /v2/transactions/context/{user}/{network}/{vault}` → `context.userBalances.wallet`
- You'll Receive Amount → Same as input (1:1 for same-token lending)
- Supply APY → `vault.apy`

**"Planner" Feature:**

- ❌ Unknown functionality → Not documented in any API

**Transaction Preparation:**

- Transaction Data → `GET /v2/transactions/deposit/{user}/{network}/{vault}?amount={amount}`

---

## 7. Lend - Has Position (Supply Tab)

**Position Card:**

- Supplied Amount → `GET /v2/portfolio/positions/{user}/{network}/{vault}` → `position.balance`
- Supplied USD → `position.usdValue`
- Net APY → `vault.apy`

**Supply More Panel:**

- Same as no position supply panel

---

## 8. Lend - Has Position (Withdraw Tab)

**Withdraw Panel:**

- Supplied Amount → `position.balance`
- Supplied USD → `position.usdValue`
- You'll Receive → Calculate: `withdrawAmount` (1:1 for lending)

**Transaction Preparation:**

- Transaction Data → `GET /v2/transactions/withdraw/{user}/{network}/{vault}?amount={amount}`

---

## 9. Fixed Yield - No Position (Enter Position Panel)

**Opportunity Header:**

- Same as above

**Stats Cards:**

- Fixed APY → `vault.apy` or **⚠️ Verify** `vault.fixedApy`
- Underlying APY → **⚠️ MAY NOT BE IN VAULTS API** → Might need Pendle SDK: `getImpliedApy()`
- Maturity Date → **⚠️ VERIFY IN VAULTS API** → `vault.maturityDate` or from vault metadata
- Liquidity → **⚠️ MAY NOT BE IN VAULTS API** → Pendle SDK: `getMarketLiquidity()`

**Deposit Cap:**

- Deposit Cap → **⚠️ VERIFY** → `vault.depositCap.max`
- Current Deposits → `vault.depositCap.current` or `vault.tvl`
- Progress Bar → Calculate: `current / max * 100`

**Enter Position Panel:**

- Token Selector Dropdown → **⚠️ VERIFY** → Might be from `vault.supportedAssets[]`
- User WBTC Balance → `GET /v2/transactions/context/{user}/{network}/{vault}` → `context.userBalances.wallet`
- You'll Receive → Calculate based on exchange rate
- Fixed APY → `vault.apy`

**Transaction Preparation:**

- Transaction Data → `GET /v2/transactions/deposit/{user}/{network}/{vault}?amount={amount}&inputAsset={asset}`

---

## 10. Fixed Yield - Active Position (Add Funds Tab)

**Position Cards (Multiple):**

- Each Position → `GET /v2/portfolio/positions/{user}/{network}/{vault}` → **⚠️ VERIFY** if API distinguishes multiple positions with different maturity dates
- Position Value → `position.usdValue`
- Deposited Amount → `position.balance`
- Fixed APY → `vault.apy`
- Maturity Date → **⚠️ VERIFY** → `position.maturityDate`

**Add Funds Panel:**

- Same as Enter Position panel
- Shows existing position(s) above

---

## 11. Fixed Yield - Active Position (Swap Tab)

**Swap Panel:**

- From Token Balance → `position.balance`
- To Token Balance → User's wallet balance of target token
- Exchange Rate → **⚠️ VERIFY** → Might be in transaction context or need Pendle SDK
- You'll Receive → Calculate from exchange rate
- Price Impact → `GET /v2/transactions/swap/{user}/{network}/{vault}?amountIn={amount}&tokenIn={token}&tokenOut={token}` → `priceImpact`

**Transaction Preparation:**

- Transaction Data → `GET /v2/transactions/swap/...` → Returns encoded swap tx

---

## 12. Fixed Yield - Matured Position (Claim Panel)

**Position Card:**

- Claimable Amount → `GET /v2/portfolio/positions/{user}/{network}/{vault}` → **⚠️ VERIFY** `position.claimableAmount` or check if position.balance is claimable when matured
- Claimable USD → `position.usdValue`
- Fixed APY → `vault.apy`
- Maturity Date (Ended) → `position.maturityDate` (compare with current date)

**Claim Panel:**

- Claimable Amount → Same as position card
- Transaction Data → `GET /v2/transactions/claim/{user}/{network}/{vault}` → Returns encoded claim tx

---

## 13. Fixed Yield - Matured Position (Claim Details)

**Breakdown:**

- Principal → **⚠️ CALCULATE** → `position.balance - totalEarnings`
- Yield Earned → `GET /v2/portfolio/total-returns/{user}/{network}/{vault}` → `totalReturns`
- Total Claimable → `position.balance`

---

## 14. Fixed Yield - Rollover Flow

**Rollover Market Selection:**

- Available Markets → **⚠️ CRITICAL - VERIFY IN VAULTS API**
  - Option 1: `GET /v2/detailed-vaults?network=arbitrum&assetSymbol={currentAsset}&tags=fixed-yield` and filter by maturity date > current
  - Option 2: **❌ NOT IN VAULTS API** → Need Pendle SDK: `getRolloverMarkets(currentMarket)`

**Rollover Details:**

- Target Vault Name → `vault.name`
- New Maturity Date → `vault.maturityDate`
- New Fixed APY → `vault.apy`
- Amount to Rollover → Current position balance

**Transaction Preparation:**

- Transaction Data → **⚠️ CRITICAL - VERIFY** → `GET /v2/transactions/rollover/{user}/{network}/{vault}?targetVault={newVault}`
  - If endpoint doesn't exist → **❌ Need Pendle SDK**

---

## Summary of Gaps

### ❌ Not Available in Vaults API:

1. **Lend Metrics**: Max LTV, Liquidation Threshold, Utilization Rate → Need Aave SDK
2. **APY Rating Stars**: Need custom logic or percentile calculation
3. **Search**: Client-side implementation needed
4. **Multi-select Filters**: Client-side implementation needed

### ⚠️ Need Verification:

1. **Fixed Yield Support**: Maturity dates, deposit caps, multiple positions per vault
2. **Rollover Endpoint**: Does `/v2/transactions/rollover` exist?
3. **Token Selection**: Does Fixed Yield support multiple input tokens?
4. **Underlying APY vs Fixed APY**: Are both available?
5. **Liquidity for Fixed Yield**: Available in Vaults API?

### ❓ Unknown Features:

1. **Planner** (in Lend flow): Functionality unclear, not in any documentation

### ✅ Fully Supported:

- All basic vault data (name, protocol, APY, TVL)
- User positions and balances
- Transaction preparation (deposit, withdraw, swap, claim)
- Historical charts (APY, TVL, share price)
- Portfolio aggregation and earnings
