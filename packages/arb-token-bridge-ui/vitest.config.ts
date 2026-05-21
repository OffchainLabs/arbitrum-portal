import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    sequence: { concurrent: true },
    snapshotFormat: {
      escapeString: true,
    },
    testTimeout: 15_000,
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
    exclude: ['./src/**/*.integration.test.ts', './src/**/*.integration.test.tsx'],
    env: loadEnv('', '../app/', ''),
    environment: 'happy-dom',
    setupFiles: ['./vitest.mocks.ts'],
  },
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, '../app'),
      '@/images': path.resolve(__dirname, '../app/public/images'),
      '@/icons': path.resolve(__dirname, '../app/public/icons'),
      '@/public': path.resolve(__dirname, '../app/public'),
      '@/common': path.resolve(__dirname, '../portal/common'),
      '@/components': path.resolve(__dirname, '../portal/components'),
      '@/hooks': path.resolve(__dirname, '../portal/hooks'),
      '@/portal': path.resolve(__dirname, '../portal'),
      '@/app-components': path.resolve(__dirname, '../app/src/components'),
      '@/app-hooks': path.resolve(__dirname, '../app/src/hooks'),
      '@/app-services': path.resolve(__dirname, '../app/src/services'),
      '@/app-store': path.resolve(__dirname, '../app/src/store'),
      '@/app-types': path.resolve(__dirname, '../app/src/types'),
      '@/app-lib': path.resolve(__dirname, '../app/src/lib'),
      '@/earn-api': path.resolve(__dirname, '../app/src/app/api/onchain-actions/v1/earn'),
      '@/token-bridge-sdk': path.resolve(__dirname, './src/token-bridge-sdk'),
      '@/bridge': path.resolve(__dirname, './src'),
    },
  },
});
