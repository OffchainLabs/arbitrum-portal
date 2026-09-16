import { utils } from 'ethers';

const evmAddressPattern = /^0x[0-9a-fA-F]{40}$/;
const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isValidSolanaAddress(address: string): boolean {
  if (!address || [...address].some((character) => !base58Alphabet.includes(character))) {
    return false;
  }

  const bytes = [0];

  for (const character of address) {
    let carry = base58Alphabet.indexOf(character);

    for (let index = 0; index < bytes.length; index++) {
      carry += (bytes[index] ?? 0) * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  const leadingZeroCount = [...address].findIndex((character) => character !== '1');
  const decodedLength =
    bytes.length + (leadingZeroCount === -1 ? address.length - 1 : leadingZeroCount);

  return decodedLength === 32;
}

export class AddressAdapter {
  constructor(private readonly address: string) {}

  normalize(): string {
    return evmAddressPattern.test(this.address) ? this.address.toLowerCase() : this.address;
  }

  isValidAddress(): boolean {
    return utils.isAddress(this.address) || isValidSolanaAddress(this.address);
  }
}

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  if (address1 === undefined || address2 === undefined) {
    return address1 === address2;
  }

  return new AddressAdapter(address1).normalize() === new AddressAdapter(address2).normalize();
}
