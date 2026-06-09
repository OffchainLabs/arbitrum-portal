import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { BalanceContext } from '../../providers/BalanceProvider';
import type { EvmBalanceHandle, SolanaBalanceHandle } from '../../types';
import { useBalance } from '../useBalance';

function createWrapper({ evm, solana }: { evm: EvmBalanceHandle; solana: SolanaBalanceHandle }) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <BalanceContext.Provider value={{ evm, solana }}>{children}</BalanceContext.Provider>;
  };
}

describe('wallet/hooks/useBalance', () => {
  it.each([
    { chainId: ChainId.Ethereum, ecosystem: 'evm' as const },
    { chainId: ChainId.Solana, ecosystem: 'solana' as const },
  ])('uses the $ecosystem balance provider', async ({ chainId, ecosystem }) => {
    const evmFetchBalance = vi.fn().mockResolvedValue({});
    const solanaFetchBalance = vi.fn().mockResolvedValue({});
    const evm: EvmBalanceHandle = {
      ecosystem: 'evm',
      fetchBalance: evmFetchBalance,
    };
    const solana: SolanaBalanceHandle = {
      ecosystem: 'solana',
      fetchBalance: solanaFetchBalance,
    };
    const { result } = renderHook(() => useBalance({ chainId }), {
      wrapper: createWrapper({ evm, solana }),
    });

    await result.current.fetchBalance({
      walletAddress: 'wallet-address',
      tokenAddresses: ['token-address'],
    });

    const selectedFetchBalance = ecosystem === 'solana' ? solanaFetchBalance : evmFetchBalance;
    const unselectedFetchBalance = ecosystem === 'solana' ? evmFetchBalance : solanaFetchBalance;

    expect(selectedFetchBalance).toHaveBeenCalledWith({
      chainId,
      walletAddress: 'wallet-address',
      tokenAddresses: ['token-address'],
    });
    expect(unselectedFetchBalance).not.toHaveBeenCalled();
  });
});
