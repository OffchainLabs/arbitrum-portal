import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types'
import { LIFI_TRANSFER_LIST_ID } from './TokenListUtils'

export function mergeBridgeTokens({
  existingToken,
  incomingToken,
  incomingListId,
}: {
  existingToken: ERC20BridgeToken | undefined
  incomingToken: ERC20BridgeToken
  incomingListId: string
}): ERC20BridgeToken {
  const incomingUsesLifiTokenAddress = incomingListId === LIFI_TRANSFER_LIST_ID

  if (incomingUsesLifiTokenAddress || !existingToken) {
    return {
      ...incomingToken,
      listIds: new Set([...(existingToken?.listIds || new Set<string>()), incomingListId]),
    }
  }

  return {
    ...incomingToken,
    name: existingToken.name ?? incomingToken.name,
    symbol: existingToken.symbol ?? incomingToken.symbol,
    address: existingToken.address ?? incomingToken.address,
    decimals: existingToken.decimals ?? incomingToken.decimals,
    type: existingToken.type ?? incomingToken.type,
    logoURI: existingToken.logoURI ?? incomingToken.logoURI,
    l2Address: existingToken.l2Address ?? incomingToken.l2Address,
    priceUSD: existingToken.priceUSD ?? incomingToken.priceUSD,
    listIds: new Set([...(existingToken.listIds || new Set<string>()), incomingListId]),
  }
}
