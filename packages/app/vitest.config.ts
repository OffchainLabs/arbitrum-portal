import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/bridge': path.resolve(__dirname, '../arb-token-bridge-ui/src'),
      '@/app-types': path.resolve(__dirname, './src/types'),
      '@/app-hooks': path.resolve(__dirname, './src/hooks'),
      '@/earn-api': path.resolve(__dirname, './src/app/api/onchain-actions/v1/earn'),
    },
  },
});
