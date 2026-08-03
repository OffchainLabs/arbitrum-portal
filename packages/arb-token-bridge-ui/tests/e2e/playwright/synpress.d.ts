// Synpress v3 ships its Playwright command modules without bundled type declarations.
// These ambient declarations let the Playwright specs import them without TS errors.
// Mirrors the existing synpress-plugins.d.ts used by the Cypress setup.
declare module '@synthetixio/synpress/commands/metamask';
declare module '@synthetixio/synpress/commands/playwright';
declare module '@synthetixio/synpress/helpers';
