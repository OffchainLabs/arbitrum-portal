import { arbitrum, mainnet } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../test-utils/lifi';
import { LifiTransferStarter } from '../token-bridge-sdk/LifiTransferStarter';
import { SolanaTransferStarter } from '../token-bridge-sdk/SolanaTransferStarter';
import { ChainId } from '../types/ChainId';
import type { EvmWalletHandle, SolanaWalletHandle } from '../wallet/types';
import { resolveLifiTransferStarter } from './resolveLifiTransferStarter';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

const runtime = vi.hoisted(() => ({
  get: vi.fn(async () => ({
    sourceChainProvider: { getNetwork: vi.fn(async () => mainnet) },
    destinationChainProvider: { getNetwork: vi.fn(async () => arbitrum) },
    wagmiConfig: {},
    assertSigningAccount: vi.fn(async () => {}),
  })),
}));

vi.mock('./evmExecutionRuntime', () => ({ getEvmExecutionRuntime: runtime.get }));
vi.mock('../wallet/solana', () => ({
  createSolanaTransferStarter: vi.fn(
    (props: ConstructorParameters<typeof SolanaTransferStarter>[0]) =>
      new SolanaTransferStarter(props),
  ),
}));

const solanaAddress = 'So11111111111111111111111111111111111111112';
const evmAddress = '0x1111111111111111111111111111111111111111';

function route(fromChainId: number, toChainId: number): LifiCrosschainTransfersRoute {
  return {
    type: 'lifi',
    durationMs: 1,
    gas: [],
    fee: [],
    fromAmount: {
      amount: '1',
      amountUSD: '1',
      token: { address: '11111111111111111111111111111111', symbol: 'SOL', decimals: 9 },
    },
    toAmount: {
      amount: '1',
      amountUSD: '1',
      token: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
    },
    fromChainId,
    toChainId,
    protocolData: { route: createMockLifiRoute() },
  };
}

const solanaWallet: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: solanaAddress,
    chainId: ChainId.Solana,
    status: 'connected',
  },
  isConnected: true,
  disconnect: vi.fn(async () => {}),
  sendTransaction: vi.fn(async () => 'signature'),
  confirmTransaction: vi.fn(async () => {}),
};

const evmWallet: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: evmAddress,
    chainId: ChainId.Ethereum,
    status: 'connected',
  },
  isConnected: true,
  disconnect: vi.fn(async () => {}),
};

describe.sequential('resolveLifiTransferStarter', () => {
  beforeEach(() => runtime.get.mockClear());

  it('resolves the existing EVM starter and runtime', async () => {
    const resolution = await resolveLifiTransferStarter({
      route: route(ChainId.Ethereum, ChainId.ArbitrumOne),
      wallet: evmWallet,
    });

    expect(resolution.ecosystem).toBe('evm');
    expect(resolution.starter).toBeInstanceOf(LifiTransferStarter);
    expect(runtime.get).toHaveBeenCalledExactlyOnceWith({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      expectedAccount: evmAddress,
    });
  });

  it.each([ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition])(
    'resolves Solana to %s without loading the EVM runtime',
    async (destinationChainId) => {
      const resolution = await resolveLifiTransferStarter({
        route: route(ChainId.Solana, destinationChainId),
        wallet: solanaWallet,
      });

      expect(resolution.ecosystem).toBe('solana');
      expect(resolution.starter).toBeInstanceOf(SolanaTransferStarter);
      expect(runtime.get).not.toHaveBeenCalled();
    },
  );

  it.each([
    [ChainId.Solana, ChainId.Base, solanaWallet],
    [ChainId.Ethereum, ChainId.Solana, evmWallet],
    [ChainId.ArbitrumOne, ChainId.Solana, evmWallet],
  ])('rejects unsupported pair %s to %s before creating a runtime', async (from, to, wallet) => {
    await expect(resolveLifiTransferStarter({ route: route(from, to), wallet })).rejects.toThrow(
      /chain pair/i,
    );
    expect(runtime.get).not.toHaveBeenCalled();
  });

  it('rejects a route requested by a different Solana account', async () => {
    await expect(
      resolveLifiTransferStarter({
        route: {
          ...route(ChainId.Solana, ChainId.ArbitrumOne),
          fromAddress: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        },
        wallet: solanaWallet,
      }),
    ).rejects.toThrow(/does not match/i);
    expect(runtime.get).not.toHaveBeenCalled();
  });
});
