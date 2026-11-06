import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../test-utils/wallet-test-wrapper';
import { ChainId } from '../types/ChainId';
import { getAccountType } from '../util/AccountUtils';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { useAccountType } from './useAccountType';

vi.mock('../util/AccountUtils', () => ({ getAccountType: vi.fn(async () => undefined) }));

const query = { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.sequential('useAccountType', () => {
  it('inspects the source wallet on the source chain', async () => {
    const address = '0x1111111111111111111111111111111111111111';
    const wrapper = createWalletTestWrapper({
      query,
      wallets: {
        ...defaultWalletContextValue,
        evm: {
          ...defaultWalletContextValue.evm,
          account: { ecosystem: 'evm', status: 'connected', address },
        },
      },
    });
    renderHook(() => useAccountType(), { wrapper });
    await waitFor(() =>
      expect(getAccountType).toHaveBeenCalledWith({ address, chainId: ChainId.Ethereum }),
    );
  });

  it('does not inspect a disconnected wallet', () => {
    const wrapper = createWalletTestWrapper({ query, wallets: defaultWalletContextValue });
    const { result } = renderHook(() => useAccountType(), { wrapper });
    expect(result.current.accountType).toBeUndefined();
    expect(getAccountType).not.toHaveBeenCalled();
  });
});
