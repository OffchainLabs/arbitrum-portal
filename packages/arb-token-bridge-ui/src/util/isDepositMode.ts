import { ChainId } from '../types/ChainId';
import { isNetwork } from '../util/networks';

export function isDepositMode({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}) {
  const isApeChainRobinhoodPair =
    (sourceChainId === ChainId.RobinhoodChain && destinationChainId === ChainId.ApeChain) ||
    (sourceChainId === ChainId.ApeChain && destinationChainId === ChainId.RobinhoodChain);

  if (isApeChainRobinhoodPair) {
    return sourceChainId === ChainId.RobinhoodChain;
  }

  const {
    isEthereumMainnetOrTestnet: isSourceChainEthereum,
    isArbitrum: isSourceChainArbitrum,
    isBase: isSourceChainBase,
  } = isNetwork(sourceChainId);
  const { isOrbitChain: isDestinationChainOrbit } = isNetwork(destinationChainId);

  const isDepositMode =
    isSourceChainEthereum ||
    isSourceChainBase ||
    (isSourceChainArbitrum && isDestinationChainOrbit);

  return isDepositMode;
}
