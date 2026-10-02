import { MultiCaller } from '@arbitrum/sdk';
import { zeroAddress } from 'viem';

import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { isValidAddressForChain } from '../../util/AddressUtils';
import type { BalanceClient, FetchBalanceInput, FetchBalanceResult } from '../types';

export async function fetchEvmBalance({
  chainId,
  walletAddress,
  tokenAddresses,
}: FetchBalanceInput): Promise<FetchBalanceResult> {
  if (!isValidAddressForChain(walletAddress, chainId)) {
    throw new Error('Invalid EVM wallet address.');
  }

  const balances = Object.fromEntries(tokenAddresses.map((tokenAddress) => [tokenAddress, 0n]));
  const erc20TokenAddresses = tokenAddresses.filter((tokenAddress) => tokenAddress !== zeroAddress);
  const provider = getProviderForChainId(chainId);
  const [nativeBalance, tokenData] = await Promise.all([
    tokenAddresses.includes(zeroAddress) ? provider.getBalance(walletAddress) : undefined,
    erc20TokenAddresses.length > 0
      ? MultiCaller.fromProvider(provider).then((multiCaller) =>
          multiCaller.getTokenData(erc20TokenAddresses, {
            balanceOf: { account: walletAddress },
          }),
        )
      : undefined,
  ]);

  if (nativeBalance !== undefined) {
    balances[zeroAddress] = nativeBalance.toBigInt();
  }

  tokenData?.forEach((token, index) => {
    const tokenAddress = erc20TokenAddresses[index];

    if (tokenAddress !== undefined) {
      balances[tokenAddress] = token?.balance?.toBigInt() ?? 0n;
    }
  });

  return balances;
}

export const evmBalanceClient: BalanceClient = {
  fetchBalance: fetchEvmBalance,
};
