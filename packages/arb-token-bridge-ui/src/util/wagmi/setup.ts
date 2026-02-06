import { Chain, connectorsForWallets, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { _chains } from '@rainbow-me/rainbowkit/dist/config/getDefaultConfig';
import {
  binanceWallet,
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  safeWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { arbitrum, mainnet } from 'wagmi/chains';

import { ChainId } from '../../types/ChainId';
import { isDevelopmentEnvironment, isE2eTestingEnvironment } from '../CommonUtils';
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

const customChains = getCustomChainsFromLocalStorage().map((chain) => getWagmiChain(chain.chainId));
const wagmiOrbitChains = getOrbitChains().map((chain) => getWagmiChain(chain.chainId));

const defaultChains: readonly [Chain, ...Chain[]] = [
  // mainnet, arb1, & arb nova are for network switch tests
  mainnet,
  arbitrum,
  arbitrumNova,
  base,
  // sepolia & arb sepolia are for tx history panel tests
  sepolia,
  arbitrumSepolia,
  baseSepolia,
];

function getChainList(): readonly [Chain, ...Chain[]] {
  // for E2E tests, only have local + minimal required chains
  if (isE2eTestingEnvironment) {
    return [
      local,
      arbitrumLocal,
      l3Local,
      sepolia, // required for testing cctp
      arbitrumSepolia, // required for testing cctp
      mainnet, // required for import token test
    ];
  }

  // for local env, have all local + default + user added chains
  if (isDevelopmentEnvironment) {
    return [
      ...defaultChains,
      // Orbit chains
      ...wagmiOrbitChains,
      // add local environments during testing
      local,
      arbitrumLocal,
      l3Local,
      // user-added custom chains
      ...customChains,
    ];
  }

  // for preview + production env, return all non-local chains
  return [...defaultChains, ...wagmiOrbitChains, ...customChains];
}

const chainList = getChainList();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

if (!projectId) {
  console.error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID variable missing.');
}

const appInfo = {
  appName: 'Bridge to Arbitrum',
  projectId,
};

enum TargetChainKey {
  Ethereum = 'mainnet',
  ArbitrumOne = 'arbitrum-one',
  ArbitrumNova = 'arbitrum-nova',
  Base = 'base',
  Sepolia = 'sepolia',
  ArbitrumSepolia = 'arbitrum-sepolia',
  BaseSepolia = 'base-sepolia',
}

function sanitizeTargetChainKey(targetChainKey: string | null): TargetChainKey {
  // Default to Ethereum Mainnet if nothing passed in
  if (targetChainKey === null) {
    return TargetChainKey.Ethereum;
  }

  // Default to Ethereum Mainnet if invalid
  if (!(Object.values(TargetChainKey) as string[]).includes(targetChainKey)) {
    return TargetChainKey.Ethereum;
  }

  return targetChainKey as TargetChainKey;
}

function getChainId(targetChainKey: TargetChainKey): number {
  switch (targetChainKey) {
    case TargetChainKey.Ethereum:
      return ChainId.Ethereum;

    case TargetChainKey.ArbitrumOne:
      return ChainId.ArbitrumOne;

    case TargetChainKey.ArbitrumNova:
      return ChainId.ArbitrumNova;

    case TargetChainKey.Base:
      return ChainId.Base;

    case TargetChainKey.Sepolia:
      return ChainId.Sepolia;

    case TargetChainKey.ArbitrumSepolia:
      return ChainId.ArbitrumSepolia;

    case TargetChainKey.BaseSepolia:
      return ChainId.BaseSepolia;
  }
}

function getChains(targetChainKey: TargetChainKey) {
  const targetChainId = getChainId(targetChainKey);

  // Doing `Array.filter` instead of `Array.find` in case it's empty, just in case.
  const target = chainList.filter((chain) => chain.id === targetChainId);
  const others = chainList.filter((chain) => chain.id !== targetChainId);

  return [...target, ...others] as unknown as _chains;
}

let cachedProps: ReturnType<typeof createConfig>;
export function getProps(targetChainKey: string | null) {
  if (cachedProps) {
    return cachedProps;
  }

  const config = getDefaultConfig({
    // Wagmi selects the first chain as the one to target in WalletConnect, so it has to be the first in the array.
    //
    // https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
    ...appInfo,
    chains: getChains(sanitizeTargetChainKey(targetChainKey)),
  });

  const connectors = connectorsForWallets(
    [
      {
        groupName: 'Popular',
        wallets: [
          metaMaskWallet,
          rabbyWallet,
          safeWallet,
          walletConnectWallet,
          okxWallet,
          binanceWallet,
        ],
      },
      {
        groupName: 'More',
        wallets: [coinbaseWallet, injectedWallet],
      },
    ],
    appInfo,
  );

  // Ensure all chains in chainList have RPC URLs for WalletConnect
  // Use custom RPC URL if available, otherwise fall back to chain's default RPC URLs
  //
  // In the old setup, AppProviders was dynamically loaded only on the /bridge route via BridgeClient.tsx.
  // BridgeClient.tsx calls addOrbitChainsToArbitrumSDK() before loading App, ensuring orbit chains
  // are initialized before AppProviders runs getProps(). However, in the new setup, AppProviders
  // is loaded in AppShell.tsx for all routes, so orbit chains may not be initialized when getProps()
  // is called on non-bridge routes.
  // Additionally, WalletConnect v2 requires RPC URLs for ALL chains
  // in the chainList, not just those in rpcURLs. The original code only included chains from rpcURLs
  // in transports, which caused WalletConnect to fail with "Cannot destructure property 'value' of
  // 'undefined'" when it tried to extract RPC URLs for orbit chains that weren't in transports.
  // This fix ensures all chains in chainList have RPC URLs by:
  // 1. Using custom RPC URLs from rpcURLs if available
  // 2. Falling back to chain's default RPC URLs from chain.rpcUrls.default (handles both array
  //    and object formats, as orbit chains use object format)
  const transports = chainList.reduce(
    (acc, chain) => {
      const rpcUrl = rpcURLs[chain.id];
      if (rpcUrl) {
        acc[chain.id] = http(rpcUrl);
      } else if (chain.rpcUrls && chain.rpcUrls.default) {
        // Handle both array and object formats for rpcUrls.default
        if (Array.isArray(chain.rpcUrls.default) && chain.rpcUrls.default.length > 0) {
          const defaultRpcUrl = chain.rpcUrls.default[0].http?.[0];
          if (defaultRpcUrl) {
            acc[chain.id] = http(defaultRpcUrl);
          }
        } else if (!Array.isArray(chain.rpcUrls.default)) {
          // Handle object format (used by orbit chains)
          const defaultRpcUrl = chain.rpcUrls.default.http?.[0];
          if (defaultRpcUrl) {
            acc[chain.id] = http(defaultRpcUrl);
          }
        }
      }
      return acc;
    },
    {} as Record<number, ReturnType<typeof http>>,
  );

  const wagmiConfig = createConfig({
    ...config,
    batch: { multicall: true },
    ssr: true,
    connectors,
    transports,
  });

  cachedProps = wagmiConfig;
  return cachedProps;
}
