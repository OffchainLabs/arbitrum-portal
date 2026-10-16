import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';

import { ecosystems } from '../ecosystems';
import { solanaRpcUrl } from './network';

export const appKitAdapters = ecosystems.solana.isEnabled() ? [new SolanaAdapter()] : [];
export const appKitNetworks = ecosystems.solana.isEnabled() ? [solana] : [];
// AppKit lists custom RPC URLs before Reown's, so the adapter's connection uses ours
export const appKitCustomRpcUrls = ecosystems.solana.isEnabled()
  ? { [solana.caipNetworkId]: [{ url: solanaRpcUrl }] }
  : undefined;
