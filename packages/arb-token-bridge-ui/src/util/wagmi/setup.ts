import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { type AppKitNetwork } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';
import { http } from 'wagmi';
import { arbitrum, mainnet } from 'wagmi/chains';

import { unica } from '../../components/common/Font';
import { PORTAL_DOMAIN } from '../../constants';
import { isDevelopmentEnvironment, isE2eTestingEnvironment } from '../CommonUtils';
import { logger } from '../logger';
import { getCustomChainsFromLocalStorage, rpcURLs } from '../networks';
import { getOrbitChains } from '../orbitChainsList';
import { getWagmiChain } from './getWagmiChain';
import {
  localL2Network as arbitrumLocal,
  arbitrumNova,
  arbitrumSepolia,
  base,
  baseSepolia,
  localL3Network as l3Local,
  localL1Network as local,
  sepolia,
} from './wagmiAdditionalNetworks';

type AppKitNetworkList = readonly [AppKitNetwork, ...AppKitNetwork[]];

function asAppKitNetworkList(networks: AppKitNetwork[]): AppKitNetworkList {
  if (networks.length === 0) {
    throw new Error('[wagmi/setup] Expected at least one AppKit network.');
  }

  return networks as unknown as AppKitNetworkList;
}

const customChains = getCustomChainsFromLocalStorage().map((chain) => getWagmiChain(chain.chainId));
const wagmiOrbitChains = getOrbitChains().map((chain) => getWagmiChain(chain.chainId));

const defaultChains: AppKitNetworkList = [
  mainnet,
  arbitrum,
  arbitrumNova,
  base,
  sepolia,
  arbitrumSepolia,
  baseSepolia,
];

function getChainList(): AppKitNetworkList {
  if (isE2eTestingEnvironment) {
    return asAppKitNetworkList([local, arbitrumLocal, l3Local, sepolia, arbitrumSepolia, mainnet]);
  }

  if (isDevelopmentEnvironment) {
    return asAppKitNetworkList([
      ...defaultChains,
      ...wagmiOrbitChains,
      local,
      arbitrumLocal,
      l3Local,
      ...customChains,
    ]);
  }

  return asAppKitNetworkList([...defaultChains, ...wagmiOrbitChains, ...customChains]);
}

const chainList = getChainList();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

if (!projectId) {
  logger.error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID variable missing.');
}

function getTransports() {
  return chainList.reduce(
    (acc, chain) => {
      const chainId = Number(chain.id);
      const rpcUrl = rpcURLs[chainId];

      if (rpcUrl) {
        acc[chainId] = http(rpcUrl);
      } else {
        const defaultRpcUrl = chain.rpcUrls.default.http[0];

        if (defaultRpcUrl) {
          acc[chainId] = http(defaultRpcUrl);
        }
      }

      return acc;
    },
    {} as Record<number, ReturnType<typeof http>>,
  );
}

const metadata = {
  name: 'Bridge to Arbitrum',
  description: 'Bridge to Arbitrum',
  url: PORTAL_DOMAIN,
  icons: [`${PORTAL_DOMAIN}/logo.png`],
};

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...chainList],
  batch: { multicall: true },
  transports: getTransports(),
});

createAppKit({
  projectId,
  metadata,
  networks: [...chainList],
  defaultNetwork: chainList[0],
  adapters: [wagmiAdapter],
  features: {
    email: false,
    socials: false,
  },
  enableWalletGuide: false,
  themeVariables: {
    '--apkt-font-family': `${unica.style.fontFamily}, Roboto, sans-serif`,
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
