import { cleanup, render, screen } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/app/components/common/Tooltip';

import { createWalletTestWrapper } from '../../test-utils/wallet-test-wrapper';
import { ChainId } from '../../types/ChainId';
import type { SolanaAddress } from '../../util/AddressUtils';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import type { WalletContextValue } from '../../wallet/types';
import { NetworkRow } from './NetworkSelectionContainer';

vi.mock('../../hooks/useNativeCurrencyBalanceForChainId', () => ({
  useNativeCurrencyBalanceForChainId: (_chainId: number, walletAddress?: string) => ({
    data: walletAddress
      ? { balance: BigNumber.from(10).pow(18), decimals: 18, symbol: 'ETH' }
      : undefined,
    isLoading: false,
    error: undefined,
  }),
}));

const evmAddress = '0x1111111111111111111111111111111111111111';
const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5' as SolanaAddress;

function walletsWith({ evm, solana }: { evm: boolean; solana: boolean }): WalletContextValue {
  return {
    evm: evm
      ? {
          ...defaultWalletContextValue.evm,
          isConnected: true,
          account: { ecosystem: 'evm', status: 'connected', address: evmAddress, chainId: 1 },
        }
      : defaultWalletContextValue.evm,
    solana: solana
      ? {
          ...defaultWalletContextValue.solana,
          isConnected: true,
          account: { ecosystem: 'solana', status: 'connected', address: solanaAddress },
        }
      : defaultWalletContextValue.solana,
  };
}

describe.sequential('NetworkRow', () => {
  afterEach(cleanup);

  it.each([
    { name: 'no wallet', evm: false, solana: false, text: 'ETH' },
    // The header says "Native Balance", so a row without a balance stays empty
    { name: 'only a Solana wallet', evm: false, solana: true, text: '' },
    { name: 'an EVM wallet', evm: true, solana: false, text: '1 ETH' },
  ])('shows "$text" on Arbitrum One with $name connected', ({ evm, solana, text }) => {
    render(
      <TooltipProvider>
        <NetworkRow
          chainId={ChainId.ArbitrumOne}
          isSelected={false}
          isConnected={evm || solana}
          style={{}}
          onClick={vi.fn()}
          close={vi.fn()}
        />
      </TooltipProvider>,
      {
        wrapper: createWalletTestWrapper({
          wallets: walletsWith({ evm, solana }),
          query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
        }),
      },
    );

    const row = screen.getByRole('button', { name: 'Switch to Arbitrum One' });
    expect(row.textContent).toBe(`Arbitrum One${text}`);
  });
});
