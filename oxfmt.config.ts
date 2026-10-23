import { defineConfig } from 'oxfmt';

export default defineConfig({
  // Same options as @offchainlabs/prettier-config
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  bracketSpacing: true,
  arrowParens: 'always',
  trailingComma: 'all',
  printWidth: 100,
  quoteProps: 'consistent',
  // Same order as @offchainlabs/prettier-config's importOrder: packages, then @/ aliases, then relative imports
  sortImports: {
    ignoreCase: false,
    sortSideEffects: true,
    internalPattern: ['@/'],
    groups: [
      ['builtin', 'external', 'subpath', 'unknown'],
      'internal',
      ['parent', 'sibling', 'index'],
    ],
  },
  // Tailwind v4 reads the theme from CSS; the stylesheet loads tailwind.config.js via @config.
  sortTailwindcss: { stylesheet: './packages/app/src/app.css' },
  sortPackageJson: false,
  ignorePatterns: [
    '**/.next',
    '**/out',
    '**/packages/app/build',
    '**/dist',
    '**/public/',
    'pnpm-lock.yaml',
  ],
});
