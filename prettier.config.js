/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions & import('@trivago/prettier-plugin-sort-imports').PluginConfig} */
module.exports = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ...require('@offchainlabs/prettier-config'),
  plugins: ['prettier-plugin-tailwindcss', '@trivago/prettier-plugin-sort-imports'],
};
