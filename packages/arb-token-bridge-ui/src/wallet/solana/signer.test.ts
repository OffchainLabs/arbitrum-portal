import type { Provider as SolanaWalletProvider } from '@reown/appkit-adapter-solana/react';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';

import { createSolanaSigner } from './signer';

const publicKey = new PublicKey('So11111111111111111111111111111111111111112');

describe('createSolanaSigner', () => {
  it('exposes the connected Reown Solana provider to LiFi', async () => {
    const transaction = {} as VersionedTransaction;
    const signedTransaction = {} as VersionedTransaction;
    const provider = {
      publicKey,
      signTransaction: vi.fn(async () => signedTransaction),
    } as unknown as SolanaWalletProvider;

    const signer = createSolanaSigner(() => provider);
    const adapter = await signer.getWalletAdapter();

    expect(signer.getAddress()).toBe(publicKey.toBase58());
    expect(adapter.publicKey).toBe(publicKey);
    await expect(adapter.signTransaction(transaction)).resolves.toBe(signedTransaction);
    expect(provider.signTransaction).toHaveBeenCalledWith(transaction);
  });

  it.each([undefined, {} as SolanaWalletProvider])(
    'rejects when no Solana wallet is connected',
    async (provider) => {
      const signer = createSolanaSigner(() => provider);

      expect(signer.getAddress()).toBeUndefined();
      await expect(signer.getWalletAdapter()).rejects.toThrow(/Solana wallet/);
    },
  );

  it('reads the provider when called, so a wallet switch is picked up', () => {
    const wallet: { provider?: SolanaWalletProvider } = {};
    const signer = createSolanaSigner(() => wallet.provider);

    expect(signer.getAddress()).toBeUndefined();
    wallet.provider = { publicKey } as SolanaWalletProvider;

    expect(signer.getAddress()).toBe(publicKey.toBase58());
  });
});
