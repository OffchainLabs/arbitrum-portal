import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

import unitConfig from './vitest.config';

export default defineConfig({
  esbuild: unitConfig.esbuild,
  resolve: unitConfig.resolve,
  test: {
    // Benchmarks don't send requests, so a placeholder RPC key is enough without a .env
    env: { NEXT_PUBLIC_INFURA_KEY: 'benchmark', ...loadEnv('', '../app/', '') },
    // Benchmarks only call pure functions, so they don't need a DOM
    environment: 'node',
    setupFiles: unitConfig.test?.setupFiles,
    benchmark: {
      include: ['./src/**/*.bench.ts'],
    },
  },
});
