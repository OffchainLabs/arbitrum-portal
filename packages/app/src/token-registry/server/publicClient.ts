import { createPublicClient, http } from 'viem';

import { PORTAL_DOMAIN } from '@/bridge/constants';
import { initializeBridgeNetworks, rpcURLs } from '@/bridge/util/networks';

// The browser's Alchemy key only accepts the site's origins, and a server request sends no Origin
// header, so Alchemy answers 403. For the PoC, the server sends the origin the browser would: the
// deployment URL on a preview, the portal domain in production. Local dev sends none, and works
// with an unrestricted key.
function getRequestOrigin(): string | undefined {
  if (process.env.VERCEL_ENV === 'production') {
    return PORTAL_DOMAIN;
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
}

export function getPublicClient(chainId: number) {
  // Registers the Orbit chains' RPC URLs.
  initializeBridgeNetworks();
  const url = rpcURLs[chainId];
  if (!url) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }
  const origin = getRequestOrigin();
  return createPublicClient({
    transport: http(url, origin ? { fetchOptions: { headers: { Origin: origin } } } : undefined),
  });
}
