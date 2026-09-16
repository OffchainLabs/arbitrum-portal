import { PublicKey } from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';
import { z } from 'zod';

import { ChainId } from '../../types/ChainId';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../constants';
import type { BalanceClient, FetchBalanceInput } from '../types';

export const splTokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const token2022ProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

type SolanaBalanceRpcClient = Pick<Connection, 'getBalance' | 'getParsedTokenAccountsByOwner'>;

const tokenAccountSchema = z.object({
  account: z.object({
    data: z.object({
      parsed: z.object({
        info: z.object({
          mint: z.string(),
          tokenAmount: z.object({ amount: z.string().regex(/^\d+$/) }),
        }),
      }),
    }),
  }),
});

export function createSolanaBalanceClient(client: SolanaBalanceRpcClient): BalanceClient {
  return {
    async fetchBalance({ chainId, walletAddress, tokenAddresses }: FetchBalanceInput) {
      if (chainId !== ChainId.Solana) {
        throw new Error('Solana balance provider only supports Solana.');
      }

      const ownerAddress = new PublicKey(walletAddress);
      const balances = Object.fromEntries(tokenAddresses.map((tokenAddress) => [tokenAddress, 0n]));
      const requestedTokenAddresses = new Set(
        tokenAddresses.filter((tokenAddress) => tokenAddress !== SOLANA_NATIVE_TOKEN_ADDRESS),
      );

      const [nativeBalance, splAccounts, token2022Accounts] = await Promise.all([
        tokenAddresses.includes(SOLANA_NATIVE_TOKEN_ADDRESS)
          ? client.getBalance(ownerAddress, 'confirmed')
          : undefined,
        requestedTokenAddresses.size > 0
          ? client
              .getParsedTokenAccountsByOwner(
                ownerAddress,
                { programId: splTokenProgramId },
                'confirmed',
              )
              .then((response) => response.value)
          : [],
        requestedTokenAddresses.size > 0
          ? client
              .getParsedTokenAccountsByOwner(
                ownerAddress,
                { programId: token2022ProgramId },
                'confirmed',
              )
              .then((response) => response.value)
          : [],
      ]);

      if (nativeBalance !== undefined) {
        if (!Number.isSafeInteger(nativeBalance) || nativeBalance < 0) {
          throw new Error('Solana RPC returned an unsafe native balance.');
        }
        balances[SOLANA_NATIVE_TOKEN_ADDRESS] = BigInt(nativeBalance);
      }

      [...splAccounts, ...token2022Accounts].forEach((tokenAccount) => {
        const parsed = tokenAccountSchema.safeParse(tokenAccount);
        if (!parsed.success) return;
        const tokenInfo = parsed.data.account.data.parsed.info;
        if (!requestedTokenAddresses.has(tokenInfo.mint)) return;

        balances[tokenInfo.mint] =
          (balances[tokenInfo.mint] ?? 0n) + BigInt(tokenInfo.tokenAmount.amount);
      });

      return balances;
    },
  };
}
