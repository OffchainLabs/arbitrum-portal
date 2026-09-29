import type { Address } from 'viem';

export function canFetchTransactionHistory({
  address,
  isLoadingAccountType,
  isTxHistoryEnabled,
  isSmartContractWallet,
  connectedChainId,
}: {
  address: Address | undefined;
  isLoadingAccountType: boolean;
  isTxHistoryEnabled: boolean;
  isSmartContractWallet: boolean;
  connectedChainId: number | undefined;
}) {
  if (!address || isLoadingAccountType || !isTxHistoryEnabled) {
    return false;
  }

  return !isSmartContractWallet || typeof connectedChainId !== 'undefined';
}
