import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';

const LZ_VALUE_TRANSFER_API_BASE = 'https://transfer.layerzero-api.com/v1';

/**
 * Allowlist of tokens supported via the LayerZero Value Transfer API.
 * Maps source chain ID → token address (lowercased) → destination chain IDs.
 *
 * Phase 1: PYUSD on Ethereum <-> Arbitrum One only.
 * Expand this config to add more tokens/chains.
 */
const lzValueTransferConfig: {
  [sourceChainId: number]: {
    [tokenAddress: string]: {
      destinationChainIds: number[];
      dstTokenAddress: string;
      srcChainKey: string;
      dstChainKey: string;
    }[];
  };
} = {
  [ChainId.Ethereum]: {
    [CommonAddress.Ethereum.PYUSD.toLowerCase()]: [
      {
        destinationChainIds: [ChainId.ArbitrumOne],
        dstTokenAddress: CommonAddress.ArbitrumOne.PYUSD,
        srcChainKey: 'ethereum',
        dstChainKey: 'arbitrum',
      },
    ],
  },
  [ChainId.ArbitrumOne]: {
    [CommonAddress.ArbitrumOne.PYUSD.toLowerCase()]: [
      {
        destinationChainIds: [ChainId.Ethereum],
        dstTokenAddress: CommonAddress.Ethereum.PYUSD,
        srcChainKey: 'arbitrum',
        dstChainKey: 'ethereum',
      },
    ],
  },
};

export function getLzValueTransferConfig({
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
}: {
  sourceChainId: number;
  destinationChainId: number;
  sourceChainErc20Address?: string;
}):
  | { isValid: false }
  | {
      isValid: true;
      srcChainKey: string;
      dstChainKey: string;
      srcTokenAddress: string;
      dstTokenAddress: string;
    } {
  if (!sourceChainErc20Address) {
    return { isValid: false };
  }

  const sourceConfig = lzValueTransferConfig[sourceChainId];
  if (!sourceConfig) {
    return { isValid: false };
  }

  const tokenRoutes = sourceConfig[sourceChainErc20Address.toLowerCase()];
  if (!tokenRoutes) {
    return { isValid: false };
  }

  const route = tokenRoutes.find((r) => r.destinationChainIds.includes(destinationChainId));
  if (!route) {
    return { isValid: false };
  }

  return {
    isValid: true,
    srcChainKey: route.srcChainKey,
    dstChainKey: route.dstChainKey,
    srcTokenAddress: sourceChainErc20Address,
    dstTokenAddress: route.dstTokenAddress,
  };
}

export interface LzQuoteUserStep {
  type: 'TRANSACTION' | 'SIGNATURE';
  description: string;
  chainKey: string;
  chainType: string;
  signerAddress: string;
  transaction: {
    encoded: {
      chainId: number;
      data: string;
      from: string;
      to: string;
      value: string;
    };
  };
}

export interface LzQuote {
  id: string;
  routeSteps: { type: string; srcChainKey: string; description: string }[];
  feeUsd: string;
  feePercent: string;
  srcAmount: string;
  dstAmount: string;
  duration: { estimated: string };
  userSteps: LzQuoteUserStep[];
}

export async function fetchLzQuote({
  srcChainKey,
  dstChainKey,
  srcTokenAddress,
  dstTokenAddress,
  srcWalletAddress,
  dstWalletAddress,
  amount,
}: {
  srcChainKey: string;
  dstChainKey: string;
  srcTokenAddress: string;
  dstTokenAddress: string;
  srcWalletAddress: string;
  dstWalletAddress?: string;
  amount: string;
}): Promise<LzQuote> {
  const response = await fetch(`${LZ_VALUE_TRANSFER_API_BASE}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      srcChainKey,
      dstChainKey,
      srcTokenAddress,
      dstTokenAddress,
      srcWalletAddress,
      dstWalletAddress: dstWalletAddress ?? srcWalletAddress,
      amount,
      options: {
        amountType: 'EXACT_SRC_AMOUNT',
        feeTolerance: { type: 'PERCENT', amount: 2 },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`LayerZero Value Transfer API quote failed: ${response.statusText}`);
  }

  const { quotes } = (await response.json()) as { quotes: LzQuote[] };
  const quote = quotes[0];

  if (!quote) {
    throw new Error('No quote returned from LayerZero Value Transfer API');
  }

  return quote;
}

export type LzTransferStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

export async function fetchLzTransferStatus({
  quoteId,
  txHash,
}: {
  quoteId: string;
  txHash?: string;
}): Promise<{ status: LzTransferStatus; explorerUrl?: string }> {
  const query = txHash ? `?txHash=${encodeURIComponent(txHash)}` : '';
  const response = await fetch(
    `${LZ_VALUE_TRANSFER_API_BASE}/status/${encodeURIComponent(quoteId)}${query}`,
  );

  if (!response.ok) {
    throw new Error(`LayerZero Value Transfer status check failed: ${response.statusText}`);
  }

  return response.json();
}
