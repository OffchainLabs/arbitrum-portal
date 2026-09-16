import { loadEnvironmentVariableWithFallback } from '../../util';

const alchemyKey =
  process.env.NEXT_PUBLIC_ALCHEMY_KEY_SOLANA?.trim() || process.env.NEXT_PUBLIC_ALCHEMY_KEY?.trim();

// The Alchemy app behind the key must have Solana enabled. Without a key, the public RPC is rate limited.
// Not publicnode: its `getBlockHeight` returns the slot, so LiFi gives up confirming transactions right away.
export const solanaRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_RPC_URL_SOLANA,
  fallback: alchemyKey
    ? `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://api.mainnet-beta.solana.com',
});
