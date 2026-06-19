import { Chain, PublicClient, createPublicClient, fallback, http } from 'viem';
import { arbitrum, mainnet } from 'viem/chains';

import { PORTAL_DOMAIN } from '@/bridge/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { rpcURLs } from '@/bridge/util/networks';

// Alchemy keys are Origin-allowlisted, so server requests must present the
// canonical domain (prod) or the preview URL (non-prod). VERCEL_URL is set in
// prod too, so only use it off-prod — prod must hit PORTAL_DOMAIN.
function getServerOrigin(): string {
  const isNonProd = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production';
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (isNonProd && vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }
  return process.env.PORTAL_DOMAIN?.trim() || PORTAL_DOMAIN;
}

const viemChainsById: Partial<Record<ChainId, Chain>> = {
  [ChainId.Ethereum]: mainnet,
  [ChainId.ArbitrumOne]: arbitrum,
};

// Server-side viem client with the Alchemy Origin header and a public-RPC
// fallback. Used by the earn API and the CCTP history backfill.
export function createServerSidePublicClient(chainId: ChainId): PublicClient {
  const chain = viemChainsById[chainId];
  if (!chain) {
    throw new Error(`[createServerSidePublicClient] unsupported chainId: ${chainId}`);
  }

  const primaryRpcUrl = rpcURLs[chainId];
  const publicRpcUrl = chain.rpcUrls.default.http[0];
  const primaryTransport = http(primaryRpcUrl, {
    fetchOptions: { headers: { Origin: getServerOrigin() } },
  });
  const transport =
    publicRpcUrl && publicRpcUrl !== primaryRpcUrl
      ? fallback([primaryTransport, http(publicRpcUrl)])
      : primaryTransport;

  return createPublicClient({ chain, transport });
}
