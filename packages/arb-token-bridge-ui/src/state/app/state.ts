import { RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';

import type { AmountWithToken, RouteTool } from '../../app/api/crosschain-transfers/types';
import {
  ArbTokenBridge,
  AssetType,
  NodeBlockDeadlineStatus,
} from '../../hooks/arbTokenBridge.types';
import {
  ChildToParentMessageData,
  ParentToChildMessageData,
  TxnType,
} from '../../types/Transactions';
import { Address } from '../../util/AddressUtils';
import { CCTPSupportedChainId } from '../cctpState';

export enum DepositStatus {
  L1_PENDING = 1,
  L1_FAILURE = 2,
  L2_PENDING = 3,
  L2_SUCCESS = 4,
  L2_FAILURE = 5,
  CREATION_FAILED = 6,
  EXPIRED = 7,
  CCTP_DEFAULT_STATE = 8, // Cctp only relies on tx.status
  LIFI_DEFAULT_STATE = 9,
}

export enum WithdrawalStatus {
  EXECUTED = 'Executed',
  UNCONFIRMED = 'Unconfirmed',
  CONFIRMED = 'Confirmed',
  EXPIRED = 'Expired',
  FAILURE = 'Failure',
  REFUNDED = 'Refunded', // Lifi only
}

type LifiRouteStepExecution = NonNullable<RouteExtended['steps'][number]['execution']>;
export type LifiRouteHistoryStep = {
  id: string;
  fromChainId: number;
  display: {
    toolDetails: RouteTool;
    toAmount: AmountWithToken;
  };
  execution?: {
    status: LifiRouteStepExecution['status'];
    process: Array<
      Pick<LifiRouteStepExecution['process'][number], 'type' | 'status' | 'txHash' | 'txLink'>
    >;
  };
};

type MergedTransactionLifiData = {
  toolsDetails?: RouteTool[];
  durationMs?: number;
  fromAmount?: AmountWithToken;
  toAmount?: AmountWithToken;
  destinationTxId: string | null;
  lifiExplorerLink?: string;
  lifiRoute?: RouteExtended;
  lifiRouteSteps?: LifiRouteHistoryStep[];
};
export interface BaseMergedTransaction {
  // TODO: https://github.com/OffchainLabs/arbitrum-token-bridge/blob/master/packages/arb-token-bridge-ui/src/util/withdrawals/helpers.ts#L31
  // should return sender as well, then we can make it non-optional
  sender?: string;
  destination?: string;
  direction: TxnType;
  status: string | undefined; // TODO: Use enums
  createdAt: number | null;
  resolvedAt: number | null;
  txId: string;
  asset: string;
  assetType: AssetType;
  value: string | null;
  value2?: string;
  uniqueId: BigNumber | null;
  isWithdrawal: boolean;
  blockNum: number | null;
  tokenAddress: string | null;
  isCctp?: boolean;
  isOft?: false;
  isLifi?: false;
  nodeBlockDeadline?: NodeBlockDeadlineStatus;
  parentToChildMsgData?: ParentToChildMessageData;
  childToParentMsgData?: ChildToParentMessageData;
  depositStatus?: DepositStatus;
  childChainId: number;
  parentChainId: number;
  sourceChainId: number;
  destinationChainId: number;
  cctpData?: {
    sourceChainId?: CCTPSupportedChainId;
    attestationHash?: Address | null;
    messageBytes?: string | null;
    receiveMessageTransactionHash?: Address | null;
    receiveMessageTimestamp?: number | null;
  };
}

export interface LifiMergedTransaction
  extends Omit<BaseMergedTransaction, 'isLifi'>,
    MergedTransactionLifiData {
  isLifi: true;
  destinationStatus: WithdrawalStatus;
}

/*
 * LayerZero API returns LayerZeroTransaction` without `asset` and `value`.
 * `updateAdditionalLayerZeroData()` fills these gaps, returning `MergedTransaction` for tx history.
 */
export interface LayerZeroTransaction extends Omit<BaseMergedTransaction, 'isOft'> {
  isOft: true;
  destinationTxHash?: string | null;
}

export type MergedTransaction =
  | BaseMergedTransaction
  | LifiMergedTransaction
  | LayerZeroTransaction;

export interface WarningTokens {
  [address: string]: {
    address: string;
    type: number;
  };
}

export type AppState = {
  arbTokenBridge: ArbTokenBridge;
  warningTokens: WarningTokens;
  l1NetworkChainId: number | null;
  l2NetworkChainId: number | null;
  arbTokenBridgeLoaded: boolean;
};

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  warningTokens: {} as WarningTokens,
  l1NetworkChainId: null,
  l2NetworkChainId: null,
  arbTokenBridgeLoaded: false,
};
