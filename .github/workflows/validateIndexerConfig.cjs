const fs = require('node:fs');
const path = require('node:path');

const configuredChainIds = (process.env.NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (configuredChainIds.length === 0) {
  throw new Error('NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS must enable at least one chain');
}

// The app always indexes these on top of the configured list (see sources.ts).
const defaultChainIds = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      '../../packages/arb-token-bridge-ui/src/util/txHistory/defaultIndexerChildChainIds.json',
    ),
    'utf8',
  ),
).map(String);

const enabledChainIds = Array.from(new Set([...defaultChainIds, ...configuredChainIds]));

let indexerUrls;

try {
  indexerUrls = JSON.parse(process.env.INDEXER_API_URL_BY_CHAIN ?? '');
} catch {
  throw new Error('INDEXER_API_URL_BY_CHAIN must be valid JSON');
}

if (!indexerUrls || typeof indexerUrls !== 'object' || Array.isArray(indexerUrls)) {
  throw new Error('INDEXER_API_URL_BY_CHAIN must be a JSON object');
}

const invalidChainIds = enabledChainIds.filter((chainId) => {
  if (!/^\d+$/.test(chainId)) {
    return true;
  }

  const value = indexerUrls[chainId];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol !== 'https:' && url.protocol !== 'http:';
  } catch {
    return true;
  }
});

if (invalidChainIds.length > 0) {
  throw new Error(
    `Every enabled indexer chain must have an HTTP(S) URL; invalid chain IDs: ${invalidChainIds.join(
      ', ',
    )}`,
  );
}

console.log(`Validated indexer configuration for ${enabledChainIds.length} chain(s)`);
