import { constants, utils } from 'ethers';

import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { BridgeTransferStarterFactory } from '../token-bridge-sdk/BridgeTransferStarterFactory';
import { CctpTransferStarter } from '../token-bridge-sdk/CctpTransferStarter';
import { OftV2TransferStarter } from '../token-bridge-sdk/OftV2TransferStarter';
import { getCctpContracts } from '../token-bridge-sdk/cctp';
import { getOftV2TransferConfig } from '../token-bridge-sdk/oftUtils';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import type { Address } from '../util/AddressUtils';
import {
  fetchErc20L2GatewayAddress,
  fetchErc20ParentChainGatewayAddress,
} from '../util/TokenUtils';
import { RouteType } from '../util/TransferRouteUtils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { getEvmExecutionRuntime } from './evmExecutionRuntime';

export type TokenApprovalInput = {
  sourceChainId: number;
  destinationChainId: number;
  token: ERC20BridgeToken;
  route: RouteType | undefined;
  walletAddress?: Address;
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
  let estimatedGasFees: number | undefined;
  if (walletAddress) {
    try {
      const { signer } = await getEvmExecutionRuntime({
        sourceChainId,
        destinationChainId,
        expectedAccount: walletAddress,
      });
      const gas = await starter.approveTokenEstimateGas({ amount: constants.MaxUint256, signer });
      const gasPrice = await sourceChainProvider.getGasPrice();
      if (gas) estimatedGasFees = Number(utils.formatEther(gas.mul(gasPrice)));
    } catch {
      // Approval metadata remains available when the wallet or gas RPC cannot provide an estimate.
    }
  }
  return { estimatedGasFees, contractAddress, requiresMaximumApproval: route === 'oftV2' };
}
