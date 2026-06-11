import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { LifiTransferStarter } from './LifiTransferStarter';
import { SolanaTransferStarter } from './SolanaTransferStarter';

describe('transfer starter transaction preparation', () => {
  it('prepares an EVM transaction', () => {
    const transactionRequest = {
      chainId: ChainId.ArbitrumOne,
      to: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
      from: '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
      value: '1',
      data: '0x1234',
      gasPrice: '1',
      gasLimit: '21000',
    };

    expect(LifiTransferStarter.prepareTransaction(transactionRequest)).toEqual({
      txRequest: transactionRequest,
    });
  });

  it('rejects an invalid EVM transaction', () => {
    expect(() =>
      LifiTransferStarter.prepareTransaction({
        chainId: ChainId.ArbitrumOne,
        to: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
      }),
    ).toThrow('EVM transaction payload is missing.');
  });

  it('prepares a Solana transaction', () => {
    expect(
      SolanaTransferStarter.prepareTransaction({ data: 'serialized-solana-transaction' }),
    ).toEqual({
      serializedTransaction: 'serialized-solana-transaction',
    });
  });
});
