import { ChainId } from '@/bridge/types/ChainId';
import { isSolanaEnabled } from '@/bridge/util/featureFlag';

export const additionalSourceChainIds: readonly number[] = isSolanaEnabled()
  ? [ChainId.Solana]
  : [];
