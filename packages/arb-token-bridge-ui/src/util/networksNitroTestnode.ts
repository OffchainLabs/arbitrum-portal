import { ArbitrumNetwork } from '@arbitrum/sdk';

import generatedNetworks from './networksNitroTestnode.generated.json';
import generatedCustomGasTokenNetworks from './networksNitroTestnodeCustomGasToken.generated.json';

type LocalNetworksFile = {
  l2Network: ArbitrumNetwork;
  l3Network: ArbitrumNetwork;
};

const localNetworks = generatedNetworks as LocalNetworksFile;
// litro's l3-custom-* images deploy a different L3 (fee token set, no WETH gateway) on the same L2.
const localCustomGasTokenNetworks = generatedCustomGasTokenNetworks as LocalNetworksFile;

export const defaultL2Network: ArbitrumNetwork = localNetworks.l2Network;
export const defaultL3Network: ArbitrumNetwork = localNetworks.l3Network;

// Registered over defaultL3Network at runtime when its fee token exists on the L2.
export const defaultL3CustomGasTokenNetwork: ArbitrumNetwork =
  localCustomGasTokenNetworks.l3Network;
