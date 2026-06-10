# Address Adapter Options

This note compares approaches for validating and normalizing addresses without requiring callers to know whether an address belongs to EVM, Solana, or another supported wallet ecosystem.

## Option 1: Exported Ecosystem Adapter Registry

```ts
export const addressEcosystemAdapters = {
  evm: { isAddress, normalize },
  solana: { isAddress, normalize },
} satisfies Record<WalletEcosystem, AddressEcosystemAdapter>;
```

`addressesEqual` iterates through the registry to find an adapter that recognizes each address.

```ts
export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  if (address1 === undefined || address2 === undefined) {
    return address1 === address2;
  }

  const normalizeAddress = (address: string) => {
    for (const adapter of Object.values(addressEcosystemAdapters)) {
      if (adapter.isAddress(address)) {
        return adapter.normalize(address);
      }
    }

    return undefined;
  };

  const normalizedAddress1 = normalizeAddress(address1);
  const normalizedAddress2 = normalizeAddress(address2);

  return (
    normalizedAddress1 !== undefined &&
    normalizedAddress2 !== undefined &&
    normalizedAddress1 === normalizedAddress2
  );
}
```

### Advantages

- Enforces support for every `WalletEcosystem` at compile time.
- Uses a simple functional implementation.
- Makes individual handlers directly testable and reusable.

### Disadvantages

- Exposes ecosystem-specific implementation publicly.
- Allows callers to bypass the intended ecosystem-agnostic abstraction.
- Separate `isAddress` and `normalize` calls may parse the same address twice.

## Option 2: AddressAdapter Class

```ts
const adapter = new AddressAdapter(address);
adapter.isValid();
adapter.normalize();
```

The class detects the address ecosystem internally and caches the normalized result. Its private handler registry remains exhaustive:

```ts
const addressEcosystemHandlers = {
  evm: { normalize },
  solana: { normalize },
} satisfies Record<WalletEcosystem, AddressEcosystemHandler>;
```

```ts
export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  if (address1 === undefined || address2 === undefined) {
    return address1 === address2;
  }

  const normalizedAddress1 = new AddressAdapter(address1).normalize();
  const normalizedAddress2 = new AddressAdapter(address2).normalize();

  return (
    normalizedAddress1 !== undefined &&
    normalizedAddress2 !== undefined &&
    normalizedAddress1 === normalizedAddress2
  );
}
```

### Advantages

- Keeps ecosystem detection private.
- Enforces support for every `WalletEcosystem` at compile time.
- Parses each address once per instance.
- Provides a clear ecosystem-agnostic caller API.

### Disadvantages

- Verbose.
- Creates one object for each address being processed.

## Option 3: Simple Internal Format Detection

```ts
function normalizeAddress(address: string): string | undefined {
  const trimmedAddress = address.trim();

  if (utils.isAddress(trimmedAddress)) {
    return trimmedAddress.toLowerCase();
  }

  try {
    return new PublicKey(trimmedAddress).toBase58();
  } catch {
    return undefined;
  }
}
```

```ts
export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  if (address1 === undefined || address2 === undefined) {
    return address1 === address2;
  }

  const normalizedAddress1 = normalizeAddress(address1);
  const normalizedAddress2 = normalizeAddress(address2);

  return (
    normalizedAddress1 !== undefined &&
    normalizedAddress2 !== undefined &&
    normalizedAddress1 === normalizedAddress2
  );
}
```

### Advantages

- Has the smallest implementation.
- Does not expose ecosystem details to callers.
- Requires no class or registry abstraction.

### Disadvantages

- Does not enforce support when a new `WalletEcosystem` is added.
- Ecosystem support can silently become incomplete.
- Becomes harder to organize as more ecosystems are introduced.
