import { FlatCompat } from '@eslint/eslintrc';
import tsParser from '@typescript-eslint/parser';
import zustandRules from 'eslint-plugin-zustand-rules';
import { globalIgnores } from 'eslint/config';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const jestPlugin = require('eslint-plugin-jest');

const disabledJestRules = Object.fromEntries(
  Object.keys(jestPlugin?.configs?.recommended?.rules ?? {}).map((rule) => [rule, 'off']),
);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

// Shared configuration objects
const sharedLanguageOptions = {
  parser: tsParser,
  sourceType: 'module',
  parserOptions: {
    project: ['./tsconfig.eslint.json', './tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
};

const sharedPlugins = {
  'zustand-rules': zustandRules,
};

const sharedSettings = {
  react: {
    version: 'detect',
  },
  next: {
    rootDir: ['packages/app/'],
  },
};

const mainRules = {
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/ban-ts-comment': [
    'error',
    {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': 'allow-with-description',
      'ts-nocheck': 'allow-with-description',
      'ts-check': 'allow-with-description',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-non-null-assertion': 'warn',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      vars: 'all',
      args: 'after-used',
      caughtErrors: 'none',
      ignoreRestSiblings: true,
      reportUsedIgnorePattern: false,
    },
  ],
  'zustand-rules/enforce-use-setstate': 'error',
  'zustand-rules/no-state-mutation': 'error',
  'zustand-rules/use-store-selectors': 'error',
  '@next/next/no-html-link-for-pages': [
    'error',
    [
      path.join(__dirname, '/packages/arb-token-bridge-ui/src/components'),
      path.join(__dirname, '/packages/app/src'),
    ],
  ],
};

export default [
  ...compat.extends(
    '@offchainlabs/eslint-config-typescript/base',
    '@offchainlabs/eslint-config-typescript/next',
  ),
  {
    settings: {
      next: {
        rootDir: 'packages/app/',
      },
    },
  },
  {
    files: [
      'packages/app/**/*.{js,jsx,ts,tsx}',
      'packages/arb-token-bridge-ui/**/*.{js,jsx,ts,tsx}',
      'packages/portal/**/*.{js,jsx,ts,tsx}',
      'packages/scripts/src/**/*.{js,jsx,ts,tsx}',
    ],
    ignores: ['node_modules/', '**/node_modules/**'],
    plugins: sharedPlugins,
    languageOptions: sharedLanguageOptions,
    settings: sharedSettings,
    rules: mainRules,
  },
  {
    files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}', '__tests__/**/*.{ts,tsx}'],
    plugins: sharedPlugins,
    languageOptions: sharedLanguageOptions,
    settings: sharedSettings,
    rules: {
      ...mainRules,
      ...disabledJestRules,
    },
  },
  {
    files: ['**/tests/e2e/**/*.ts', '**/tests/support/**/*.js'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: ['packages/arb-token-bridge-ui/tests/tsconfig.json'],
      },
    },
    rules: {
      // Cypress awaiting by default
      'no-debugger': 0,
      'no-console': 0,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          caughtErrors: 'none',

          ignoreRestSiblings: true,
          reportUsedIgnorePattern: false,
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  globalIgnores([
    '**/node_modules',
    '**/dist',
    '**/packages/app/build',
    '**/.next/',
    '.github/',
    '**/cypress/',
    '**/next-env.d.ts',
  ]),
];
