/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions & import('@trivago/prettier-plugin-sort-imports').PluginConfig} */
module.exports = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ...require('@offchainlabs/prettier-config'),
  plugins: ['prettier-plugin-tailwindcss', '@trivago/prettier-plugin-sort-imports'],
  // Tailwind v4 reads the theme from CSS; the stylesheet loads tailwind.config.js via @config.
  tailwindStylesheet: './packages/app/src/app.css',
};
