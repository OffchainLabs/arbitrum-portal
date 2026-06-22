import { createConfig, getTransactionHistory } from '@lifi/sdk';
import type { ExtendedTransactionInfo, StatusResponse } from '@lifi/types';
import { constants, utils } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';

import { AssetType } from '../../../../hooks/arbTokenBridge.types';
import { DepositStatus, WithdrawalStatus } from '../../../../state/app/state';
import { normalizeTimestamp } from '../../../../state/app/utils';
import { addressesEqual } from '../../../../util/AddressUtils';
import { getLifiTransferStatus } from '../../../../util/LifiTransactionStatus';
import { getNetworksRelationship } from '../../../../util/getNetworksRelationship';
import { LIFI_INTEGRATOR_IDS } from '../lifi';
import type { Token } from '../types';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
};

type LifiTransactionHistoryAmount = {
  amount: string;
  amountUSD: string;
  token: Token;
};

export type LifiTransactionHistoryItem = {
  txId: string;
  asset: string;
  assetType: AssetType;
  blockNum: null;
  createdAt: number | null;
  direction: 'deposit' | 'withdraw';
  isWithdrawal: boolean;
  resolvedAt: number | null;
  status: WithdrawalStatus;
  destinationStatus: WithdrawalStatus;
  uniqueId: null;
  value: string;
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE;
  destination: string;
  sender: string;
  isLifi: true;
  tokenAddress: string;
  parentChainId: number;
  childChainId: number;
  sourceChainId: number;
  destinationChainId: number;
  toolDetails: { key: string; name: string; logoURI: string };
  durationMs: number;
  fromAmount: LifiTransactionHistoryAmount;
  toAmount: LifiTransactionHistoryAmount;
  destinationTxId: string | null;
};

export type LifiTransactionHistoryResponse =
  | {
      message: string;
      data: null;
    }
  | {
      data: LifiTransactionHistoryItem[];
    };

function getIntegratorId(request: NextRequest): string {
  const referer = request.headers.get('referer');
  const isEmbedMode = referer && referer.includes('/bridge/embed');
  return isEmbedMode ? LIFI_INTEGRATOR_IDS.EMBED : LIFI_INTEGRATOR_IDS.NORMAL;
}

function getIncludedSteps(statusResponse: StatusResponse) {
  if (!('includedSteps' in statusResponse.sending)) {
    return [];
  }

  return statusResponse.sending.includedSteps ?? [];
}

export function transformLifiHistoryTransaction({
  wallet,
  statusResponse,
}: {
  wallet: string;
  statusResponse: StatusResponse;
}): LifiTransactionHistoryItem | null {
  if (!statusResponse.sending.txHash) {
    return null;
  }

  const includedSteps = getIncludedSteps(statusResponse);
  const firstStep = includedSteps[0];
  const lastStep = includedSteps[includedSteps.length - 1];
  const sending = statusResponse.sending as Partial<ExtendedTransactionInfo>;
  const receiving =
    'receiving' in statusResponse
      ? (statusResponse.receiving as Partial<ExtendedTransactionInfo>)
      : undefined;
  const sourceChainId = Number(sending.chainId || firstStep?.fromToken.chainId);
  const destinationChainId = Number(
    receiving ? receiving.chainId || lastStep?.toToken.chainId : lastStep?.toToken.chainId,
  );

  if (!sourceChainId || !destinationChainId) {
    return null;
  }

  const fromToken = sending.token || firstStep?.fromToken;
  const toToken = receiving?.token || lastStep?.toToken;
  const fromAmount = sending.amount || firstStep?.fromAmount;
  const toAmount = receiving?.amount || lastStep?.toAmount;
  const toolDetails =
    firstStep?.toolDetails ??
    ('tool' in statusResponse
      ? {
          key: statusResponse.tool,
          logoURI: '',
          name: statusResponse.tool,
        }
      : null);

  if (!fromToken || !toToken || !fromAmount || !toAmount || !toolDetails) {
    return null;
  }

  const createdAt = sending.timestamp ? normalizeTimestamp(sending.timestamp) : null;
  const resolvedAt = receiving?.timestamp ? normalizeTimestamp(receiving.timestamp) : null;
  const { status, destinationStatus, destinationTxId } = getLifiTransferStatus(statusResponse);
  // Use the same parent/child resolution as the UI (`useNetworksRelationship`) so a
  // transfer is keyed identically whether it comes from the local cache or this API,
  // otherwise dedup fails and the transfer shows twice in history.
  const { parentChainId, childChainId, isDepositMode } = getNetworksRelationship({
    sourceChainId,
    destinationChainId,
  });
  const isWithdrawal = !isDepositMode;

  return {
    txId: statusResponse.sending.txHash,
    asset: fromToken.symbol,
    assetType: addressesEqual(fromToken.address, constants.AddressZero)
      ? AssetType.ETH
      : AssetType.ERC20,
    blockNum: null,
    createdAt,
    direction: isWithdrawal ? 'withdraw' : 'deposit',
    isWithdrawal,
    resolvedAt,
    status,
    destinationStatus,
    uniqueId: null,
    value: utils.formatUnits(fromAmount, fromToken.decimals),
    depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
    destination: 'toAddress' in statusResponse ? statusResponse.toAddress : wallet,
    sender: 'fromAddress' in statusResponse ? statusResponse.fromAddress : wallet,
    isLifi: true,
    tokenAddress: fromToken.address,
    parentChainId,
    childChainId,
    sourceChainId,
    destinationChainId,
    toolDetails,
    durationMs: createdAt && resolvedAt ? Math.max(resolvedAt - createdAt, 0) : 0,
    fromAmount: {
      amount: fromAmount,
      amountUSD: sending.amountUSD ?? '0',
      token: fromToken,
    },
    toAmount: {
      amount: toAmount,
      amountUSD: receiving?.amountUSD ?? '0',
      token: toToken,
    },
    destinationTxId,
  };
}

export function transformLifiHistoryTransactions({
  wallet,
  statusResponses,
}: {
  wallet: string;
  statusResponses: StatusResponse[];
}): LifiTransactionHistoryItem[] {
  return statusResponses
    .map((statusResponse) => {
      try {
        return transformLifiHistoryTransaction({ wallet, statusResponse });
      } catch {
        return null;
      }
    })
    .filter((tx): tx is LifiTransactionHistoryItem => tx !== null);
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LifiTransactionHistoryResponse>> {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet || !utils.isAddress(wallet)) {
    return NextResponse.json(
      { message: 'wallet is not a valid address', data: null },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const integrator = getIntegratorId(request);
  createConfig({
    integrator,
    apiKey: process.env.LIFI_KEY,
  });

  const fromTimestamp = Math.floor((Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) / 1000);
  const response = await getTransactionHistory({
    wallet,
    status: 'ALL',
    fromTimestamp,
  });

  return NextResponse.json(
    {
      data: transformLifiHistoryTransactions({
        wallet,
        statusResponses: response.transfers ?? [],
      }),
    },
    { headers: NO_STORE_HEADERS },
  );
}
