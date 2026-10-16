import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { fetchErc20Data, getL1ERC20Address } from '../util/TokenUtils';
import { ecosystems } from '../wallet/ecosystems';
import { getParentTokenAddress, getTokenData } from './tokenMetadata';

vi.mock('../util/TokenUtils', () => ({
  fetchErc20Data: vi.fn(),
  getL1ERC20Address: vi.fn(),
  isValidErc20: vi.fn(),
}));
vi.mock('../token-bridge-sdk/utils', () => ({
  getProviderForChainId: () => ({}),
}));

const checksummedAddress = '0x52908400098527886E0F7030069857D2E4169EE7';
const normalizedAddress = checksummedAddress.toLowerCase();
const solanaAddress = 'So11111111111111111111111111111111111111112';

describe.sequential('token metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchErc20Data).mockResolvedValue({
      name: 'Token',
      symbol: 'TKN',
      decimals: 18,
      address: normalizedAddress,
    });
    vi.mocked(getL1ERC20Address).mockResolvedValue(null);
  });

  it.each([checksummedAddress, normalizedAddress])(
    'reads EVM token data for %s with the lowercased address',
    async (address) => {
      await getTokenData(address, ChainId.Ethereum);
      expect(fetchErc20Data).toHaveBeenCalledWith(
        expect.objectContaining({ address: normalizedAddress }),
      );
    },
  );

  it.each(['0x1234', solanaAddress])(
    'rejects %s on an EVM chain before reading',
    async (address) => {
      await expect(getTokenData(address, ChainId.Ethereum)).rejects.toThrow(
        'Invalid token address.',
      );
      await expect(getParentTokenAddress(address, ChainId.ArbitrumOne)).rejects.toThrow(
        'Invalid token address.',
      );
      expect(fetchErc20Data).not.toHaveBeenCalled();
      expect(getL1ERC20Address).not.toHaveBeenCalled();
    },
  );

  it('lowercases a resolved EVM parent token address', async () => {
    vi.mocked(getL1ERC20Address).mockResolvedValue(checksummedAddress);
    await expect(getParentTokenAddress(normalizedAddress, ChainId.ArbitrumOne)).resolves.toEqual({
      address: normalizedAddress,
      hasParentAddress: true,
    });
  });

  it('keeps the Solana token address without a parent lookup', async () => {
    const isEnabled = vi.spyOn(ecosystems.solana, 'isEnabled').mockReturnValue(true);
    try {
      await expect(getParentTokenAddress(solanaAddress, ChainId.Solana)).resolves.toEqual({
        address: solanaAddress,
        hasParentAddress: false,
      });
      expect(getL1ERC20Address).not.toHaveBeenCalled();
    } finally {
      isEnabled.mockRestore();
    }
  });

  it('rejects Solana token data lookups', async () => {
    await expect(getTokenData(solanaAddress, ChainId.Solana)).rejects.toThrow(
      'Token metadata lookup is unavailable for this chain',
    );
    expect(fetchErc20Data).not.toHaveBeenCalled();
  });
});
