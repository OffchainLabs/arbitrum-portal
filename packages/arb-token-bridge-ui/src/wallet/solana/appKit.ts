import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';

import { ecosystems } from '../ecosystems';

export const appKitAdapters = ecosystems.solana.isEnabled() ? [new SolanaAdapter()] : [];
export const appKitNetworks = ecosystems.solana.isEnabled() ? [solana] : [];
