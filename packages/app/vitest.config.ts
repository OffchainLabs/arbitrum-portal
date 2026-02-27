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
      '@/common': path.resolve(__dirname, '../portal/common'),
      '@/bridge': path.resolve(__dirname, '../arb-token-bridge-ui/src'),
    },
  },
});
