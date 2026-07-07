import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { isWithdrawOnlyToken } from '../../../util/WithdrawOnlyUtils';

export function useSelectedTokenIsWithdrawOnly() {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { isDepositMode, childChain } = useNetworksRelationship(networks);

  const isSelectedTokenWithdrawOnly =
    !!selectedToken &&
    isDepositMode &&
    isWithdrawOnlyToken({
      parentChainErc20Address: selectedToken.address,
      childChainId: childChain.id,
    });

  return {
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading: false,
  };
}
