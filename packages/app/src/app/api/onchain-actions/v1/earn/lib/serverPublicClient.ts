import { createPublicClient, fallback, http } from 'viem';
import { arbitrum, mainnet } from 'viem/chains';

import { PORTAL_DOMAIN } from '@/bridge/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { rpcURLs } from '@/bridge/util/networks';

import type { EarnChainId } from '../types';
import { ValidationError } from './validation';

function getServerOrigin() {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  return process.env.PORTAL_DOMAIN?.trim() || PORTAL_DOMAIN;
}

function getEarnChain(chainId: EarnChainId) {
  if (chainId === ChainId.Ethereum) return mainnet;
  if (chainId === ChainId.ArbitrumOne) return arbitrum;
  throw new ValidationError('UNSUPPORTED_CHAIN_ID', `Unsupported chainId ${chainId}`);
}

export function createEarnPublicClient(chainId: EarnChainId) {
  const chain = getEarnChain(chainId);
  const primaryRpcUrl = rpcURLs[chainId];
  const publicRpcUrl = chain.rpcUrls.default.http[0];
  const primaryTransport = http(primaryRpcUrl, {
    fetchOptions: { headers: { Origin: getServerOrigin() } },
  });
  const transport =
    publicRpcUrl && publicRpcUrl !== primaryRpcUrl
      ? fallback([primaryTransport, http(publicRpcUrl)])
      : primaryTransport;

  return createPublicClient({
    chain,
    transport,
  });
}
