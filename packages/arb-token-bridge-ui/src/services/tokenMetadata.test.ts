import { utils } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getParentTokenAddress, getTokenData } from './tokenMetadata';

const evm = vi.hoisted(() => ({
  getTokenData: vi.fn(),
  getParentTokenAddress: vi.fn(),
}));

vi.mock('./evm/tokenMetadata', () => evm);

const checksummedAddress = '0x52908400098527886E0F7030069857D2E4169EE7';
const normalizedAddress = checksummedAddress.toLowerCase();
const solanaAddress = 'So11111111111111111111111111111111111111112';

describe.sequential('token metadata service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evm.getParentTokenAddress.mockResolvedValue(null);
  });

  describe.each([
    { name: 'token metadata', lookup: getTokenData, implementation: evm.getTokenData },
    {
      name: 'parent token address',
      lookup: getParentTokenAddress,
      implementation: evm.getParentTokenAddress,
    },
  ])('$name boundary', ({ lookup, implementation }) => {
    it.each([
      checksummedAddress,
      normalizedAddress,
      checksummedAddress.slice(2),
      utils.getIcapAddress(checksummedAddress),
    ])('canonicalizes valid EVM input %s before dispatch', async (address) => {
      await lookup(address, ChainId.Ethereum);
      expect(implementation).toHaveBeenCalledWith(normalizedAddress, ChainId.Ethereum);
    });

    it.each([
      checksummedAddress.replace('E', 'e'),
      '0x1234',
      ' ' + checksummedAddress + ' ',
      solanaAddress,
    ])('rejects invalid EVM input %s before dispatch', async (address) => {
      await expect(lookup(address, ChainId.Ethereum)).rejects.toThrow('Invalid token address.');
      expect(implementation).not.toHaveBeenCalled();
    });
  });

  it('normalizes a resolved EVM parent token address', async () => {
    evm.getParentTokenAddress.mockResolvedValue(checksummedAddress);
    await expect(getParentTokenAddress(normalizedAddress, ChainId.ArbitrumOne)).resolves.toEqual({
      address: normalizedAddress,
      hasParentAddress: true,
    });
  });

  it('preserves Solana token casing without EVM parent lookup', async () => {
    await expect(getParentTokenAddress(solanaAddress, ChainId.Solana)).resolves.toEqual({
      address: solanaAddress,
      hasParentAddress: false,
    });
    expect(evm.getParentTokenAddress).not.toHaveBeenCalled();
  });

  it('rejects unsupported Solana metadata lookup before EVM dispatch', async () => {
    await expect(getTokenData(solanaAddress, ChainId.Solana)).rejects.toThrow(
      'Token metadata lookup is unavailable for this chain',
    );
    expect(evm.getTokenData).not.toHaveBeenCalled();
  });
});
