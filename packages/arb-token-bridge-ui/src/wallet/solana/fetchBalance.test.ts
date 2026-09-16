import { PublicKey } from '@solana/web3.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../constants';
import { createSolanaBalanceClient, splTokenProgramId, token2022ProgramId } from './fetchBalance';

const walletAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const splTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const token2022Address = 'So11111111111111111111111111111111111111112';
const missingTokenAddress = 'Es9vMFrzaCERmJfrF4H2FYDxuD9g8FZcGzgKQvNwNYB';
const getBalance = vi.fn();
const getParsedTokenAccountsByOwner = vi.fn();
const balanceClient = createSolanaBalanceClient({ getBalance, getParsedTokenAccountsByOwner });

function tokenAccount(mint: string, amount: string) {
  return { account: { data: { parsed: { info: { mint, tokenAmount: { amount } } } } } };
}

describe.sequential('Solana balance handle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getBalance.mockResolvedValue(42);
    getParsedTokenAccountsByOwner.mockImplementation(
      (_ownerAddress: PublicKey, programId: PublicKey) => {
        if (programId.equals(splTokenProgramId)) {
          return Promise.resolve([tokenAccount(splTokenAddress, '7')]);
        }
        if (programId.equals(token2022ProgramId)) {
          return Promise.resolve([
            tokenAccount(token2022Address, '9'),
            tokenAccount(splTokenAddress, '3'),
          ]);
        }
        return Promise.resolve([]);
      },
    );
  });

  it('fetches native, SPL Token, and Token-2022 balances', async () => {
    const balances = await balanceClient.fetchBalance({
      chainId: ChainId.Solana,
      walletAddress,
      tokenAddresses: [
        SOLANA_NATIVE_TOKEN_ADDRESS,
        splTokenAddress,
        token2022Address,
        missingTokenAddress,
      ],
    });

    expect(balances).toEqual({
      [SOLANA_NATIVE_TOKEN_ADDRESS]: 42n,
      [splTokenAddress]: 10n,
      [token2022Address]: 9n,
      [missingTokenAddress]: 0n,
    });
  });

  it('rejects a non-Solana chain', async () => {
    await expect(
      balanceClient.fetchBalance({
        chainId: ChainId.Ethereum,
        walletAddress,
        tokenAddresses: [],
      }),
    ).rejects.toThrow('Solana balance provider only supports Solana.');
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, -1, 0.5, NaN, Infinity])(
    'rejects unsafe native RPC amounts: %s',
    async (amount) => {
      getBalance.mockResolvedValue(amount);
      await expect(
        balanceClient.fetchBalance({
          chainId: ChainId.Solana,
          walletAddress,
          tokenAddresses: [SOLANA_NATIVE_TOKEN_ADDRESS],
        }),
      ).rejects.toThrow('unsafe native balance');
    },
  );

  it('keeps large token amounts exact and native SOL separate from wrapped SOL', async () => {
    getParsedTokenAccountsByOwner
      .mockResolvedValueOnce([
        tokenAccount(token2022Address, '18446744073709551615'),
        tokenAccount(token2022Address, '2'),
      ])
      .mockResolvedValueOnce([]);
    await expect(
      balanceClient.fetchBalance({
        chainId: ChainId.Solana,
        walletAddress,
        tokenAddresses: [SOLANA_NATIVE_TOKEN_ADDRESS, token2022Address, missingTokenAddress],
      }),
    ).resolves.toEqual({
      [SOLANA_NATIVE_TOKEN_ADDRESS]: 42n,
      [token2022Address]: 18446744073709551617n,
      [missingTokenAddress]: 0n,
    });
  });

  it('propagates RPC failures instead of returning zero holdings', async () => {
    getParsedTokenAccountsByOwner.mockRejectedValue(new Error('RPC unavailable'));
    await expect(
      balanceClient.fetchBalance({
        chainId: ChainId.Solana,
        walletAddress,
        tokenAddresses: [splTokenAddress],
      }),
    ).rejects.toThrow('RPC unavailable');
  });
});
