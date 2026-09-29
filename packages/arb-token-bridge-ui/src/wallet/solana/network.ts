import type { Chain } from 'wagmi/chains';

import { ChainId } from '../../types/ChainId';

export const solanaChain = {
  id: ChainId.Solana,
  name: 'Solana',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  rpcUrls: { default: { http: ['https://api.mainnet-beta.solana.com'] } },
  blockExplorers: { default: { name: 'Solscan', url: 'https://solscan.io' } },
} satisfies Chain;
