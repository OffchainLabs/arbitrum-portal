import { zeroDevWallet, zeroDevWalletConnect } from '@zerodev/wallet-react-ui';
import { type Chain } from 'viem';
import { type CreateConnectorFn, createConfig, http } from 'wagmi';
import { arbitrum, mainnet } from 'wagmi/chains';

import { PORTAL_DOMAIN } from '../../constants';
import { isDevelopmentEnvironment, isE2eTestingEnvironment } from '../CommonUtils';
import { logger } from '../logger';
import { getCustomChainsFromLocalStorage, initializeBridgeNetworks, rpcURLs } from '../networks';
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

type ChainList = readonly [Chain, ...Chain[]];

function asChainList(chains: Chain[]): ChainList {
  if (chains.length === 0) {
    throw new Error('[wagmi/setup] Expected at least one chain.');
  }

  return chains as unknown as ChainList;
}

initializeBridgeNetworks();

const customChains = getCustomChainsFromLocalStorage().map((chain) => getWagmiChain(chain.chainId));
const wagmiOrbitChains = getOrbitChains().map((chain) => getWagmiChain(chain.chainId));

const defaultChains: Chain[] = [
  mainnet,
  arbitrum,
  arbitrumNova,
  base,
  sepolia,
  arbitrumSepolia,
  baseSepolia,
];

function getChainList(): ChainList {
  if (isE2eTestingEnvironment) {
    return asChainList([local, arbitrumLocal, l3Local, sepolia, arbitrumSepolia, mainnet]);
  }

  if (isDevelopmentEnvironment) {
    return asChainList([
      ...defaultChains,
      ...wagmiOrbitChains,
      local,
      arbitrumLocal,
      l3Local,
      ...customChains,
    ]);
  }

  return asChainList([...defaultChains, ...wagmiOrbitChains, ...customChains]);
}

const chainList = getChainList();

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

if (!walletConnectProjectId) {
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

function getConnectors(): CreateConnectorFn[] {
  const connectors: CreateConnectorFn[] = [
    // Required by the ZeroDev wallet kit even for external-wallets-only usage:
    // this connector hosts the kit's UI store (useAuth/useKitStore look it up by
    // id 'zerodev-wallet'). It is never shown in the connect UI, and
    // `autoInitialize: false` keeps the embedded wallet from ever booting.
    zeroDevWallet({
      projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID ?? '',
      chains: chainList,
      autoInitialize: false,
    }),
  ];

  // The kit only pairs through its own WalletConnect connector; a raw
  // walletConnect() from wagmi/connectors would be ignored by its UI.
  if (walletConnectProjectId) {
    connectors.push(
      zeroDevWalletConnect({
        projectId: walletConnectProjectId,
        metadata,
      }),
    );
  }

  return connectors;
}

export const wagmiConfig = createConfig({
  chains: chainList,
  connectors: getConnectors(),
  transports: getTransports(),
  batch: { multicall: true },
});
