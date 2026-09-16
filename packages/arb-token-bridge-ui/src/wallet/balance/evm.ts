import { MultiCaller } from '@arbitrum/sdk';
import { utils } from 'ethers';
import { zeroAddress } from 'viem';

import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { addressesEqual } from '../../util/AddressUtils';
import type { EvmBalanceClient, FetchBalanceInput, FetchBalanceResult } from '../types';

export async function fetchEvmBalance({
  chainId,
  walletAddress,
  tokenAddresses,
}: FetchBalanceInput): Promise<FetchBalanceResult> {
  if (!utils.isAddress(walletAddress)) {
    throw new Error('Invalid EVM wallet address.');
  }

  const balances = Object.fromEntries(tokenAddresses.map((tokenAddress) => [tokenAddress, 0n]));
  const nativeTokenAddresses = tokenAddresses.filter((tokenAddress) =>
    addressesEqual(tokenAddress, zeroAddress),
  );
  const erc20TokenAddresses = tokenAddresses.filter(
    (tokenAddress) => !addressesEqual(tokenAddress, zeroAddress),
  );
  const provider = getProviderForChainId(chainId);
  const [nativeBalance, tokenData] = await Promise.all([
    nativeTokenAddresses.length > 0 ? provider.getBalance(walletAddress) : undefined,
    erc20TokenAddresses.length > 0
      ? MultiCaller.fromProvider(provider).then((multiCaller) =>
          multiCaller.getTokenData(erc20TokenAddresses, {
            balanceOf: { account: walletAddress },
          }),
        )
      : undefined,
  ]);

  if (nativeBalance !== undefined) {
    nativeTokenAddresses.forEach((tokenAddress) => {
      balances[tokenAddress] = nativeBalance.toBigInt();
    });
  }

  tokenData?.forEach((token, index) => {
    const tokenAddress = erc20TokenAddresses[index];

    if (tokenAddress !== undefined) {
      balances[tokenAddress] = token?.balance?.toBigInt() ?? 0n;
    }
  });

  return balances;
}

export const evmBalanceClient: EvmBalanceClient = {
  ecosystem: 'evm',
  fetchBalance: fetchEvmBalance,
};
