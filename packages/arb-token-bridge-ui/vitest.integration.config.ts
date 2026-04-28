import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    fileParallelism: true,
    sequence: { concurrent: true },
    snapshotFormat: {
      escapeString: true,
    },
    testTimeout: 120_000,
    include: ['./src/**/*.integration.test.ts', './src/**/*.integration.test.tsx'],
    env: loadEnv('', '../app/', ''),
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        url: 'http://localhost:3000',
      },
    },
    setupFiles: ['./vitest.mocks.ts', './vitest.integration.setup.tsx'],
  },
  resolve: {
    alias: {
      '@/images': path.resolve(__dirname, '../app/public/images'),
      '@/icons': path.resolve(__dirname, '../app/public/icons'),
      '@/common': path.resolve(__dirname, '../portal/common'),
      '@/components': path.resolve(__dirname, '../portal/components'),
      '@/portal': path.resolve(__dirname, '../portal'),
      '@/app-components': path.resolve(__dirname, '../app/src/components'),
      '@/token-bridge-sdk': path.resolve(__dirname, './src/token-bridge-sdk'),
      '@/bridge': path.resolve(__dirname, './src'),
    },
  },
});
