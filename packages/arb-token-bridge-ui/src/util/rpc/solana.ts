import { loadEnvironmentVariableWithFallback } from '../index';

export const solanaRpcUrl = loadEnvironmentVariableWithFallback({
  env: process.env.NEXT_PUBLIC_RPC_URL_SOLANA,
  fallback: 'https://solana-rpc.publicnode.com',
});
