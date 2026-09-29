import { afterAll, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { isTransferExecutionAvailable } from './transferExecutionAvailability';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

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
  it('uses ecosystem-specific execution prerequisites', () => {
    const evmWallet = {
      ...defaultWalletContextValue.evm,
      isConnected: true,
      account: {
        ...defaultWalletContextValue.evm.account,
        address: '0x1111111111111111111111111111111111111111',
      },
    };
    const wallet = {
      ...defaultWalletContextValue.solana,
      isConnected: true,
      account: {
        ...defaultWalletContextValue.solana.account,
        address: 'So11111111111111111111111111111111111111112',
      },
    };
    expect(
      isTransferExecutionAvailable({
        chainId: ChainId.Ethereum,
        wallet: evmWallet,
        arbTokenBridgeReady: false,
      }),
    ).toBe(false);
    expect(
      isTransferExecutionAvailable({
        chainId: ChainId.Solana,
        wallet,
        arbTokenBridgeReady: false,
      }),
    ).toBe(true);
  });
});

afterAll(() => vi.unstubAllEnvs());
