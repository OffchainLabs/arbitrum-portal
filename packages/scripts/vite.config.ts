import { builtinModules } from 'module';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // these scripts only ever run in Node (see .nvmrc), not in a browser.
    // vite's default target ('modules') includes safari14, which esbuild 0.28
    // treats as not supporting destructuring, and it cannot lower it.
    target: 'node22',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: (format) => `scripts.${format}.js`,
    },
    rollupOptions: {
      external: [
        // keep node builtins as real requires. otherwise vite swaps them for
        // empty browser shims, e.g. dotenv's `os`/`crypto`, which fails
        // silently at runtime instead of at build time.
        ...builtinModules,
        ...builtinModules.map((builtin) => `node:${builtin}`),
        // @actions/core and @actions/github are bundled: they are ESM-only and
        // their exports maps have no `require` entry, so the cjs build can't load them.
        'axios',
        'commander',
        'ethers',
        'sharp',
      ],
    },
  },
  optimizeDeps: {
    exclude: ['sharp'],
  },
});
