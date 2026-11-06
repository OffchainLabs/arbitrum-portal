import { renderHook } from '@testing-library/react';
import { getConnectorClient } from '@wagmi/core';
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
vi.mock('@wagmi/core', () => ({
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
});
