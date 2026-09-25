import { constants, utils } from 'ethers';

import { RouteType } from '../components/TransferPanel/hooks/useRouteStore';
import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { BridgeTransferStarterFactory } from '../token-bridge-sdk/BridgeTransferStarterFactory';
import { CctpTransferStarter } from '../token-bridge-sdk/CctpTransferStarter';
import { OftV2TransferStarter } from '../token-bridge-sdk/OftV2TransferStarter';
import { getCctpContracts } from '../token-bridge-sdk/cctp';
import { getOftV2TransferConfig } from '../token-bridge-sdk/oftUtils';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import {
  fetchErc20L2GatewayAddress,
  fetchErc20ParentChainGatewayAddress,
} from '../util/TokenUtils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { getEvmExecutionRuntime } from './evmExecutionRuntime';

export type TokenApprovalInput = {
  sourceChainId: number;
  destinationChainId: number;
  token: ERC20BridgeToken;
  route: RouteType | undefined;
  walletAddress?: string;
};
export async function fetchTokenApproval({
  sourceChainId,
  destinationChainId,
  token,
  route,
  walletAddress,
}: TokenApprovalInput) {
  const { isDepositMode, parentChainId, childChainId } = getNetworksRelationship({
    sourceChainId,
    destinationChainId,
  });
  const sourceChainProvider = getProviderForChainId(sourceChainId);
  const destinationChainProvider = getProviderForChainId(destinationChainId);
  const sourceChainErc20Address = isDepositMode ? token.address : token.l2Address;
  const destinationChainErc20Address = isDepositMode ? token.l2Address : token.address;
  const starter =
    route === 'cctp'
      ? new CctpTransferStarter({ sourceChainProvider, destinationChainProvider })
      : route === 'oftV2'
        ? new OftV2TransferStarter({
            sourceChainProvider,
            destinationChainProvider,
            sourceChainErc20Address,
          })
        : BridgeTransferStarterFactory.create({
            sourceChainId,
            destinationChainId,
            sourceChainErc20Address,
            destinationChainErc20Address,
          });
  let contractAddress = '';
  if (route === 'oftV2') {
    const config = getOftV2TransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
    });
    if (!config.isValid) throw new Error('OFT transfer validation failed');
    contractAddress = config.sourceChainAdapterAddress;
  } else if (route === 'cctp') {
    contractAddress = getCctpContracts({ sourceChainId }).tokenMessengerContractAddress;
  } else if (isDepositMode) {
    contractAddress = await fetchErc20ParentChainGatewayAddress({
      erc20ParentChainAddress: token.address,
      parentChainProvider: getProviderForChainId(parentChainId),
      childChainProvider: getProviderForChainId(childChainId),
    });
  } else {
    contractAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: token.address,
      l2Provider: getProviderForChainId(childChainId),
    });
  }
  let estimatedGasFees = 0;
  if (walletAddress) {
    const { signer } = await getEvmExecutionRuntime({
      sourceChainId,
      destinationChainId,
      expectedAccount: walletAddress,
    });
    const gas = await starter.approveTokenEstimateGas({ amount: constants.MaxUint256, signer });
    const gasPrice = await sourceChainProvider.getGasPrice();
    estimatedGasFees = Number(utils.formatEther((gas ?? constants.Zero).mul(gasPrice)));
  }
  return { estimatedGasFees, contractAddress, requiresMaximumApproval: route === 'oftV2' };
}
