import { renderHook } from '@testing-library/react';
import { ConnectorChainMismatchError, getConnectorClient, getWalletClient } from '@wagmi/core';
import { describe, expect, it, vi } from 'vitest';

import { clientToSigner } from '../util/wagmi/clientToSigner';
import { useEvmWallet } from './useEvmWallet';

const wagmiConfig = vi.hoisted(() => ({}));

vi.mock('@reown/appkit/react', () => ({
  useAppKitAccount: () => ({ isConnected: false, status: 'disconnected' }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
  useWalletInfo: () => ({ walletInfo: undefined }),
}));
vi.mock('wagmi', () => ({ useAccount: () => ({}), useConfig: () => wagmiConfig }));
vi.mock('@wagmi/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wagmi/core')>()),
  getAccount: vi.fn(),
  getConnectorClient: vi.fn(),
  getWalletClient: vi.fn(),
}));
vi.mock('../util/wagmi/clientToSigner', () => ({ clientToSigner: vi.fn() }));

describe.sequential('useEvmWallet', () => {
  it('builds the ethers signer from the connector client of the requested chain', async () => {
    const client = { chain: { id: 10 } };
    const ethersSigner = { _isSigner: true };
    vi.mocked(getConnectorClient).mockResolvedValue(client as never);
    vi.mocked(clientToSigner).mockReturnValue(ethersSigner as never);

    const { result } = renderHook(useEvmWallet);

    await expect(result.current.signer.getEthersSigner(10)).resolves.toBe(ethersSigner);
    expect(getConnectorClient).toHaveBeenCalledWith(wagmiConfig, { chainId: 10 });
    expect(clientToSigner).toHaveBeenCalledWith(client);
  });

  it('rejects when wagmi has no connector client', async () => {
    vi.mocked(getConnectorClient).mockRejectedValue(new Error('Connector not connected.'));

    const { result } = renderHook(useEvmWallet);

    await expect(result.current.signer.getEthersSigner(10)).rejects.toThrow(
      'Connector not connected.',
    );
  });

  it('rejects with the short message of a wagmi error', async () => {
    const error = new ConnectorChainMismatchError({ connectionChainId: 1, connectorChainId: 10 });
    vi.mocked(getConnectorClient).mockRejectedValue(error);

    const { result } = renderHook(useEvmWallet);

    await expect(result.current.signer.getEthersSigner(1)).rejects.toThrow(
      new Error(error.shortMessage),
    );
    expect(error.message).toContain('Version: @wagmi/core');
  });

  // The LiFi EVM provider gets its client from here, and the LiFi SDK rethrows its errors as is
  it('rejects the wallet client with the short message of a wagmi error', async () => {
    const error = new ConnectorChainMismatchError({ connectionChainId: 1, connectorChainId: 10 });
    vi.mocked(getWalletClient).mockRejectedValue(error);

    const { result } = renderHook(useEvmWallet);

    await expect(result.current.signer.getWalletClient(1)).rejects.toThrow(
      new Error(error.shortMessage),
    );
    expect(getWalletClient).toHaveBeenCalledWith(wagmiConfig, { chainId: 1 });
  });
});
