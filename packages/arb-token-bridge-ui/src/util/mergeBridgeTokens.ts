import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { LIFI_TRANSFER_LIST_ID, isLifiOnlyToken } from './TokenListUtils';

export function mergeBridgeTokens({
  existingToken,
  incomingToken,
  incomingListId,
}: {
  existingToken: ERC20BridgeToken | undefined;
  incomingToken: ERC20BridgeToken;
  incomingListId?: string;
}): ERC20BridgeToken {
  const incomingUsesLifiTokenAddress = incomingListId === LIFI_TRANSFER_LIST_ID;
  const listIds = new Set([
    ...(existingToken?.listIds ?? []),
    ...incomingToken.listIds,
    ...(incomingListId ? [incomingListId] : []),
  ]);
  const incomingIsPaired = !isLifiOnlyToken(incomingToken) && !!incomingToken.l2Address;
  const existingIsPaired = !isLifiOnlyToken(existingToken) && !!existingToken?.l2Address;
  const pairedToken =
    incomingIsPaired && isLifiOnlyToken(existingToken)
      ? incomingToken
      : existingIsPaired && isLifiOnlyToken(incomingToken)
        ? existingToken
        : undefined;
  const lifiOnlyToken =
    pairedToken !== undefined
      ? undefined
      : incomingToken.l2Address
        ? incomingToken
        : existingToken?.l2Address
          ? existingToken
          : incomingToken;

  if (incomingUsesLifiTokenAddress || !existingToken) {
    return {
      ...incomingToken,
      l2Address: pairedToken?.l2Address ?? incomingToken.l2Address ?? existingToken?.l2Address,
      lifiOnlyChainId: pairedToken ? undefined : lifiOnlyToken?.lifiOnlyChainId,
      listIds,
    };
  }

  return {
    ...incomingToken,
    name: existingToken.name ?? incomingToken.name,
    symbol: existingToken.symbol ?? incomingToken.symbol,
    address: existingToken.address ?? incomingToken.address,
    decimals: existingToken.decimals ?? incomingToken.decimals,
    type: existingToken.type ?? incomingToken.type,
    logoURI: existingToken.logoURI ?? incomingToken.logoURI,
    l2Address: pairedToken?.l2Address ?? existingToken.l2Address ?? incomingToken.l2Address,
    isL2Native: existingToken.isL2Native ?? incomingToken.isL2Native,
    priceUSD: existingToken.priceUSD ?? incomingToken.priceUSD,
    lifiOnlyChainId: pairedToken ? undefined : lifiOnlyToken?.lifiOnlyChainId,
    listIds,
  };
}
