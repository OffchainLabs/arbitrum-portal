import { defineConfig } from 'vitest/config';

import integrationConfig from './vitest.integration.config';
import profileConfig from './vitest.profile.config';

// Runs the browser benchmark, see tests/browser-bench/README.md. Vitest only runs the Node side,
// with the path aliases the generated API responses need. The app runs in Chrome.
export default defineConfig({
  resolve: integrationConfig.resolve,
  test: {
    include: ['./tests/browser-bench/*.run.ts'],
    environment: 'node',
    // The generated responses import app code, which reads the RPC settings of the render profile
    env: profileConfig.test?.env,
    fileParallelism: false,
    testTimeout: 60 * 60 * 1000,
    silent: false,
  },
});
