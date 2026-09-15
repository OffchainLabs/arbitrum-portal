import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    env: {
      NEXT_PUBLIC_INFURA_KEY: 'test-infura-key',
    },
  },
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, '.'),
      '@wallet-runtime': path.resolve(
        __dirname,
        '../arb-token-bridge-ui/src/wallet/runtime/disabled.tsx',
      ),
      '@/common': path.resolve(__dirname, '../portal/common'),
      '@/bridge': path.resolve(__dirname, '../arb-token-bridge-ui/src'),
      '@/app-lib': path.resolve(__dirname, './src/lib'),
      '@/app-types': path.resolve(__dirname, './src/types'),
      '@/app-hooks': path.resolve(__dirname, './src/hooks'),
      '@/earn-api': path.resolve(__dirname, './src/app/api/onchain-actions/v1/earn'),
    },
  },
});
