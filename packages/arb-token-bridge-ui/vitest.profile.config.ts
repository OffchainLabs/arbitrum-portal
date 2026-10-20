import { defineConfig } from 'vitest/config';

import integrationConfig from './vitest.integration.config';

// Profiles the renders of the integration scenarios in *.profile.tsx, see renderProfiler.ts
export default defineConfig({
  ...integrationConfig,
  test: {
    ...integrationConfig.test,
    include: ['./src/**/*.profile.tsx'],
    // The profiler registers as React DevTools, which react-dom only looks for when it's loaded
    setupFiles: ['./vitest.profile.setup.ts', ...(integrationConfig.test?.setupFiles ?? [])],
    silent: false,
  },
});
