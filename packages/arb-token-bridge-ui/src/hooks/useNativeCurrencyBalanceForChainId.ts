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

  // Get balance
  const balance = await provider.getBalance(walletAddress)

  // Get symbol from chain data
  const chains = getChains()
  const chain = chains.find(c => c.chainId === chainId) as
    | ChainWithRpcUrl
    | undefined

  if (!chain) {
    throw new Error(`Chain not found for chainId ${chainId}`)
  }

  // Get decimals on-chain
  let decimals: number = 18,
    symbol: string = 'ETH' // default values
  if (chain.nativeToken) {
    // For custom native tokens, use the parent chain provider to get decimals
    const parentChainProvider = getProviderForChainId(chain.parentChainId)
    const nativeTokenData = await fetchErc20Data({
      address: chain.nativeToken,
      provider: parentChainProvider
    })
    decimals = nativeTokenData.decimals
    symbol = nativeTokenData.symbol
  }

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
    ([_chainId, _walletAddress]: [number, string]) =>
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
