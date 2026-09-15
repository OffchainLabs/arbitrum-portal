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
 * Keep this module dependency-free.
 */
export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase();
}
