import { BigNumber, constants } from 'ethers';

import { OftV2TransferStarter } from '../token-bridge-sdk/OftV2TransferStarter';
import { getOftV2TransferConfig } from '../token-bridge-sdk/oftUtils';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { getEvmWalletConfig } from './evm/walletConfig';

export function isOftTransfer(params: Parameters<typeof getOftV2TransferConfig>[0]) {
  return getOftV2TransferConfig(params).isValid;
}

export async function fetchOftFeeEstimate([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  isValidOftTransfer,
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  isValidOftTransfer: boolean,
]) {
  if (!isValidOftTransfer) {
    return {
      sourceChainGasFee: BigNumber.from(0),
      destinationChainGasFee: BigNumber.from(0),
    };
  }

  // Assuming minimal dust amount for gas estimates
  const amount = BigNumber.from(1);

  const wagmiConfig = await getEvmWalletConfig();
  const _walletAddress = walletAddress ?? constants.AddressZero;
  const sourceChainProvider = getProviderForChainId(sourceChainId);
  const destinationChainProvider = getProviderForChainId(destinationChainId);

  const { estimatedSourceChainFee, estimatedDestinationChainFee } = await new OftV2TransferStarter({
    sourceChainProvider,
    destinationChainProvider,
    sourceChainErc20Address,
  }).transferEstimateFee({
    amount,
    from: _walletAddress,
    wagmiConfig,
  });

  return {
    sourceChainGasFee: BigNumber.from(estimatedSourceChainFee),
    destinationChainGasFee: BigNumber.from(estimatedDestinationChainFee),
  };
}
