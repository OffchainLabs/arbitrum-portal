import { ecosystems } from '../wallet/ecosystems';

/**
 * Address comparison lives here, separate from `AddressUtils`, so that config modules can use it
 * without pulling in providers.
 *
 * `AddressUtils` imports `token-bridge-sdk/utils`, which imports
 * `app/api/crosschain-transfers/utils`, which imports `util/TokenListUtils`, which reads
 * `lifiDestinationChainIds` from `app/api/crosschain-transfers/constants` at module scope. Importing
 * `AddressUtils` from that constants module therefore closes a cycle and leaves
 * `lifiDestinationChainIds` undefined while the module is still initializing.
 *
 * Only import modules without provider or network dependencies here, such as the ecosystem configs.
 */
function normalizeForComparison(address: string) {
  const adapter = Object.values(ecosystems)
    .map((ecosystem) => ecosystem.address)
    // case sensitivity comes from the format, so disabled ecosystems still count
    .find((adapter) => adapter.isValid(address, { ignoreFeatureFlag: true }));
  // Unknown formats compare case-insensitively
  return adapter ? adapter.normalize(address) : address.toLowerCase();
}

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  const trimmed1 = address1?.trim();
  const trimmed2 = address2?.trim();
  if (trimmed1 === trimmed2) return true;
  if (!trimmed1 || !trimmed2 || trimmed1.toLowerCase() !== trimmed2.toLowerCase()) return false;
  // Same characters in a different case: equal unless the ecosystem's addresses are case-sensitive
  return normalizeForComparison(trimmed1) === normalizeForComparison(trimmed2);
}
