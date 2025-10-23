# SDK Reference

### Installation&#x20;

For installation instructions use [](https://docs.vaults.fyi/api/getting-started-with-the-sdk 'mention')

### SDK references

{% tabs %}
{% tab title="Javascript" %}
**`getAllVaults(params?)`**

Get information about all available vaults.

```typescript
const vaults = await sdk.getAllVaults({
  query: {
    page: 0,
    perPage: 100,
    allowedNetworks: ['mainnet', 'polygon'],
    allowedProtocols: ['aave', 'compound'],
    allowedAssets: ['USDC', 'USDT'],
    minTvl: 1000000,
    maxTvl: 100000000,
    onlyTransactional: true,
    onlyAppFeatured: false,
  },
});
```

**`getVault(params)`**

Get detailed information about a specific vault.

```typescript
const vault = await sdk.getVault({
  path: {
    network: 'mainnet',
    vaultAddress: '0x1234...',
  },
});
```

#### Historical Data Methods

**`getVaultHistoricalData(params)`**

Get historical APY and TVL data for a vault.

```typescript
const historicalData = await sdk.getVaultHistoricalData({
  path: {
    network: 'mainnet',
    vaultAddress: '0x1234...',
  },
  query: {
    page: 0,
    perPage: 100,
    apyInterval: '30day',
    fromTimestamp: 1640995200,
    toTimestamp: 1672531200,
  },
});
```

#### Portfolio Methods

**`getPositions(params)`**

Get all positions for a user address.

```typescript
const positions = await sdk.getPositions({
  path: {
    userAddress: '0x1234...',
  },
  query: {
    allowedNetworks: ['mainnet', 'polygon'],
  },
});
```

**`getDepositOptions(params)`**

Get the best deposit options for a user.

```typescript
const options = await sdk.getDepositOptions({
  path: {
    userAddress: '0x1234...',
  },
  query: {
    allowedNetworks: ['mainnet', 'polygon'],
    allowedAssets: ['USDC', 'USDT'],
    allowedProtocols: ['aave', 'compound'],
    minTvl: 1000000,
    minUsdAssetValueThreshold: 1000,
    onlyTransactional: true,
    onlyAppFeatured: false,
    apyInterval: '7day',
    alwaysReturnAssets: ['USDC'],
    maxVaultsPerAsset: 5,
  },
});
```

**`getIdleAssets(params)`**

Get idle assets in a user's wallet that could be earning yield.

```typescript
const idleAssets = await sdk.getIdleAssets({
  path: {
    userAddress: '0x1234...',
  },
});
```

**`getVaultTotalReturns(params)`**

Get total returns for a specific user and vault.

```typescript
const returns = await sdk.getVaultTotalReturns({
  path: {
    userAddress: '0x1234...',
    network: 'mainnet',
    vaultAddress: '0x5678...',
  },
});
```

**`getVaultHolderEvents(params)`**

Get events (deposits, withdrawals) for a specific user and vault.

```typescript
const events = await sdk.getVaultHolderEvents({
  path: {
    userAddress: '0x1234...',
    network: 'mainnet',
    vaultAddress: '0x5678...',
  },
});
```

#### Transaction Methods

**`getTransactionsContext(params)`**

Get transaction context for a specific vault interaction.

```typescript
const context = await sdk.getTransactionsContext({
  path: {
    userAddress: '0x1234...',
    network: 'mainnet',
    vaultAddress: '0x5678...',
  },
});
```

**`getActions(params)`**

Get available actions (deposit, withdraw, etc.) for a vault.

```typescript
const actions = await sdk.getActions({
  path: {
    action: 'deposit',
    userAddress: '0x1234...',
    network: 'mainnet',
    vaultAddress: '0x5678...',
  },
  query: {
    assetAddress: '0xA0b86a33E6b2e7d8bB9bdB1c23f6fD7b52b5c8e2',
    amount: '1000000000',
    simulate: false,
  },
});
```

#### Benchmark Methods

(WIP)

### Error Handling

The SDK throws `HttpResponseError` for API errors:

```typescript
import { HttpResponseError, VaultsSdk } from 'vaultsfyi';

try {
  const vault = await sdk.getVault({
    path: {
      network: 'mainnet',
      vaultAddress: 'invalid-address',
    },
  });
} catch (error) {
  if (error instanceof HttpResponseError) {
    console.error('API Error:', error.message);
  }
}
```

### TypeScript Support

This SDK is written in TypeScript and provides full type safety. All API responses are properly typed based on the OpenAPI specification.

```typescript
// Types are automatically inferred
const vaults = await sdk.getAllVaults(); // Type: DetailedVault[]
const vault = await sdk.getVault({
  /* ... */
}); // Type: DetailedVault
```

### License

MIT License - see the LICENSE file for details.
{% endtab %}

{% tab title="Python" %}
[**`https://github.com/WallfacerLabs/python-sdk`**](https://github.com/WallfacerLabs/python-sdk)

{% endtab %}
{% endtabs %}
