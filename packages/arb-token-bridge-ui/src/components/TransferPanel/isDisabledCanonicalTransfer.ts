import { constants } from 'ethers';

import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils';
import { isBlockedOftDeposit } from '../../util/WithdrawOnlyUtils';

export async function isDisabledCanonicalTransfer({
  selectedToken,
  isDepositMode,
  parentChainId,
  childChainId,
  isSelectedTokenWithdrawOnly,
  isSelectedTokenWithdrawOnlyLoading,
}: {
  selectedToken: ERC20BridgeToken | null;
  isDepositMode: boolean;
  parentChainId: ChainId;
  childChainId: ChainId;
  isSelectedTokenWithdrawOnly: boolean | undefined;
  isSelectedTokenWithdrawOnlyLoading: boolean;
}) {
  if (!selectedToken) {
    return false;
  }

  if (isTransferDisabledToken(selectedToken.address, childChainId)) {
    return true;
  }

  if (
    await isBlockedOftDeposit({
      parentChainErc20Address: selectedToken.address,
      parentChainId,
      childChainId,
    })
  ) {
    return true;
  }

  if (
    parentChainId === ChainId.ArbitrumOne &&
    childChainId === ChainId.ApeChain &&
    addressesEqual(selectedToken.address, constants.AddressZero)
  ) {
    return true;
  }

  return !!(isDepositMode && isSelectedTokenWithdrawOnly && !isSelectedTokenWithdrawOnlyLoading);
}
