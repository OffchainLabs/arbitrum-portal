import type { EarnNetwork } from '@/earn-api/types';

const MAINNET_NETWORK_HINTS = ['mainnet', 'ethereum', 'eth'] as const;
const ARBITRUM_NETWORK_HINTS = ['arbitrum', 'arb'] as const;

export function getEarnRequestNetwork(networkName?: string | null): EarnNetwork {
  const normalized = networkName?.trim().toLowerCase() ?? '';

  if (!normalized) {
    return 'arbitrum';
  }

  if (MAINNET_NETWORK_HINTS.some((hint) => normalized === hint || normalized.includes(hint))) {
    return 'mainnet';
  }

  if (ARBITRUM_NETWORK_HINTS.some((hint) => normalized === hint || normalized.includes(hint))) {
    return 'arbitrum';
  }

  return 'arbitrum';
}
