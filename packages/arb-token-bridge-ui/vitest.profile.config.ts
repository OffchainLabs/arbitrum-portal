import { defineConfig } from 'vitest/config';

import { ChainId } from './src/types/ChainId';
import integrationConfig from './vitest.integration.config';

// Answered by renderProfileNetwork.ts, the chain id is the path
const rpcUrl = (chainId: ChainId) => `https://rpc.profile.test/${chainId}`;

// Render times come from React's profiling build, the production build with profiling timers,
// which React and the other libraries pick when NODE_ENV is production. Counts and their causes
// come from the development build, which has the names of the hooks. Both builds render the same
// commits.
const isProfilingBuild = process.env.RENDER_PROFILE_BUILD === 'profiling';

// Profiles the renders of the integration scenarios in *.profile.tsx, see renderProfiler.ts
export default defineConfig({
  ...integrationConfig,
  // React's production build has no jsxDEV
  esbuild: { ...integrationConfig.esbuild, jsxDev: false },
  test: {
    ...integrationConfig.test,
    include: ['./src/**/*.profile.tsx'],
    // One file at a time, so measurements never compete for the CPU
    fileParallelism: false,
    // The profiler registers as React DevTools, which react-dom only looks for when it's loaded
    setupFiles: ['./vitest.profile.setup.ts', ...(integrationConfig.test?.setupFiles ?? [])],
    env: {
      ...integrationConfig.test?.env,
      ...(isProfilingBuild && { NODE_ENV: 'production' }),
      NEXT_PUBLIC_INFURA_KEY: 'profile',
      NEXT_PUBLIC_RPC_URL_ETHEREUM: rpcUrl(ChainId.Ethereum),
      NEXT_PUBLIC_RPC_URL_SEPOLIA: rpcUrl(ChainId.Sepolia),
      NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE: rpcUrl(ChainId.ArbitrumOne),
      NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA: rpcUrl(ChainId.ArbitrumNova),
      NEXT_PUBLIC_RPC_URL_BASE: rpcUrl(ChainId.Base),
      NEXT_PUBLIC_RPC_URL_ARBITRUM_SEPOLIA: rpcUrl(ChainId.ArbitrumSepolia),
      NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: rpcUrl(ChainId.BaseSepolia),
    },
    // To collect garbage before each interaction
    execArgv: ['--expose-gc'],
    silent: false,
  },
});
