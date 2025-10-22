# Arbitrum Portal - Earn API Service Specification

## Overview

This document outlines the API architecture for the Arbitrum Portal Earn feature, which leverages [Vaults.fyi API](https://api.vaults.fyi) as the underlying data provider. The spec defines internal API routes, service layer architecture, data transformation logic, and integration patterns.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Service Layer](#service-layer)
4. [Data Models](#data-models)
5. [Vaults.fyi Integration](#vaultsfyi-integration)
6. [Caching Strategy](#caching-strategy)
7. [Error Handling](#error-handling)

---

## Architecture Overview

### Stack

- **Backend**: Next.js API Routes (App Router)
- **External API**: Vaults.fyi API v2
- **Network Filter**: Arbitrum (primary), with option to expand
- **Caching**: Next.js Cache with revalidation
- **Type Safety**: TypeScript with Zod validation

### Data Flow

```
User Browser → Next.js API Routes → Service Layer → Vaults.fyi API
                      ↓
                 Cache Layer
                      ↓
                Data Transform
                      ↓
              Frontend Components
```

---

## API Endpoints

### 1. Opportunities (Discovery)

#### `GET /api/earn/opportunities`

**Purpose**: Fetch all available vault opportunities on Arbitrum for discovery page with advanced filtering, sorting, and search.

**Query Parameters**:

- `search` (optional): Search query (searches vault name, protocol, asset symbol)
- `chains[]` (optional): Array of chain filters (e.g., `["arbitrum", "arbitrum-nova"]`)
- `types[]` (optional): Array of opportunity types (e.g., `["Lend", "Liquid Staking"]`)
- `tokens[]` (optional): Array of asset symbols (e.g., `["ETH", "WBTC", "ARB"]`)
- `protocols[]` (optional): Array of protocol IDs (e.g., `["aave-v3", "compound-v3"]`)
- `minTvl` (optional): Minimum TVL in USD (default: 100000)
- `maxTvl` (optional): Maximum TVL in USD
- `minApy` (optional): Minimum APY percentage
- `maxApy` (optional): Maximum APY percentage
- `sortBy` (optional): Sort field ("apy" | "tvl" | "protocol" | "name") (default: "apy")
- `sortOrder` (optional): "asc" | "desc" (default: "desc")
- `page` (optional): Page number (default: 0)
- `perPage` (optional): Items per page (default: 50, max: 100)

**Filter Logic**:

- Within same category (OR): `tokens[]=ETH&tokens[]=WBTC` → vaults with ETH OR WBTC
- Across categories (AND): `types[]=Lend&protocols[]=aave-v3` → Lend vaults AND Aave protocol
- Search combines with filters using AND

**Response**:

```typescript
{
  opportunities: Array<{
    id: string; // Composite: `${network}-${vaultAddress}`
    vault: string; // Vault name
    vaultAddress: string; // Contract address
    type: 'Lend' | 'Liquid Staking' | 'Fixed Yield';
    apy: number | null; // For Lend/Liquid Staking
    fixedApy: number | null; // For Fixed Yield
    tvl: number; // Total Value Locked in USD
    liquidity: string | null; // For Fixed Yield
    network: {
      name: string;
      chainId: number;
      icon?: string;
    };
    protocol: {
      name: string;
      logo?: string;
      url?: string;
    };
    asset: {
      symbol: string;
      name: string;
      address: string;
      logo?: string;
      priceUsd: number;
    };
    badge?: string; // Special labels
    risk?: {
      score: number; // 0-100
      category: string;
    };
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  }
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/detailed-vaults` with `network=arbitrum` filter
- Fetch all pages and aggregate (with caching)
- Transform tags to opportunity types
- Apply client-side filtering for multi-select
- Apply search across vault name, protocol name, asset symbol
- Sort and paginate results

---

### 1b. Filter Metadata

#### `GET /api/earn/filters/metadata`

**Purpose**: Get available filter options with counts for the filter UI.

**Query Parameters**:

- `chain` (optional): Pre-filter for a specific chain (default: "arbitrum")

**Response**:

```typescript
{
  availableFilters: {
    chains: Array<{
      id: string;              // "arbitrum"
      name: string;            // "Arbitrum"
      count: number;           // Number of vaults on this chain
      icon?: string;
    }>;
    types: Array<{
      id: string;              // "lend"
      name: string;            // "Lend"
      count: number;           // Number of vaults of this type
    }>;
    tokens: Array<{
      symbol: string;          // "ETH"
      name: string;            // "Ethereum"
      count: number;           // Number of vaults with this token
      logo?: string;
    }>;
    protocols: Array<{
      id: string;              // "aave-v3"
      name: string;            // "Aave v3"
      version?: string;        // "3.0"
      count: number;           // Number of vaults for this protocol
      logo?: string;
    }>;
  };
  sortOptions: Array<{
    value: string;             // "apy"
    label: string;             // "APY (Highest)"
    default?: boolean;
  }>;
  appliedFilters?: {           // If filters are active
    chains: string[];
    types: string[];
    tokens: string[];
    protocols: string[];
  };
}
```

**Vaults.fyi Mapping**:

- Aggregate data from `GET /v2/detailed-vaults` response
- Count unique values per filter category
- Cache aggressively (15 min TTL)

---

### 2. User Positions

#### `GET /api/earn/positions/{userAddress}`

**Purpose**: Fetch user's active positions across all vaults.

**Path Parameters**:

- `userAddress`: Ethereum address (0x...)

**Query Parameters**:

- `network` (optional): Network filter (default: "arbitrum")
- `minValue` (optional): Minimum position value in USD (default: 1)

**Response**:

```typescript
{
  positions: Array<{
    id: string;
    vault: string;
    vaultAddress: string;
    type: 'Lend' | 'Liquid Staking' | 'Fixed Yield';
    apy: number;
    deposited: {
      amount: number; // In asset units
      token: string;
      usdValue: number;
    };
    earnings: {
      percentage: number;
      usdValue: number;
      unrealized: number;
    } | null;
    network: {
      name: string;
      chainId: number;
    };
    protocol: {
      name: string;
      logo?: string;
    };
    currentValue: number; // Current position value in USD
    entryPrice: number; // Entry price per share
    currentPrice: number; // Current price per share
  }>;
  summary: {
    totalPositions: number; // Total USD value
    totalEarnings: number; // Total earnings USD
    netApy: number; // Weighted average APY
    breakdown: {
      fixedYield: number; // Percentage
      lending: number; // Percentage
      liquidStaking: number; // Percentage
    }
  }
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/portfolio/positions/{userAddress}` with `allowedNetworks=["arbitrum"]`
- Fetch detailed vault info for each position
- Calculate weighted APY based on position sizes
- Compute breakdown percentages

---

### 3. Opportunity Detail

#### `GET /api/earn/opportunities/{network}/{vaultAddress}`

**Purpose**: Get comprehensive details for a specific vault/opportunity.

**Path Parameters**:

- `network`: Network name (e.g., "arbitrum")
- `vaultAddress`: Vault contract address

**Response**:

```typescript
{
  opportunity: {
    id: string;
    vault: string;
    vaultAddress: string;
    type: string;
    apy: {
      current: number;
      day7: number;
      day15: number;
      day30: number;
    };
    tvl: {
      current: number;
      change24h: number;           // Percentage
      history: Array<{             // Last 30 days
        timestamp: number;
        value: number;
      }>;
    };
    network: { /* ... */ };
    protocol: {
      name: string;
      product: string;
      version: string;
      description: string;
      logo?: string;
      url?: string;
    };
    asset: { /* ... */ };
    statistics: {
      totalStaked: number;         // In USD
      totalStakers: number;
      averagePosition: number;     // In USD
      sharePrice: number;
    };
    rewards: Array<{
      token: string;
      apy: number;
      value: number;               // In USD
    }>;
    risk: {
      score: number;
      factors: Array<{
        category: string;
        score: number;
        description: string;
      }>;
    };
    fees: {
      deposit: number;             // Percentage
      withdrawal: number;          // Percentage
      performance: number;         // Percentage
      management: number;          // Percentage
    };
    limits: {
      minDeposit: number;          // In asset units
      maxDeposit: number | null;   // null = unlimited
      depositCap: number | null;
    };
  };
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/detailed-vaults/{network}/{vaultAddress}`
- Use `GET /v2/historical/{network}/{vaultAddress}` for TVL history
- Use `GET /v2/detailed-vaults/{network}/{vaultAddress}/apy` for APY breakdown
- Aggregate rewards data
- Transform risk scores

---

### 4. Position Detail

#### `GET /api/earn/positions/{userAddress}/{network}/{vaultAddress}`

**Purpose**: Get detailed information about a user's specific position.

**Path Parameters**:

- `userAddress`: User's Ethereum address
- `network`: Network name
- `vaultAddress`: Vault contract address

**Response**:

```typescript
{
  position: {
    id: string;
    vault: string;
    deposited: {
      amount: number;
      token: string;
      usdValue: number;
      timestamp: number; // Entry timestamp
    }
    currentValue: {
      amount: number;
      usdValue: number;
    }
    earnings: {
      realized: number; // Claimed rewards in USD
      unrealized: number; // Pending rewards in USD
      total: number;
      percentage: number;
    }
    apy: {
      current: number;
      average: number; // Since entry
    }
    history: Array<{
      timestamp: number;
      action: 'deposit' | 'withdraw' | 'claim';
      amount: number;
      txHash: string;
    }>;
    rewards: {
      claimable: Array<{
        token: string;
        amount: number;
        usdValue: number;
      }>;
      claimed: Array<{
        token: string;
        amount: number;
        usdValue: number;
        timestamp: number;
      }>;
    }
  }
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/portfolio/positions/{userAddress}/{network}/{vaultAddress}`
- Use `GET /v2/portfolio/total-returns/{userAddress}/{network}/{vaultAddress}`
- Use `GET /v2/portfolio/events/{userAddress}/{network}/{vaultAddress}` for history

---

### 5. Best Opportunities

#### `GET /api/earn/recommendations/{userAddress}`

**Purpose**: Get personalized vault recommendations based on user's idle assets.

**Path Parameters**:

- `userAddress`: User's Ethereum address

**Query Parameters**:

- `network` (optional): Network filter (default: "arbitrum")

**Response**:

```typescript
{
  recommendations: Array<{
    opportunity: {
      /* Same as opportunity detail */
    };
    reason: string; // Why this is recommended
    potentialYield: number; // Estimated annual yield in USD
    riskLevel: 'low' | 'medium' | 'high';
    matchScore: number; // 0-100
  }>;
  idleAssets: Array<{
    token: string;
    balance: number;
    usdValue: number;
  }>;
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/portfolio/idle-assets/{userAddress}`
- Use `GET /v2/portfolio/best-deposit-options/{userAddress}`
- Calculate match scores based on risk tolerance and asset composition

---

### 6. Historical Data

#### `GET /api/earn/opportunities/{network}/{vaultAddress}/history`

**Purpose**: Get historical performance data for charts.

**Path Parameters**:

- `network`: Network name
- `vaultAddress`: Vault contract address

**Query Parameters**:

- `metric`: "apy" | "tvl" | "sharePrice"
- `interval`: "1day" | "7day" | "30day" | "90day" | "1year" | "all"
- `resolution`: "hourly" | "daily" | "weekly" (default: auto based on interval)

**Response**:

```typescript
{
  data: Array<{
    timestamp: number;
    value: number;
  }>;
  metadata: {
    metric: string;
    interval: string;
    resolution: string;
    firstDataPoint: number;
    lastDataPoint: number;
  }
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/historical/{network}/{vaultAddress}/apy`
- Use `GET /v2/historical/{network}/{vaultAddress}/tvl`
- Use `GET /v2/historical/{network}/{vaultAddress}/sharePrice`
- Downsample data based on resolution

---

### 7. Transaction Context

#### `GET /api/earn/transactions/context/{userAddress}/{network}/{vaultAddress}`

**Purpose**: Get transaction context for deposit/withdraw actions.

**Path Parameters**:

- `userAddress`: User's Ethereum address
- `network`: Network name
- `vaultAddress`: Vault contract address

**Query Parameters**:

- `action`: "deposit" | "withdraw"

**Response**:

```typescript
{
  context: {
    vaultAddress: string;
    userAddress: string;
    action: 'deposit' | 'withdraw';
    asset: {
      address: string;
      symbol: string;
      decimals: number;
      balance: number; // User's balance
    }
    vault: {
      shareToken: {
        address: string;
        symbol: string;
        decimals: number;
        balance: number; // User's vault shares
      }
      exchangeRate: number; // Asset per share
      limits: {
        minAmount: number;
        maxAmount: number;
      }
    }
    allowance: {
      current: number; // Current allowance
      required: boolean; // If approval needed
    }
    fees: {
      deposit: number;
      withdrawal: number;
      gas: {
        estimated: number; // In wei
        usdValue: number;
      }
    }
  }
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/transactions/context/{userAddress}/{network}/{vaultAddress}`

---

### 8. Transaction Preparation

#### `GET /api/earn/transactions/{action}/{userAddress}/{network}/{vaultAddress}`

**Purpose**: Get transaction data for execution.

**Path Parameters**:

- `action`: "deposit" | "withdraw"
- `userAddress`: User's Ethereum address
- `network`: Network name
- `vaultAddress`: Vault contract address

**Query Parameters**:

- `amount`: Amount in asset units (string to preserve precision)

**Response**:

```typescript
{
  transactions: Array<{
    to: string; // Contract address
    data: string; // Encoded transaction data
    value: string; // ETH value (if needed)
    description: string; // Human-readable description
    gasLimit: string;
  }>;
  summary: {
    action: string;
    amount: number;
    expectedOutput: number; // Expected shares/assets
    priceImpact: number; // Percentage
    totalFees: number; // In USD
  }
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/transactions/{action}/{userAddress}/{network}/{vaultAddress}`

---

### 9. Educational Content

#### `GET /api/earn/education`

**Purpose**: Fetch educational resources and tutorials.

**Query Parameters**:

- `category` (optional): "intro" | "advanced" | "blog"

**Response**:

```typescript
{
  content: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    thumbnail?: string;
    url?: string;
    readTime?: number; // Minutes
  }>;
}
```

**Vaults.fyi Mapping**:

- Static content or CMS integration
- Could use `GET /v2/tags` to categorize content

---

### 10. Networks & Assets

#### `GET /api/earn/networks`

**Purpose**: Get supported networks.

**Response**:

```typescript
{
  networks: Array<{
    name: string;
    chainId: number;
    networkCaip: string;
    rpcUrl: string;
    blockExplorer: string;
    icon?: string;
    isSupported: boolean;
  }>;
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/networks`
- Filter for Arbitrum + other supported networks

#### `GET /api/earn/assets`

**Purpose**: Get supported assets.

**Query Parameters**:

- `network` (optional): Filter by network

**Response**:

```typescript
{
  assets: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logo?: string;
    priceUsd: number;
    network: string;
    group: 'ETH' | 'USD' | 'BTC' | 'OTHER';
  }>;
}
```

**Vaults.fyi Mapping**:

- Use `GET /v2/assets` with network filter

---

## Service Layer

### File Structure

```
packages/app/src/
├── lib/
│   ├── earn/
│   │   ├── services/
│   │   │   ├── vaults.service.ts       # Vaults.fyi client
│   │   │   ├── opportunities.service.ts # Opportunity logic
│   │   │   ├── positions.service.ts     # Position logic
│   │   │   ├── transactions.service.ts  # Transaction prep
│   │   │   └── cache.service.ts         # Caching utilities
│   │   ├── transformers/
│   │   │   ├── opportunity.transformer.ts
│   │   │   ├── position.transformer.ts
│   │   │   └── vault.transformer.ts
│   │   ├── validators/
│   │   │   └── earn.validators.ts       # Zod schemas
│   │   ├── types.ts
│   │   └── constants.ts
│   └── api/
│       └── vaults-client.ts             # HTTP client
├── app/
│   └── api/
│       └── earn/
│           ├── opportunities/
│           │   ├── route.ts
│           │   └── [network]/
│           │       └── [vaultAddress]/
│           │           └── route.ts
│           ├── positions/
│           │   └── [userAddress]/
│           │       ├── route.ts
│           │       └── [network]/
│           │           └── [vaultAddress]/
│           │               └── route.ts
│           ├── transactions/
│           │   ├── context/
│           │   │   └── [...]/route.ts
│           │   └── [action]/
│           │       └── [...]/route.ts
│           ├── recommendations/
│           │   └── [userAddress]/
│           │       └── route.ts
│           ├── networks/
│           │   └── route.ts
│           └── assets/
│               └── route.ts
```

---

### Core Services

#### VaultsService (`vaults.service.ts`)

**Responsibilities**:

- Wrapper around Vaults.fyi API client
- Handle authentication (API key injection)
- Request/response logging
- Error normalization

**Methods**:

```typescript
class VaultsService {
  async getVaults(params: GetVaultsParams): Promise<VaultsResponse>;
  async getDetailedVault(network: string, address: string): Promise<DetailedVault>;
  async getDetailedVaults(params: GetDetailedVaultsParams): Promise<DetailedVaultsResponse>;
  async getHistoricalData(
    network: string,
    address: string,
    metric: string,
  ): Promise<HistoricalData>;
  async getUserPositions(userAddress: string, params: PositionsParams): Promise<PositionsResponse>;
  async getTransactionContext(params: TxContextParams): Promise<TransactionContext>;
  async getTransactionData(params: TxDataParams): Promise<TransactionData>;
}
```

#### OpportunitiesService (`opportunities.service.ts`)

**Responsibilities**:

- Fetch and transform opportunities
- Apply Arbitrum-specific filtering
- Categorize by type (Lend, Liquid Staking, Fixed Yield)
- Sort and paginate

**Methods**:

```typescript
class OpportunitiesService {
  async getOpportunities(filters: OpportunityFilters): Promise<OpportunitiesResponse>;
  async getOpportunityDetail(network: string, address: string): Promise<OpportunityDetail>;
  async getOpportunityHistory(
    network: string,
    address: string,
    params: HistoryParams,
  ): Promise<HistoricalData>;
  private categorizeOpportunity(vault: DetailedVault): OpportunityType;
  private calculateRiskScore(vault: DetailedVault): RiskScore;
}
```

#### PositionsService (`positions.service.ts`)

**Responsibilities**:

- Fetch user positions
- Calculate portfolio summary
- Compute earnings and APY
- Aggregate position data

**Methods**:

```typescript
class PositionsService {
  async getUserPositions(
    userAddress: string,
    filters?: PositionFilters,
  ): Promise<UserPositionsResponse>;
  async getPositionDetail(
    userAddress: string,
    network: string,
    vaultAddress: string,
  ): Promise<PositionDetail>;
  async getPortfolioSummary(userAddress: string): Promise<PortfolioSummary>;
  private calculateWeightedApy(positions: Position[]): number;
  private calculateBreakdown(positions: Position[]): BreakdownPercentages;
}
```

#### TransactionsService (`transactions.service.ts`)

**Responsibilities**:

- Prepare transaction context
- Build transaction data
- Calculate fees and slippage

**Methods**:

```typescript
class TransactionsService {
  async getTransactionContext(
    userAddress: string,
    network: string,
    vaultAddress: string,
    action: TxAction,
  ): Promise<TxContext>;
  async prepareTransaction(params: PrepareTxParams): Promise<PreparedTransaction>;
  async estimateGas(tx: Transaction): Promise<GasEstimate>;
}
```

---

## Data Models

### Core Types

```typescript
// Opportunity Types
type OpportunityType = 'Lend' | 'Liquid Staking' | 'Fixed Yield';

interface Opportunity {
  id: string;
  vault: string;
  vaultAddress: string;
  type: OpportunityType;
  apy: number | null;
  fixedApy: number | null;
  tvl: number;
  network: NetworkInfo;
  protocol: ProtocolInfo;
  asset: AssetInfo;
  badge?: string;
  risk?: RiskInfo;
}

// Position Types
interface Position {
  id: string;
  vault: string;
  vaultAddress: string;
  type: OpportunityType;
  apy: number;
  deposited: DepositedInfo;
  earnings: EarningsInfo | null;
  network: NetworkInfo;
  protocol: ProtocolInfo;
  currentValue: number;
}

// Supporting Types
interface NetworkInfo {
  name: string;
  chainId: number;
  networkCaip: string;
  icon?: string;
}

interface ProtocolInfo {
  name: string;
  product?: string;
  version?: string;
  logo?: string;
  url?: string;
  description?: string;
}

interface AssetInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logo?: string;
  priceUsd: number;
  group: 'ETH' | 'USD' | 'BTC' | 'EURO' | 'OTHER';
}

interface RiskInfo {
  score: number; // 0-100
  category: 'low' | 'medium' | 'high';
  factors?: Array<{
    category: string;
    score: number;
    description: string;
  }>;
}

interface DepositedInfo {
  amount: number;
  token: string;
  usdValue: number;
  timestamp?: number;
}

interface EarningsInfo {
  percentage: number;
  usdValue: number;
  unrealized: number;
  realized?: number;
}

interface PortfolioSummary {
  totalPositions: number;
  totalEarnings: number;
  netApy: number;
  breakdown: {
    fixedYield: number;
    lending: number;
    liquidStaking: number;
  };
}
```

---

## Vaults.fyi Integration

### API Client Configuration

```typescript
// lib/api/vaults-client.ts
import { createClient } from '@vaults.fyi/sdk';

// If SDK exists, or custom implementation

const vaultsClient = createClient({
  baseUrl: process.env.VAULTS_API_URL || 'https://api.vaults.fyi',
  apiKey: process.env.VAULTS_API_KEY!,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
});

export default vaultsClient;
```

### Environment Variables

```bash
VAULTS_API_URL=https://api.vaults.fyi
VAULTS_API_KEY=<your-api-key>
VAULTS_API_CACHE_TTL=300 # 5 minutes
```

### Rate Limiting

- Implement request queuing for high-traffic scenarios
- Cache aggressively to reduce API calls
- Use batch endpoints where possible

### Error Handling

Map Vaults.fyi error codes to user-friendly messages:

- `401` → "API authentication failed"
- `403` → "API quota exceeded"
- `404` → "Vault not found"
- `408` → "Request timeout"
- `500/503` → "Service temporarily unavailable"

---

## Caching Strategy

### Cache Layers

1. **Static Data** (24h TTL):
   - Networks list
   - Assets list
   - Protocol information

2. **Semi-static Data** (5-15 min TTL):
   - Opportunities list
   - Vault details
   - Historical data (older than 1 day)

3. **Dynamic Data** (1-2 min TTL):
   - APY values
   - TVL values
   - User positions

4. **Real-time Data** (No cache):
   - Transaction context
   - Transaction preparation
   - User balances

### Implementation

```typescript
// lib/earn/services/cache.service.ts
export class CacheService {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached || cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### Next.js Cache Integration

```typescript
// 5 minutes
// Or unstable_cache for more control
import { unstable_cache } from 'next/cache';

// Use Next.js native caching
export const revalidate = 300; // 5 minutes

const getCachedOpportunities = unstable_cache(
  async (network: string) => {
    return await opportunitiesService.getOpportunities({ network });
  },
  ['opportunities'],
  { revalidate: 300, tags: ['opportunities'] },
);
```

---

## Error Handling

### Error Types

```typescript
class VaultsAPIError extends Error {
  constructor(
    public statusCode: number,
    public errorId?: string,
    message?: string,
  ) {
    super(message);
  }
}

class ValidationError extends Error {
  constructor(public errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
  }
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  errorId?: string;
  details?: any;
}
```

### API Route Error Handling

```typescript
// app/api/earn/opportunities/route.ts
export async function GET(request: Request) {
  try {
    const opportunities = await opportunitiesService.getOpportunities(params);
    return NextResponse.json(opportunities);
  } catch (error) {
    if (error instanceof VaultsAPIError) {
      return NextResponse.json(
        { error: 'External API error', message: error.message, errorId: error.errorId },
        { status: error.statusCode },
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [ ] Set up API client and authentication
- [ ] Implement base service classes
- [ ] Create data models and validators
- [ ] Set up caching layer
- [ ] Implement error handling

### Phase 2: Opportunities & Discovery

- [ ] `GET /api/earn/opportunities`
- [ ] `GET /api/earn/opportunities/{network}/{vaultAddress}`
- [ ] Opportunity transformers
- [ ] Type categorization logic
- [ ] Frontend integration

### Phase 3: User Positions

- [ ] `GET /api/earn/positions/{userAddress}`
- [ ] `GET /api/earn/positions/{userAddress}/{network}/{vaultAddress}`
- [ ] Portfolio summary calculations
- [ ] Position transformers
- [ ] Frontend integration

### Phase 4: Transactions

- [ ] `GET /api/earn/transactions/context/{...}`
- [ ] `GET /api/earn/transactions/{action}/{...}`
- [ ] Transaction preparation logic
- [ ] Gas estimation
- [ ] Frontend integration with wallet

### Phase 5: Advanced Features

- [ ] `GET /api/earn/recommendations/{userAddress}`
- [ ] Historical data endpoints
- [ ] Educational content
- [ ] Analytics and tracking

---

## Security Considerations

1. **API Key Protection**:
   - Store in environment variables
   - Never expose to client
   - Rotate regularly

2. **Input Validation**:
   - Validate all user inputs with Zod
   - Sanitize Ethereum addresses
   - Check network/vault combinations

3. **Rate Limiting**:
   - Implement rate limiting on API routes
   - Prevent abuse of transaction preparation endpoints

4. **CORS**:
   - Restrict API routes to same-origin
   - Use API key authentication for cross-origin if needed

---

## Testing Strategy

1. **Unit Tests**:
   - Service layer methods
   - Transformers
   - Validators

2. **Integration Tests**:
   - API routes
   - Vaults.fyi integration
   - Cache behavior

3. **E2E Tests**:
   - Full user flows
   - Transaction preparation
   - Error scenarios

4. **Load Tests**:
   - API performance under load
   - Cache effectiveness
   - Rate limit thresholds

---

## Monitoring & Observability

1. **Metrics to Track**:
   - API response times
   - Cache hit/miss ratio
   - Vaults.fyi API error rates
   - User transaction success rates

2. **Logging**:
   - API requests/responses (excluding sensitive data)
   - Error stack traces
   - Performance bottlenecks

3. **Alerts**:
   - Vaults.fyi API downtime
   - High error rates
   - Quota exhaustion warnings

---

## Appendix

### Vaults.fyi Endpoint Summary

| Endpoint                                | Purpose             | Cache TTL | Priority |
| --------------------------------------- | ------------------- | --------- | -------- |
| `/v2/vaults`                            | List all vaults     | 15 min    | High     |
| `/v2/detailed-vaults`                   | Detailed vault info | 5 min     | High     |
| `/v2/detailed-vaults/{network}/{vault}` | Single vault detail | 5 min     | High     |
| `/v2/portfolio/positions/{user}`        | User positions      | 2 min     | High     |
| `/v2/historical/{network}/{vault}`      | Historical data     | 1 hour    | Medium   |
| `/v2/transactions/context/{...}`        | Transaction context | None      | High     |
| `/v2/networks`                          | Networks list       | 24 hours  | Low      |
| `/v2/assets`                            | Assets list         | 1 hour    | Medium   |

### Type Categorization Rules

Map Vaults.fyi tags to opportunity types:

- **Lend**: Tags include "lending", "borrow", "supply"
- **Liquid Staking**: Tags include "staking", "liquid", "LST"
- **Fixed Yield**: Tags include "fixed", "term", "maturity"

### Network Priority

For Arbitrum Portal:

1. **Primary**: Arbitrum (chainId: 42161)
2. **Secondary**: Arbitrum Nova, Arbitrum Sepolia (testnet)
3. **Future**: Cross-chain opportunities (mainnet, optimism, base)
