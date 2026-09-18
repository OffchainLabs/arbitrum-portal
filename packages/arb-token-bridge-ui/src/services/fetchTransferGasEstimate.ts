import { BigNumber, constants } from 'ethers';

import type { RouteContext } from '../components/TransferPanel/hooks/useRouteStore';
import type { TransferEstimateGasResult } from '../token-bridge-sdk/BridgeTransferStarter';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { getEvmWalletConfig } from './evm/walletConfig';

export async function fetchTransferGasEstimate([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  destinationAddress,
  amount,
  routeContext,
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  destinationAddress: string | undefined,
  amount: BigNumber,
  routeContext: RouteContext | undefined,
]): Promise<TransferEstimateGasResult> {
  if (routeContext) {
    const { isDepositMode } = await import('../util/isDepositMode');
    const deposit = isDepositMode({ sourceChainId, destinationChainId });
    const sum = (chainId: number) =>
      routeContext.gas.reduce(
        (total, gas) => (gas.chainId === chainId && gas.estimate ? total.add(gas.estimate) : total),
        constants.Zero,
      );
    return {
      estimatedParentChainGas: sum(deposit ? sourceChainId : destinationChainId),
      estimatedChildChainGas: sum(deposit ? destinationChainId : sourceChainId),
    };
  }
  if (
    getWalletEcosystem(sourceChainId) !== 'evm' ||
    getWalletEcosystem(destinationChainId) !== 'evm'
  )
    throw new Error('No transfer quote is available for this route');
  const { BridgeTransferStarterFactory } = await import(
    '../token-bridge-sdk/BridgeTransferStarterFactory'
  );
  const wagmiConfig = await getEvmWalletConfig();
  const _walletAddress = walletAddress ?? constants.AddressZero;
  // use chainIds to initialize the bridgeTransferStarter to save RPC calls
  const bridgeTransferStarter = BridgeTransferStarterFactory.create({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId,
    destinationChainErc20Address,
    lifiRoute: routeContext,
  });

  return await bridgeTransferStarter.transferEstimateGas({
    amount,
    from: _walletAddress,
    wagmiConfig,
    destinationAddress,
  });
}
