import type { EcosystemConfig } from '.';

export const solanaEcosystem: EcosystemConfig = {
  isEnabled: () => process.env.NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED === 'true',
};
