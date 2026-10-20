import { defineConfig } from 'vitest/config';

import { ChainId } from './src/types/ChainId';
import integrationConfig from './vitest.integration.config';

// Answered by renderProfileNetwork.ts, the chain id is the path
const rpcUrl = (chainId: ChainId) => `https://rpc.profile.test/${chainId}`;

// Profiles the renders of the integration scenarios in *.profile.tsx, see renderProfiler.ts
export default defineConfig({
  ...integrationConfig,
  test: {
    ...integrationConfig.test,
    include: ['./src/**/*.profile.tsx'],
    // The profiler registers as React DevTools, which react-dom only looks for when it's loaded
    setupFiles: ['./vitest.profile.setup.ts', ...(integrationConfig.test?.setupFiles ?? [])],
    env: {
      ...integrationConfig.test?.env,
      NEXT_PUBLIC_INFURA_KEY: 'profile',
      NEXT_PUBLIC_RPC_URL_ETHEREUM: rpcUrl(ChainId.Ethereum),
      NEXT_PUBLIC_RPC_URL_SEPOLIA: rpcUrl(ChainId.Sepolia),
      NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE: rpcUrl(ChainId.ArbitrumOne),
      NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA: rpcUrl(ChainId.ArbitrumNova),
      NEXT_PUBLIC_RPC_URL_BASE: rpcUrl(ChainId.Base),
      NEXT_PUBLIC_RPC_URL_ARBITRUM_SEPOLIA: rpcUrl(ChainId.ArbitrumSepolia),
      NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: rpcUrl(ChainId.BaseSepolia),
    },
    silent: false,
  },
});
