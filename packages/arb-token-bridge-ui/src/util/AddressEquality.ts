const evmAddressPattern = /^0x[0-9a-f]{40}$/i;

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  if (!address1 || !address2) return false;
  if (evmAddressPattern.test(address1) && evmAddressPattern.test(address2)) {
    return address1.toLowerCase() === address2.toLowerCase();
  }
  return address1 === address2;
}
