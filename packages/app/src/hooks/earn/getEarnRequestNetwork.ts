import type { EarnNetwork } from '@/earn-api/types';

const MAINNET_NETWORK_HINTS = ['mainnet', 'ethereum'] as const;

export function getEarnRequestNetwork(networkName?: string | null): EarnNetwork {
  const normalized = (networkName ?? '').toLowerCase();
  return MAINNET_NETWORK_HINTS.some((hint) => normalized.includes(hint)) ? 'mainnet' : 'arbitrum';
}
