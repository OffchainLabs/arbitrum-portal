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
    },
  },
});
