import { PublicKey } from '@solana/web3.js';

import { ChainId } from '../../types/ChainId';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../constants';
import type { BalanceClient, FetchBalanceInput } from '../types';

export const splTokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const token2022ProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

type SolanaBalanceRpcClient = {
  getBalance: (ownerAddress: PublicKey) => Promise<number>;
  getParsedTokenAccountsByOwner: (
    ownerAddress: PublicKey,
    programId: PublicKey,
  ) => Promise<unknown[]>;
};

type ParsedTokenAccountInfo = {
  mint: string;
  tokenAmount: { amount: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getParsedTokenAccountInfo(value: unknown): ParsedTokenAccountInfo | undefined {
  if (!isRecord(value) || !isRecord(value.account) || !isRecord(value.account.data)) return;

  const parsed = value.account.data.parsed;
  if (!isRecord(parsed) || !isRecord(parsed.info)) return;

  const { mint, tokenAmount } = parsed.info;
  if (
    typeof mint !== 'string' ||
    !isRecord(tokenAmount) ||
    typeof tokenAmount.amount !== 'string'
  ) {
    return;
  }

  return { mint, tokenAmount: { amount: tokenAmount.amount } };
}

export function createSolanaBalanceClient(client: SolanaBalanceRpcClient): BalanceClient {
  return {
    async fetchBalance({ chainId, walletAddress, tokenAddresses }: FetchBalanceInput) {
      if (chainId !== ChainId.Solana) {
        throw new Error('Solana balance provider only supports Solana.');
      }

      const ownerAddress = new PublicKey(walletAddress);
      const balances = Object.fromEntries(tokenAddresses.map((tokenAddress) => [tokenAddress, 0n]));
      const nativeTokenAddresses = tokenAddresses.filter(
        (tokenAddress) => tokenAddress === SOLANA_NATIVE_TOKEN_ADDRESS,
      );
      const requestedTokenAddresses = new Set(
        tokenAddresses.filter((tokenAddress) => tokenAddress !== SOLANA_NATIVE_TOKEN_ADDRESS),
      );

      const [nativeBalance, splAccounts, token2022Accounts] = await Promise.all([
        nativeTokenAddresses.length > 0 ? client.getBalance(ownerAddress) : undefined,
        requestedTokenAddresses.size > 0
          ? client.getParsedTokenAccountsByOwner(ownerAddress, splTokenProgramId)
          : [],
        requestedTokenAddresses.size > 0
          ? client.getParsedTokenAccountsByOwner(ownerAddress, token2022ProgramId)
          : [],
      ]);

      if (nativeBalance !== undefined) {
        nativeTokenAddresses.forEach((tokenAddress) => {
          balances[tokenAddress] = BigInt(nativeBalance);
        });
      }

      [...splAccounts, ...token2022Accounts].forEach((tokenAccount) => {
        const tokenInfo = getParsedTokenAccountInfo(tokenAccount);
        if (tokenInfo === undefined || !requestedTokenAddresses.has(tokenInfo.mint)) return;

        balances[tokenInfo.mint] =
          (balances[tokenInfo.mint] ?? 0n) + BigInt(tokenInfo.tokenAmount.amount);
      });

      return balances;
    },
  };
}
