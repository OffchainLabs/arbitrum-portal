import { Connection, PublicKey } from '@solana/web3.js';
import { BigNumber, constants } from 'ethers';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { solanaNativeTokenAddress } from '../../app/api/crosschain-transfers/utils';
import { ChainId } from '../../types/ChainId';
import { solanaRpcUrl } from '../../util/rpc/solana';
import type { BalanceHandle, FetchBalanceInput, FetchBalanceResult } from '../types';

const solanaConnection = new Connection(solanaRpcUrl, 'confirmed');
const splTokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const token2022ProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

export const defaultSolanaBalanceContextValue: BalanceHandle = {
  ecosystem: 'solana',
  fetchBalance: async () => {
    throw new Error('Solana balance provider is not available.');
  },
};

export const SolanaBalanceContext = createContext<BalanceHandle>(defaultSolanaBalanceContextValue);

export function useSolanaBalanceContext() {
  return useContext(SolanaBalanceContext);
}

type JsonParsedTokenAccountInfo = {
  mint: string;
  tokenAmount: {
    amount: string;
  };
};

async function getParsedTokenAccountsByOwnerForProgram(
  ownerAddress: PublicKey,
  programId: PublicKey,
) {
  return solanaConnection.getParsedTokenAccountsByOwner(ownerAddress, { programId }, 'confirmed');
}

export function SolanaBalanceProvider({ children }: PropsWithChildren) {
  const fetchBalance = useCallback(
    async ({
      chainId,
      walletAddress,
      tokenAddresses,
    }: FetchBalanceInput): Promise<FetchBalanceResult> => {
      if (chainId !== ChainId.Solana) {
        throw new Error('Solana balance provider only supports Solana.');
      }

      const ownerAddress = new PublicKey(walletAddress);
      const balances = tokenAddresses.reduce<FetchBalanceResult>((acc, tokenAddress) => {
        acc[tokenAddress] = constants.Zero;
        return acc;
      }, {});

      const nativeTokenAddresses = tokenAddresses.filter(
        (tokenAddress) => tokenAddress === solanaNativeTokenAddress,
      );
      const splTokenAddresses = tokenAddresses.filter(
        (tokenAddress) => tokenAddress !== solanaNativeTokenAddress,
      );

      if (nativeTokenAddresses.length > 0) {
        const nativeBalance = await solanaConnection.getBalance(ownerAddress, 'confirmed');

        nativeTokenAddresses.forEach((tokenAddress) => {
          balances[tokenAddress] = BigNumber.from(nativeBalance.toString());
        });
      }

      if (splTokenAddresses.length > 0) {
        const requestedTokenAddresses = new Set(splTokenAddresses);
        const [splResponse, token2022Response] = await Promise.all([
          getParsedTokenAccountsByOwnerForProgram(ownerAddress, splTokenProgramId),
          getParsedTokenAccountsByOwnerForProgram(ownerAddress, token2022ProgramId),
        ]);

        [...splResponse.value, ...token2022Response.value].forEach((tokenAccount) => {
          const tokenInfo = tokenAccount.account.data.parsed.info as JsonParsedTokenAccountInfo;

          if (!requestedTokenAddresses.has(tokenInfo.mint)) {
            return;
          }

          balances[tokenInfo.mint] = (balances[tokenInfo.mint] ?? constants.Zero).add(
            tokenInfo.tokenAmount.amount,
          );
        });
      }

      return balances;
    },
    [],
  );

  const value = useMemo<BalanceHandle>(
    () => ({
      ecosystem: 'solana',
      fetchBalance,
    }),
    [fetchBalance],
  );

  return <SolanaBalanceContext.Provider value={value}>{children}</SolanaBalanceContext.Provider>;
}
