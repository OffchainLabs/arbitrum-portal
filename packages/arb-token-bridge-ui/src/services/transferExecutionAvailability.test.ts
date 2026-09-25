import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { isTransferExecutionAvailable } from './transferExecutionAvailability';

describe('execution availability', () => {
  it('requires a connected account and a registered implementation', () => {
    const wallet = {
      ...defaultWalletContextValue.evm,
      isConnected: true,
      account: {
        ...defaultWalletContextValue.evm.account,
        address: '0x1111111111111111111111111111111111111111',
      },
    };
    expect(isTransferExecutionAvailable({ chainId: ChainId.Ethereum, wallet })).toBe(true);
    expect(
      isTransferExecutionAvailable({
        chainId: ChainId.Ethereum,
        wallet: defaultWalletContextValue.evm,
      }),
    ).toBe(false);
    expect(isTransferExecutionAvailable({ chainId: 999999999, wallet })).toBe(false);
  });
  it('does not enable placeholder Solana execution', () => {
    const wallet = {
      ...defaultWalletContextValue.solana,
      isConnected: true,
      account: {
        ...defaultWalletContextValue.solana.account,
        address: 'So11111111111111111111111111111111111111112',
      },
    };
    expect(isTransferExecutionAvailable({ chainId: ChainId.Solana, wallet })).toBe(false);
  });
});
