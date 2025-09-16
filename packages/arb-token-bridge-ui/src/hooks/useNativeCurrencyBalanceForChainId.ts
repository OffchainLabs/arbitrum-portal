import { BigNumber } from 'ethers'
import useSWR from 'swr'
import { getChains } from '../util/networks'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { fetchErc20Data } from '../util/TokenUtils'
import { ChainWithRpcUrl } from '../util/networks'

const fetchNativeBalance = async (
  chainId: number,
  walletAddress: string
): Promise<{ balance: BigNumber; decimals: number; symbol: string }> => {
  const provider = getProviderForChainId(chainId)

  // Get symbol from chain data
  const chains = getChains()
  const chain = chains.find(c => c.chainId === chainId) as
    | ChainWithRpcUrl
    | undefined

  if (!chain) {
    throw new Error(`Chain not found for chainId ${chainId}`)
  }

  const [balance, nativeTokenData] = await Promise.all([
    provider.getBalance(walletAddress),
    (async () => {
      if (!chain.nativeToken) {
        return {
          decimals: 18,
          symbol: 'ETH'
        }
      }

      const parentChainProvider = getProviderForChainId(chain.parentChainId)
      return fetchErc20Data({
        address: chain.nativeToken!,
        provider: parentChainProvider
      })
    })()
  ])

  const decimals = nativeTokenData.decimals
  const symbol = nativeTokenData.symbol

  return {
    balance,
    decimals,
    symbol
  }
}

export const useNativeCurrencyBalanceForChainId = (
  chainId: number,
  walletAddress?: string
) => {
  return useSWR(
    walletAddress
      ? [chainId, walletAddress, 'native-balance-per-chainId']
      : null,
    ([_chainId, _walletAddress]) =>
      fetchNativeBalance(_chainId, _walletAddress),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000,
      revalidateOnFocus: false
    }
  )
}
