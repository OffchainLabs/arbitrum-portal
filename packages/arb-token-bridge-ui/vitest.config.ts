import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    sequence: { concurrent: true },
    snapshotFormat: {
      escapeString: true,
    },
    testTimeout: 15_000,
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx'],
    env: loadEnv('', '../app/', ''),
    environment: 'happy-dom',
    setupFiles: ['./vitest.mocks.ts'],
  },
  resolve: {
    alias: {
      '@/images': path.resolve(__dirname, '../app/public/images'),
      '@/icons': path.resolve(__dirname, '../app/public/icons'),
      '@/common': path.resolve(__dirname, '../portal/common'),
      '@/portal': path.resolve(__dirname, '../portal'),
      '@/token-bridge-sdk': path.resolve(__dirname, './src/token-bridge-sdk'),
      '@/bridge': path.resolve(__dirname, './src'),
    },
  },
});
