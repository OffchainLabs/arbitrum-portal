# Earn Feature - Interaction Flows & Requirements

**Document Version**: 1.0
**Date**: 2025-10-14
**Status**: Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Opportunity Types](#opportunity-types)
3. [Flow Comparison Matrix](#flow-comparison-matrix)
4. [Liquid Staking Flow](#liquid-staking-flow)
5. [Lend Flow](#lend-flow)
6. [Fixed Yield Flow](#fixed-yield-flow)
7. [Component Specifications](#component-specifications)
8. [State Management](#state-management)
9. [API Integration Points](#api-integration-points)
10. [Edge Cases & Validations](#edge-cases--validations)

---

## Overview

This document defines the interaction flows for the three opportunity types in the Earn feature:
- **Liquid Staking**: Stake ETH/WETH to receive liquid staking tokens (stETH, wstETH)
- **Lend**: Supply assets to lending protocols to earn interest
- **Fixed Yield**: Lock assets for a fixed term to earn predetermined APY

Each opportunity type has unique interaction patterns, states, and UI requirements.

---

## Opportunity Types

### Classification Matrix

| Feature | Liquid Staking | Lend | Fixed Yield |
|---------|---------------|------|-------------|
| **Token Conversion** | Yes (ETH → wstETH) | No (USDT → USDT) | Yes (USDC → PT wstETH) |
| **Has Position States** | 2 (No Position, Has Position) | 2 (No Position, Has Position) | 4 (No Position, Active, Matured, Ended) |
| **Primary Actions** | Stake, Withdraw | Supply, Withdraw | Enter, Add Funds, Swap, Claim, Rollover |
| **Maturity Date** | No | No | Yes |
| **Deposit Caps** | No | No | Yes |
| **Asset Selection** | Yes (ETH/WETH toggle) | No | Yes (dropdown) |
| **Withdrawal Type** | Instant | Instant | Swap (before maturity), Claim (after maturity) |
| **Can Add to Position** | Yes | Yes | Yes (multiple positions) |
| **Unique Metrics** | Exchange Rate | Max LTV, Liquidation Threshold, Utilization Rate | Underlying APY, Fixed APY, Maturity Date, Liquidity |
| **Protocol Example** | Lido | Aave v3 | Pendle |

---

## Flow Comparison Matrix

### State Transitions

```
LIQUID STAKING:
┌─────────────────┐
│  No Position    │──[Stake ETH]──┐
└─────────────────┘               │
                                  ▼
                         ┌─────────────────┐
                         │  Has Position   │
                         │  [Stake/Withdraw]│
                         └─────────────────┘
                                  │
                                  │[Withdraw All]
                                  ▼
                         ┌─────────────────┐
                         │  No Position    │
                         └─────────────────┘

LEND:
┌─────────────────┐
│  No Position    │──[Supply]──┐
└─────────────────┘            │
                               ▼
                      ┌─────────────────┐
                      │  Has Supply     │
                      │  [Supply/Withdraw]│
                      └─────────────────┘
                               │
                               │[Withdraw All]
                               ▼
                      ┌─────────────────┐
                      │  No Position    │
                      └─────────────────┘

FIXED YIELD:
┌─────────────────┐
│  No Position    │──[Enter Position]──┐
└─────────────────┘                    │
                                       ▼
                            ┌──────────────────┐
                            │  Active Position │
                            │  [Add Funds/Swap]│
                            └──────────────────┘
                                       │
                                       │[Maturity Date Reached]
                                       ▼
                            ┌──────────────────┐
                            │ Matured Position │
                            │ [Claim/Rollover] │
                            └──────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                    [Claim]                     [Rollover]
                         │                           │
                         ▼                           ▼
                ┌─────────────────┐        ┌──────────────────┐
                │  No Position    │        │  Active Position │
                └─────────────────┘        │  (New Maturity)  │
                                           └──────────────────┘
```

---

## Liquid Staking Flow

### States

1. **No Position Taken**
2. **Has Position**

### User Journey

#### Step 1: Initial Stake (No Position)

**URL Pattern**: `/earn/opportunities/arbitrum/0x...` (vault address)

**Left Panel Components:**
- Token header: stETH (icon + name + "Liquid Staking")
- Protocol badge: Lido (icon + name)
- Stats cards:
  - Total Staked: `108.6M ETH`
  - Stakers: `563k`
- Chart with tabs: Token Price (default) | APY | TVL
  - Time periods: 1d | 7d | 1M | 1Y
- APR metric cards:
  - 7-day rolling APR: `2.6%`
  - 15-day rolling APR: `2.8%`
  - 30-day rolling APR: `2.9%`
- About section (collapsible)

**Right Panel - "Stake ETH":**
```
┌─────────────────────────────────────────┐
│ Stake ETH                          [?]  │
├─────────────────────────────────────────┤
│ Amount to allocate            [Max]     │
│ ┌─────────────────────────────────┐     │
│ │ 0.044                    ●  ETH │     │
│ └─────────────────────────────────┘     │
│ ⇩ $35.79 USD      Balance: 0.064 ETH    │
│                                         │
│ Receive               0.048 wstETH      │
│                                         │
│ Transaction details                     │
│ Exchange Rate    1 stETH = 1.14588 ETH  │
│ Transaction Cost 0.00050 ETH (~ $2.25)  │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │        Stake ETH                │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Features:**
- **Asset toggle** (tooltip): "user will be able to select ETH or WETH. Title of 'Stake ETH / STAKE WETH' will change accordingly. this is togglable"
- Amount input with decimal precision
- Max button (fills wallet balance)
- Real-time USD conversion
- Balance display
- Output token calculation (wstETH)
- Exchange rate display
- Gas estimation with USD value
- Primary CTA button

#### Step 2: Add to Position or Withdraw (Has Position)

**Right Panel - "Your position":**
```
┌─────────────────────────────────────────┐
│ Your position                      [?]  │
├─────────────────────────────────────────┤
│ Position Value                          │
│ ● 0.048 wstETH                          │
│ $35.79 USD                       +7% 🟢 │
│                                         │
│ Earning APR                      2.6%   │
│                                         │
│ ┌────────────┬───────────────┐          │
│ │   Stake    │   Withdraw    │          │
│ └────────────┴───────────────┘          │
│                                         │
│ [Stake Tab Active]                      │
│ Stake ETH                    [Max]      │
│ ┌─────────────────────────────────┐     │
│ │ 0.044                    ●  ETH │     │
│ └─────────────────────────────────┘     │
│ ⇩ $35.79 USD      Balance: 0.064 ETH    │
│                                         │
│ Receive               0.048 wstETH      │
│                                         │
│ Transaction details                     │
│ Exchange Rate    1 wstETH = 1.14588 ETH │
│ Transaction Cost 0.00050 ETH (~ $2.25)  │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │        Stake ETH                │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Withdraw Tab:**
```
│ [Withdraw Tab Active]                   │
│ Amount                       [Max]      │
│ ┌─────────────────────────────────┐     │
│ │ 0.044                    ●  ETH │     │
│ └─────────────────────────────────┘     │
│ ⇩ $35.79 USD   Balance: 0.064 wstETH    │
│                                         │
│ Receive                  0.048 ETH      │
│                                         │
│ Transaction details                     │
│ Exchange Rate    1 wstETH = 1.14588 ETH │
│ Transaction Cost 0.00050 ETH (~ $2.25)  │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │       Withdraw ETH              │     │
│ └─────────────────────────────────┘     │
```

**Key Differences:**
- Position summary card appears
- Tab switcher (Stake | Withdraw)
- **Stake tab**: Balance = wallet balance
- **Withdraw tab**: Balance = position balance (wstETH)
- Button text changes
- Token direction reverses

### Requirements

**API Endpoints Needed:**
1. `GET /api/earn/opportunities/{network}/{vaultAddress}` - Vault details
2. `GET /api/earn/positions/{userAddress}/{network}/{vaultAddress}` - User position (if exists)
3. `GET /api/earn/transactions/context/{userAddress}/{network}/{vaultAddress}?action=deposit` - Stake context
4. `GET /api/earn/transactions/context/{userAddress}/{network}/{vaultAddress}?action=withdraw` - Withdraw context
5. `GET /api/earn/transactions/deposit/{userAddress}/{network}/{vaultAddress}?amount=X` - Tx prep
6. `GET /api/earn/transactions/withdraw/{userAddress}/{network}/{vaultAddress}?amount=X` - Withdraw prep

**Validation Rules:**
- Amount > 0
- Amount <= balance (wallet for stake, position for withdraw)
- Amount >= minimum deposit (if protocol has minimum)
- Sufficient gas balance
- Token approval granted (if ERC20)

**Real-time Calculations:**
- USD value of input amount
- Output token amount based on exchange rate
- Gas estimation
- Final receive amount (after fees)

---

## Lend Flow

### States

1. **No Position Taken**
2. **Has Supply**

### User Journey

#### Step 1: Initial Supply (No Position)

**Left Panel Components:**
- Token header: USDT (icon + name + "Lending")
- Protocol badge: AAVE v3
- Stats cards:
  - Total supplied: `6.71B`
  - Utilization Rate: `89.38%`
- Chart tabs: APY (default) | TVL | Token Price
  - Title: "Supply APY 4.78%"
- **Lending-specific metric cards**:
  - Max LTV: `75.00%` [ⓘ]
  - Liquidation threshold: `78.00%` [ⓘ]
  - Supply Market Cap: `9.3B` [ⓘ]
- About Lending section

**Right Panel - "Supply USDT":**
```
┌─────────────────────────────────────────┐
│ Supply USDT                        [?]  │
├─────────────────────────────────────────┤
│ Amount to allocate            [Max]     │
│ ┌─────────────────────────────────┐     │
│ │ 1.979545              ●  USDT≠O │     │
│ └─────────────────────────────────┘     │
│ ⇩ $1,979.545 USD Balance: 1.98 USDT≠O   │
│                                         │
│ ▼ Planner                               │
│   [Collapsed content]                   │
│                                         │
│ Transaction details                     │
│ APY                             8.11%   │
│ Transaction Cost                $0.02   │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │          Supply                 │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Features:**
- Same token in/out (USDT → USDT)
- **Planner dropdown** (purpose TBD - likely position planning)
- Different metrics (LTV, Liquidation, Utilization)
- Lower transaction costs (same chain, no conversion)

#### Step 2: Add Supply or Withdraw (Has Supply)

**Right Panel - "Your supply":**
```
┌─────────────────────────────────────────┐
│ Your supply                        [?]  │
├─────────────────────────────────────────┤
│ Amount                                  │
│ ● 1.979545 USDT≠O                       │
│ $1,979 USD                       +7% 🟢 │
│                                         │
│ Earning APY                      5.33   │
│                                         │
│ ┌────────────┬───────────────┐          │
│ │   Supply   │   Withdraw    │          │
│ └────────────┴───────────────┘          │
│                                         │
│ [Supply Tab]                            │
│ Amount to allocate            [Max]     │
│ ┌─────────────────────────────────┐     │
│ │ 1.979545              ●  USDT≠O │     │
│ └─────────────────────────────────┘     │
│ ⇩ $1,979.545 USD Balance: 1.98 USDT≠O   │
│                                         │
│ Transaction details                     │
│ APY                             8.11%   │
│ Transaction Cost                $0.02   │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │          Supply                 │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Withdraw Tab:**
```
│ [Withdraw Tab]                          │
│ Amount                        [Max]     │
│ ┌─────────────────────────────────┐     │
│ │ 1.979545              ●  USDT≠O │     │
│ └─────────────────────────────────┘     │
│ ⇩ $1,979.545 USD Balance: 1.98 USDT≠O   │
│                                         │
│ Transaction details                     │
│ Remaining supply          0.048 USDT    │
│ Transaction Cost   0.00050 ETH ($2.25)  │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │         Withdraw                │     │
│ └─────────────────────────────────┘     │
```

**Design Notes:**
- Annotation: "find out if balance tracking + amount earned is too risky"
- Annotation: "will have to find out if balance tracking to know the amount earned is too expensive/tricky"

**Unique to Lend:**
- "Remaining supply" shown on withdraw (helps user understand impact)
- Same token for deposit/withdraw (no conversion)
- APY shown in transaction details

### Requirements

**API Endpoints Needed:**
1. Same as Liquid Staking, but:
   - Different vault type detection
   - No exchange rate calculation
   - Lending-specific metrics (LTV, liquidation threshold)

**Validation Rules:**
- Amount > 0
- Amount <= balance
- Amount >= protocol minimum
- Ensure remaining supply doesn't fall below minimum threshold

**Challenges Noted:**
- Tracking earned interest might be expensive/complex
- Need API support for accurate earnings calculation
- Consider showing estimated APY vs. actual earned

---

## Fixed Yield Flow

### States

1. **No Position Taken**
2. **Active Position** (before maturity)
3. **Matured Position** (maturity reached)
4. **Multiple Positions** (user has >1 position)

### User Journey

#### Step 1: Initial Entry (No Position)

**Left Panel Components:**
- Token header: PT wstETH (icon + name + "Lending")
- Protocol badge: Lido
- Stats cards:
  - Maturity Date: `25 Dec 2025` (99 days)
  - Liquidity: `$64.53M` (+0.57%)
- Chart: "Supply APR 4.78%"
- **Fixed Yield metric cards**:
  - 24h Volume: `$144,305` [ⓘ]
  - Underlying APY: `2.67%` [ⓘ]
  - Fixed APY: `2.81%` [ⓘ]

**Right Panel - "Enter Fixed Yield":**
```
┌─────────────────────────────────────────┐
│ Enter Fixed Yield                  [?]  │
├─────────────────────────────────────────┤
│ ⚠️ Deposit have a cap!           [v]    │
│                                         │
│ Input                             [Max] │
│ ┌─────────────────────────────────┐     │
│ │ 1                        ●  USDC│▼│   │
│ └─────────────────────────────────┘     │
│ ⇩ $5,448.25 USD Balance: =3.6543 wstETH │
│                                         │
│ Receive                1.22279 PT wstETH│
│                                         │
│ Transaction details                     │
│ Fixed APY                        2.79%  │
│ Total execution time            ≈ 1 sec │
│ Slippage:                         0.5%  │
│ Network fee       ~0.0045 ETH ($7.65)   │
│ Price impact (route)            <0.50%  │
│ Min received            ≥ 1.22157 PT... │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │      Enter Position             │     │
│ └─────────────────────────────────┘     │
│ Handled by the Pendle protocol          │
└─────────────────────────────────────────┘
```

**Cap Warning (Expanded):**
```
│ ⚠️ Deposit have a cap!           [^]    │
│ Once cap is reached, you can only buy   │
│ PT or YT using USDai or USDal. Exiting  │
│ not affected. Learn more                │
│                                         │
│ $435.34 USDC Left                       │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░         │
│ 0                           $43500.34   │
```

**Unique Features:**
- **Asset dropdown** (not just toggle)
- **Deposit cap warning** with progress bar
- **Complex transaction details**:
  - Slippage tolerance
  - Execution time
  - Price impact
  - Min received (slippage protection)
- **Protocol attribution**: "Handled by the Pendle protocol"
- Converts to PT (Principal Token)

#### Step 2: Add Funds (Active Position)

**Multiple Positions Support:**
```
┌─────────────────────────────────────────┐
│ Open position                      [?]  │
├─────────────────────────────────────────┤
│ Matured Amount      ● Ended  APY: 2.82% │
│ ● 1.22279 wstETH                        │
│ $5,448.25 USD                    +7% 🟢 │
│                                         │
│ Position Value      ● Active APY: 2.79% │
│ ● 134 PT wstETH                         │
│ $5,448.25 USD                    +7% 🟢 │
│                                         │
│ Maturity Date     25 Dec 2025 (Ended)   │
│ P&L               27.67 ETH (+32.01%)   │
│ Total Value                       1 ETH │
│                                         │
│ ┌────────────┬───────────────┐          │
│ │ Add Funds  │   Withdraw    │          │
│ └────────────┴───────────────┘          │
│                                         │
│ Input                             [Max] │
│ ┌─────────────────────────────────┐     │
│ │ 1                      ● wstETH │▼│   │
│ └─────────────────────────────────┘     │
│ ...                                     │
│ ┌─────────────────────────────────┐     │
│ │       Add Funds                 │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Key Features:**
- Shows ALL positions for this vault
- Each position has status badge (Active, Ended)
- Individual APY per position
- Aggregated P&L
- Can add to existing positions

#### Step 3: Close Position (Before Maturity)

**Tab Switcher**: Add Funds | Withdraw (but shows "Swap")

**Swap Tab:**
```
│ ┌────────────┬───────────────┐          │
│ │   Swap     │   Withdraw    │          │
│ └────────────┴───────────────┘          │
│                                         │
│ Amount                            [Max] │
│ ┌─────────────────────────────────┐     │
│ │ 1.22279                ● PT...  │     │
│ └─────────────────────────────────┘     │
│ Balance: 3.6543 ETH                     │
│                                         │
│ Receive                    1.22279 wstETH│
│                                         │
│ Transaction details                     │
│ ...                                     │
│ ┌─────────────────────────────────┐     │
│ │         Withdraw                │     │
│ └─────────────────────────────────┘     │
```

**Note**: Before maturity, user must "Swap" PT back to underlying token (market-based exchange).

#### Step 4: Claim (After Maturity)

**Maturity Date Changes to**: "Matured" (25 Dec 2025)

**Tab Switcher**: Claim (active) | Rollover

**Claim Tab:**
```
┌─────────────────────────────────────────┐
│ Your position                      [?]  │
├─────────────────────────────────────────┤
│ Matured Amount      ● Ended  APY: 2.82% │
│ ● 1.22279 wstETH                        │
│ $5,448.25 USD                    +7% 🟢 │
│                                         │
│ Maturity Date     25 Dec 2025 (Ended)   │
│ P&L               27.67 ETH (+32.01%)   │
│ Total Value                       1 ETH │
│                                         │
│ ┌────────────┬───────────────┐          │
│ │   Claim    │   Rollover    │          │
│ └────────────┴───────────────┘          │
│                                         │
│ Matured Amount                          │
│ ● 1.22279 wstETH                        │
│ ⇩ $5,448.25 USD                         │
│                                         │
│ Receive                    1.22279 wstETH│
│                                         │
│ Transaction details                     │
│ Network fee       ~0.0045 ETH ($7.65)   │
│ Price impact (route)            <0.50%  │
│ Min received            ≥ 1.22157 PT    │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │      Claim wstETH               │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**After maturity**: Redemption is guaranteed at fixed rate (no market risk).

#### Step 5: Rollover (After Maturity)

**Rollover Tab:**
```
│ ┌────────────┬───────────────┐          │
│ │   Claim    │   Rollover    │          │
│ └────────────┴───────────────┘          │
│                                         │
│ Rollover to New Markets:                │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │ ●  wstETH              2.81%    │     │
│ │    25 Dec 2025 (98 days)        │     │
│ │    Fixed APY                    │     │
│ └─────────────────────────────────┘     │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │ ●  wstETH              3%       │     │
│ │    30 Dec 2027 (833 days)       │     │
│ │    Fixed APY                    │     │
│ └─────────────────────────────────┘     │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │      Enter Position             │     │
│ └─────────────────────────────────┘     │
```

**Unique Feature**: Allows seamless reinvestment into new maturity dates without claiming first.

### Requirements

**API Endpoints Needed:**
1. `GET /api/earn/opportunities/{network}/{vaultAddress}` - Must include:
   - Maturity date
   - Deposit cap info
   - Fixed APY
   - Underlying APY
   - Liquidity
2. `GET /api/earn/positions/{userAddress}/{network}/{vaultAddress}` - Returns array of positions:
   ```typescript
   {
     positions: [
       {
         id: "pos-1",
         amount: "1.22279",
         token: "wstETH",
         status: "ended",
         apy: 2.82,
         maturityDate: "2025-12-25",
         entryDate: "2025-01-15"
       },
       {
         id: "pos-2",
         amount: "134",
         token: "PT wstETH",
         status: "active",
         apy: 2.79,
         maturityDate: "2025-12-25",
         entryDate: "2025-03-20"
       }
     ],
     aggregated: {
       totalValue: "1 ETH",
       totalPnl: { eth: "27.67", percentage: 32.01 }
     }
   }
   ```
3. `GET /api/earn/opportunities/{network}/{vaultAddress}/rollover-markets` - Available rollover options:
   ```typescript
   {
     markets: [
       {
         vaultAddress: "0x...",
         maturityDate: "2025-12-25",
         daysRemaining: 98,
         fixedApy: 2.81,
         token: "wstETH"
       },
       {
         vaultAddress: "0x...",
         maturityDate: "2027-12-30",
         daysRemaining: 833,
         fixedApy: 3.0,
         token: "wstETH"
       }
     ]
   }
   ```
4. `GET /api/earn/transactions/context/{userAddress}/{network}/{vaultAddress}?action=swap` - Pre-maturity exit
5. `GET /api/earn/transactions/context/{userAddress}/{network}/{vaultAddress}?action=claim` - Post-maturity claim
6. `GET /api/earn/transactions/context/{userAddress}/{network}/{vaultAddress}?action=rollover&targetVault=0x...` - Rollover

**Validation Rules:**
- Check deposit cap before allowing entry
- Calculate if cap would be exceeded
- Validate maturity date hasn't passed for new entries
- For rollover: ensure source position is matured
- For swap: calculate market price impact
- For claim: ensure maturity date has passed

**State Detection:**
- Active: `currentDate < maturityDate`
- Matured: `currentDate >= maturityDate && !claimed`
- Ended: `claimed === true`

**Complex Calculations:**
- Slippage tolerance enforcement
- Min received calculation
- Price impact routing
- Multiple position aggregation
- P&L across different entry dates

---

## Component Specifications

### Shared Components

#### 1. Amount Input Component

**Props:**
```typescript
interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  token: TokenInfo;
  balance: string;
  balanceLabel?: string; // "Balance" | "Position"
  usdValue?: string;
  showMax?: boolean;
  onMaxClick?: () => void;
  showTokenSelector?: boolean; // For Fixed Yield
  tokenOptions?: TokenInfo[];
  onTokenChange?: (token: TokenInfo) => void;
  disabled?: boolean;
  error?: string;
}
```

**Behavior:**
- Decimal precision based on token decimals
- Real-time USD conversion
- Max button fills balance
- Validation on blur
- Error state styling

#### 2. Transaction Details Component

**Props:**
```typescript
interface TransactionDetailsProps {
  type: "liquid-staking" | "lend" | "fixed-yield";
  details: {
    // Common
    networkFee?: { eth: string; usd: string };

    // Liquid Staking
    exchangeRate?: string;

    // Lend
    apy?: number;
    remainingSupply?: string;

    // Fixed Yield
    fixedApy?: number;
    slippage?: number;
    executionTime?: string;
    priceImpact?: string;
    minReceived?: string;
  };
}
```

**Layout:**
```
Transaction details
────────────────────────────────
Label 1                   Value 1
Label 2                   Value 2
...
```

#### 3. Position Summary Component

**Props:**
```typescript
interface PositionSummaryProps {
  positions: Position[];
  type: "liquid-staking" | "lend" | "fixed-yield";
  showMultiple?: boolean; // For Fixed Yield
}

interface Position {
  id: string;
  amount: string;
  token: string;
  usdValue: string;
  pnl: { value: string; percentage: number };
  status?: "active" | "ended" | "matured";
  apy: number;
  maturityDate?: string; // Fixed Yield only
}
```

**Layout Variations:**

**Single Position (Liquid Staking, Lend):**
```
Position Value
● 0.048 wstETH
$35.79 USD                       +7%

Earning APR                      2.6%
```

**Multiple Positions (Fixed Yield):**
```
Matured Amount      ● Ended  APY: 2.82%
● 1.22279 wstETH
$5,448.25 USD                    +7%

Position Value      ● Active APY: 2.79%
● 134 PT wstETH
$5,448.25 USD                    +7%

Maturity Date     25 Dec 2025 (Ended)
P&L               27.67 ETH (+32.01%)
Total Value                       1 ETH
```

#### 4. Tab Switcher Component

**Props:**
```typescript
interface TabSwitcherProps {
  tabs: Array<{
    id: string;
    label: string;
    disabled?: boolean;
  }>;
  activeTab: string;
  onChange: (tabId: string) => void;
}
```

**Styles:**
- Active: `bg-[#262626] text-white`
- Inactive: `bg-transparent text-[#999999] hover:text-white`
- Rounded, equal width tabs

#### 5. Metric Cards Component

**Props:**
```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  tooltip?: string;
  change?: { value: number; type: "positive" | "negative" };
}
```

**Layout:**
```
┌─────────────────────┐
│ Label          [ⓘ]  │
│ Value               │
│ SubValue     Change │
└─────────────────────┘
```

#### 6. Cap Warning Component (Fixed Yield)

**Props:**
```typescript
interface CapWarningProps {
  currentCap: number;
  maxCap: number;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
}
```

**Features:**
- Expandable/collapsible
- Progress bar visualization
- Educational link
- Alert icon

#### 7. Rollover Markets Component (Fixed Yield)

**Props:**
```typescript
interface RolloverMarketsProps {
  markets: Array<{
    id: string;
    token: string;
    maturityDate: string;
    daysRemaining: number;
    fixedApy: number;
  }>;
  onSelect: (marketId: string) => void;
}
```

**Layout:**
```
Rollover to New Markets:

┌─────────────────────────────────┐
│ ●  wstETH              2.81%    │
│    25 Dec 2025 (98 days)        │
│    Fixed APY                    │
└─────────────────────────────────┘

[Additional markets...]
```

---

## State Management

### Page-Level State

```typescript
interface OpportunityPageState {
  // Data
  opportunity: Opportunity | null;
  userPosition: Position[] | null;
  loading: boolean;
  error: string | null;

  // UI State
  activeTab: "stake" | "withdraw" | "supply" | "add-funds" | "swap" | "claim" | "rollover";
  capWarningExpanded: boolean;
  plannerExpanded: boolean; // Lend only

  // Form State
  inputAmount: string;
  selectedToken: TokenInfo; // Fixed Yield
  receiveAmount: string;
  usdValue: string;

  // Transaction State
  transactionContext: TransactionContext | null;
  preparedTransaction: PreparedTransaction | null;
  isPreparingTx: boolean;

  // Validation
  errors: {
    amount?: string;
    balance?: string;
    cap?: string;
  };
}
```

### Action Handlers

```typescript
// Amount change
function handleAmountChange(value: string) {
  // 1. Update input
  // 2. Validate format
  // 3. Calculate USD value
  // 4. Calculate receive amount
  // 5. Check balance
  // 6. Check cap (Fixed Yield)
  // 7. Update state
}

// Max button
function handleMaxClick() {
  // 1. Get balance (wallet or position based on tab)
  // 2. Subtract gas buffer (if native token)
  // 3. Fill input
  // 4. Trigger calculations
}

// Tab switch
function handleTabChange(tab: string) {
  // 1. Reset input
  // 2. Clear errors
  // 3. Update active tab
  // 4. Fetch new transaction context
  // 5. Update balance reference
}

// Submit transaction
async function handleSubmit() {
  // 1. Final validation
  // 2. Prepare transaction
  // 3. Request wallet approval (if needed)
  // 4. Execute transaction
  // 5. Wait for confirmation
  // 6. Refresh position data
  // 7. Show success message
  // 8. Reset form
}
```

---

## API Integration Points

### Real-time Data Fetching

```typescript
// On page load
useEffect(() => {
  // 1. Fetch opportunity details
  const opportunity = await fetchOpportunity(network, vaultAddress);

  // 2. Fetch user position (if wallet connected)
  if (userAddress) {
    const position = await fetchUserPosition(userAddress, network, vaultAddress);
  }

  // 3. Determine initial state
  const hasPosition = position && position.length > 0;
  const defaultTab = hasPosition ? getDefaultTabForType(opportunityType) : getInitialTabForType(opportunityType);

  // 4. Fetch transaction context for default action
  const context = await fetchTransactionContext(
    userAddress,
    network,
    vaultAddress,
    mapTabToAction(defaultTab)
  );
}, [network, vaultAddress, userAddress]);

// On amount change (debounced)
useEffect(() => {
  const timer = setTimeout(async () => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      // Calculate receive amount
      const txPrep = await fetchTransactionPreparation(
        action,
        userAddress,
        network,
        vaultAddress,
        inputAmount
      );

      setReceiveAmount(txPrep.summary.expectedOutput);
      setTransactionDetails(txPrep.summary);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [inputAmount]);
```

### Polling for Updates

```typescript
// Poll position data every 30 seconds
useInterval(() => {
  if (userAddress && hasPosition) {
    refetchUserPosition();
  }
}, 30000);

// Poll APY/TVL every 60 seconds
useInterval(() => {
  refetchOpportunityDetails();
}, 60000);
```

### Transaction Execution Flow

```typescript
async function executeTransaction() {
  try {
    // 1. Prepare transaction
    setIsPreparingTx(true);
    const txData = await fetchTransactionData(
      action,
      userAddress,
      network,
      vaultAddress,
      inputAmount
    );

    // 2. Check if approval needed
    if (txData.transactions.length > 1) {
      // First tx is approval
      const approveTx = txData.transactions[0];
      const approvalHash = await sendTransaction(approveTx);
      await waitForTransaction(approvalHash);

      // Show approval success, continue to main tx
      toast.success("Approval confirmed");
    }

    // 3. Execute main transaction
    const mainTx = txData.transactions[txData.transactions.length - 1];
    const txHash = await sendTransaction(mainTx);

    // 4. Show pending state
    toast.loading("Transaction pending...", { id: txHash });

    // 5. Wait for confirmation
    const receipt = await waitForTransaction(txHash);

    // 6. Success handling
    toast.success("Transaction confirmed!", { id: txHash });

    // 7. Refresh data
    await Promise.all([
      refetchUserPosition(),
      refetchOpportunityDetails()
    ]);

    // 8. Reset form
    resetForm();

  } catch (error) {
    // Error handling
    if (error.code === 4001) {
      toast.error("Transaction rejected");
    } else {
      toast.error("Transaction failed: " + error.message);
    }
  } finally {
    setIsPreparingTx(false);
  }
}
```

---

## Edge Cases & Validations

### Input Validation

#### Amount Validation
```typescript
function validateAmount(amount: string, context: ValidationContext): ValidationResult {
  // 1. Check format
  if (!/^\d*\.?\d*$/.test(amount)) {
    return { valid: false, error: "Invalid number format" };
  }

  // 2. Check non-zero
  if (parseFloat(amount) <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  // 3. Check decimals
  const decimals = amount.split('.')[1]?.length || 0;
  if (decimals > context.token.decimals) {
    return { valid: false, error: `Max ${context.token.decimals} decimals` };
  }

  // 4. Check minimum
  if (context.minimumDeposit && parseFloat(amount) < context.minimumDeposit) {
    return { valid: false, error: `Minimum deposit: ${context.minimumDeposit}` };
  }

  // 5. Check balance
  if (parseFloat(amount) > parseFloat(context.balance)) {
    return { valid: false, error: "Insufficient balance" };
  }

  // 6. Check cap (Fixed Yield only)
  if (context.type === "fixed-yield" && context.depositCap) {
    const remaining = context.depositCap.max - context.depositCap.current;
    if (parseFloat(amount) > remaining) {
      return { valid: false, error: `Cap exceeded. Max: ${remaining}` };
    }
  }

  // 7. Check gas buffer (if native token)
  if (context.token.isNative) {
    const gasBuffer = 0.01; // 0.01 ETH buffer
    if (parseFloat(amount) > parseFloat(context.balance) - gasBuffer) {
      return { valid: false, error: "Leave some ETH for gas" };
    }
  }

  return { valid: true };
}
```

### State Transitions

#### Fixed Yield Maturity Check
```typescript
function determineFixedYieldState(position: FixedYieldPosition): PositionState {
  const now = Date.now();
  const maturityDate = new Date(position.maturityDate).getTime();

  if (position.claimed) {
    return "ended";
  }

  if (now >= maturityDate) {
    return "matured";
  }

  return "active";
}

function getAvailableActions(state: PositionState): string[] {
  switch (state) {
    case "active":
      return ["add-funds", "swap"];
    case "matured":
      return ["claim", "rollover"];
    case "ended":
      return []; // No actions, position closed
    default:
      return ["enter"];
  }
}
```

### Error Scenarios

#### Network Errors
```typescript
function handleNetworkError(error: any) {
  if (error.code === "NETWORK_ERROR") {
    toast.error("Network error. Please check your connection.");
    // Retry logic
    setTimeout(() => refetch(), 5000);
  } else if (error.code === "TIMEOUT") {
    toast.error("Request timeout. Please try again.");
  }
}
```

#### Transaction Failures
```typescript
function handleTransactionError(error: any) {
  // User rejection
  if (error.code === 4001) {
    toast.info("Transaction cancelled");
    return;
  }

  // Insufficient funds
  if (error.message.includes("insufficient funds")) {
    toast.error("Insufficient funds for gas");
    return;
  }

  // Slippage exceeded
  if (error.message.includes("slippage")) {
    toast.error("Price moved too much. Try increasing slippage tolerance.");
    return;
  }

  // Contract revert
  if (error.message.includes("revert")) {
    const reason = extractRevertReason(error);
    toast.error(`Transaction failed: ${reason}`);
    return;
  }

  // Generic error
  toast.error("Transaction failed. Please try again.");
}
```

### Loading States

```typescript
// Skeleton loaders while fetching
if (loading) {
  return <OpportunityDetailSkeleton />;
}

// Partial loading (position data)
if (loadingPosition) {
  return (
    <OpportunityDetail>
      <PositionSummarySkeleton />
    </OpportunityDetail>
  );
}

// Transaction preparation loading
if (isPreparingTx) {
  // Show spinner in button
  <Button disabled>
    <Spinner /> Preparing...
  </Button>
}
```

### Empty States

```typescript
// No position yet
if (!position || position.length === 0) {
  // Show initial entry form
  // Hide position summary
  // Show "Enter Position" / "Stake" / "Supply" CTA
}

// Position fully withdrawn
if (position.amount === "0") {
  // Reset to no position state
  // Show success message
  // Offer to enter new position
}
```

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Amount Input Component
- [ ] Transaction Details Component
- [ ] Position Summary Component
- [ ] Tab Switcher Component
- [ ] Metric Cards Component
- [ ] Primary Button Component

### Phase 2: Liquid Staking
- [ ] Liquid Staking Detail Page
- [ ] No Position State
- [ ] Has Position State
- [ ] Stake/Withdraw Tabs
- [ ] ETH/WETH Toggle
- [ ] Exchange Rate Calculation
- [ ] Integration with Vaults.fyi

### Phase 3: Lend
- [ ] Lend Detail Page
- [ ] No Position State
- [ ] Has Supply State
- [ ] Supply/Withdraw Tabs
- [ ] Planner Component (if needed)
- [ ] Lending Metrics (LTV, Liquidation)
- [ ] Same-token validation

### Phase 4: Fixed Yield (Basic)
- [ ] Fixed Yield Detail Page
- [ ] No Position State
- [ ] Active Position State
- [ ] Enter/Add Funds/Swap Tabs
- [ ] Asset Dropdown
- [ ] Cap Warning Component
- [ ] Slippage/Price Impact Display

### Phase 5: Fixed Yield (Advanced)
- [ ] Matured Position State
- [ ] Claim/Rollover Tabs
- [ ] Multiple Positions Support
- [ ] Rollover Markets Component
- [ ] P&L Aggregation
- [ ] Maturity Date Tracking

### Phase 6: Transaction Execution
- [ ] Wallet Connection
- [ ] Approval Flow
- [ ] Transaction Submission
- [ ] Confirmation Waiting
- [ ] Success/Error Handling
- [ ] Data Refresh

### Phase 7: Polish
- [ ] Loading States
- [ ] Error States
- [ ] Empty States
- [ ] Tooltips
- [ ] Mobile Responsive
- [ ] Accessibility

---

## Open Questions

1. **Planner Feature (Lend)**:
   - What is the purpose of the "Planner" dropdown?
   - Should it show position projections?
   - APY calculator?
   - Risk assessment?

2. **Balance Tracking (Lend)**:
   - Design notes mention tracking earned interest is "risky"
   - Should we show estimated vs. actual earnings?
   - Real-time vs. snapshot-based?
   - API support needed from Vaults.fyi?

3. **Multiple Positions (Fixed Yield)**:
   - Can user have multiple positions in same vault with different maturity dates?
   - Or only multiple entries into same maturity date?
   - How to display if >2 positions?

4. **Rollover Mechanics**:
   - Does rollover execute claim + re-enter in one transaction?
   - Or two separate transactions?
   - What if user wants partial rollover?

5. **Cap Enforcement**:
   - Is cap per user or global?
   - Real-time cap tracking or snapshot?
   - What happens if cap is reached mid-transaction?

6. **Asset Selection**:
   - Fixed Yield shows asset dropdown
   - What assets are available?
   - Does it change based on vault compatibility?
   - How to fetch asset list?

---

## Appendix

### Tab Mapping

```typescript
const TAB_CONFIGS = {
  "liquid-staking": {
    noPosition: ["stake"],
    hasPosition: ["stake", "withdraw"]
  },
  "lend": {
    noPosition: ["supply"],
    hasPosition: ["supply", "withdraw"]
  },
  "fixed-yield": {
    noPosition: ["enter"],
    active: ["add-funds", "swap"],
    matured: ["claim", "rollover"]
  }
};
```

### Action to API Mapping

```typescript
const ACTION_TO_ENDPOINT = {
  "stake": "deposit",
  "withdraw": "withdraw",
  "supply": "deposit",
  "enter": "deposit",
  "add-funds": "deposit",
  "swap": "swap",
  "claim": "claim",
  "rollover": "rollover"
};
```

### Default Tab Selection

```typescript
function getDefaultTab(type: OpportunityType, hasPosition: boolean, state?: string) {
  if (!hasPosition) {
    return type === "liquid-staking" ? "stake" :
           type === "lend" ? "supply" :
           "enter";
  }

  if (type === "fixed-yield") {
    if (state === "matured") return "claim";
    if (state === "active") return "add-funds";
  }

  return type === "liquid-staking" ? "stake" :
         type === "lend" ? "supply" :
         "add-funds";
}
```

---

**End of Document**
