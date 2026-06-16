import { ArbitrumNetwork } from '@arbitrum/sdk';

import generatedNetworks from './networksNitroTestnode.generated.json';

type LocalNetworksFile = {
  l2Network: ArbitrumNetwork;
  l3Network: ArbitrumNetwork;
};

const localNetworks = generatedNetworks as LocalNetworksFile;

export const defaultL2Network: ArbitrumNetwork = localNetworks.l2Network;
export const defaultL3Network: ArbitrumNetwork = localNetworks.l3Network;

// Local custom-gas-token runs still use the restored local L3 and determine
// native token behavior at runtime.
export const defaultL3CustomGasTokenNetwork: ArbitrumNetwork = localNetworks.l3Network;
