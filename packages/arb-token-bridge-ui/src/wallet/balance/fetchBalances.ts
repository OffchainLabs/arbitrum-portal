import { normalizeAddress } from '../../util/AddressUtils';
import type { FetchBalanceInput, FetchBalanceResult } from '../types';
import { getBalanceClient } from './getBalanceClient';

export async function fetchBalances({
  chainId,
  walletAddress,
  tokenAddresses,
}: FetchBalanceInput): Promise<FetchBalanceResult> {
  if (tokenAddresses.length === 0) return {};

  const balances = await getBalanceClient(chainId).fetchBalance({
    chainId,
    walletAddress,
    tokenAddresses: [...new Set(tokenAddresses.map((address) => normalizeAddress(address)))],
  });
  const result: FetchBalanceResult = {};
  for (const address of tokenAddresses) {
    const balance = balances[normalizeAddress(address)];
    if (balance !== undefined) result[address] = balance;
  }
  return result;
}
