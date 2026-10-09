import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as providers from '../../token-bridge-sdk/utils';
import { ChainId } from '../../types/ChainId';
import { useGasPrice } from '../useGasPrice';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.sequential('useGasPrice', () => {
  it('does not invent an EVM gas price for Solana', () => {
    const provider = vi.spyOn(providers, 'getProviderForChainId');
    const { result } = renderHook(() => useGasPrice({ chainId: ChainId.Solana }));
    expect(result.current).toBeUndefined();
    expect(provider).not.toHaveBeenCalled();
  });

  it('returns the EVM provider gas price', async () => {
    const provider = new StaticJsonRpcProvider();
    vi.spyOn(provider, 'getGasPrice').mockResolvedValue(BigNumber.from(123));
    vi.spyOn(providers, 'getProviderForChainId').mockReturnValue(provider);
    const { result } = renderHook(() => useGasPrice({ chainId: ChainId.Ethereum }));
    await waitFor(() => expect(result.current?.toNumber()).toBe(123));
  });
});
