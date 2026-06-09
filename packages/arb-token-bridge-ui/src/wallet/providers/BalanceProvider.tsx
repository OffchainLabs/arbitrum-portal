'use client';

import { MultiCaller } from '@arbitrum/sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { BigNumber, constants, utils } from 'ethers';
import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';
import { zeroAddress } from 'viem';

import { solanaNativeTokenAddress } from '../../app/api/crosschain-transfers/utils';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { solanaRpcUrl } from '../../util/rpc/solana';
import type {
  EvmBalanceHandle,
  FetchBalanceInput,
  FetchBalanceResult,
  SolanaBalanceHandle,
  WalletEcosystem,
} from '../types';

const solanaConnection = new Connection(solanaRpcUrl, 'confirmed');
const splTokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const token2022ProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

const defaultEvmBalance: EvmBalanceHandle = {
  ecosystem: 'evm',
  fetchBalance: async () => {
    throw new Error('EVM balance provider is not available.');
  },
};

const defaultSolanaBalance: SolanaBalanceHandle = {
  ecosystem: 'solana',
  fetchBalance: async () => {
    throw new Error('Solana balance provider is not available.');
  },
};

export type BalanceContextValue = {
  evm: EvmBalanceHandle;
  solana: SolanaBalanceHandle;
};

export const defaultBalanceContextValue: BalanceContextValue = {
  evm: defaultEvmBalance,
  solana: defaultSolanaBalance,
};

export const BalanceContext = createContext<BalanceContextValue>(defaultBalanceContextValue);

export function useBalanceContext<Ecosystem extends WalletEcosystem>(
  ecosystem: Ecosystem,
): BalanceContextValue[Ecosystem] {
  return useContext(BalanceContext)[ecosystem];
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

async function fetchEvmBalance({
  chainId,
  walletAddress,
  tokenAddresses,
}: FetchBalanceInput): Promise<FetchBalanceResult> {
  if (!utils.isAddress(walletAddress)) {
    throw new Error('Invalid EVM wallet address.');
  }

  const provider = getProviderForChainId(chainId);
  const balances = tokenAddresses.reduce<FetchBalanceResult>((acc, tokenAddress) => {
    acc[tokenAddress] = constants.Zero;
    return acc;
  }, {});
  const nativeTokenAddresses = tokenAddresses.filter((tokenAddress) =>
    addressesEqual(tokenAddress, zeroAddress),
  );
  const erc20TokenAddresses = tokenAddresses.filter(
    (tokenAddress) => !addressesEqual(tokenAddress, zeroAddress),
  );
  const [nativeBalance, tokenData] = await Promise.all([
    nativeTokenAddresses.length > 0 ? provider.getBalance(walletAddress) : Promise.resolve(null),
    erc20TokenAddresses.length > 0
      ? MultiCaller.fromProvider(provider).then((multiCaller) =>
          multiCaller.getTokenData(erc20TokenAddresses, {
            balanceOf: { account: walletAddress },
          }),
        )
      : Promise.resolve(null),
  ]);

  if (nativeBalance) {
    nativeTokenAddresses.forEach((tokenAddress) => {
      balances[tokenAddress] = nativeBalance;
    });
  }

  if (tokenData) {
    erc20TokenAddresses.forEach((tokenAddress, index) => {
      balances[tokenAddress] = tokenData[index]?.balance ?? constants.Zero;
    });
  }

  return balances;
}

async function fetchSolanaBalance({
  chainId,
  walletAddress,
  tokenAddresses,
}: FetchBalanceInput): Promise<FetchBalanceResult> {
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

      if (requestedTokenAddresses.has(tokenInfo.mint)) {
        balances[tokenInfo.mint] = (balances[tokenInfo.mint] ?? constants.Zero).add(
          tokenInfo.tokenAmount.amount,
        );
      }
    });
  }

  return balances;
}

const balanceContextValue: BalanceContextValue = {
  evm: { ecosystem: 'evm', fetchBalance: fetchEvmBalance },
  solana: { ecosystem: 'solana', fetchBalance: fetchSolanaBalance },
};

export function BalanceProvider({ children }: PropsWithChildren) {
  return <BalanceContext.Provider value={balanceContextValue}>{children}</BalanceContext.Provider>;
}
