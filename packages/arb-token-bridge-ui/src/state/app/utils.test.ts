import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import { describe, expect, it } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import { ParentToChildMessageData } from '../../types/Transactions';
import { BaseMergedTransaction, DepositStatus } from './state';
import { getDepositStatus } from './utils';

const SENDER = '0xee7300250a9745c2bA636254a486334bb8120d0a';
const OTHER_ADDRESS = '0x370A7E2d300c14D79d4A7ee07aACA46c4B3012cF';

function createDeposit({
  assetType = AssetType.ETH,
  destination = SENDER,
  parentToChildMsgData,
}: {
  assetType?: AssetType;
  destination?: string;
  parentToChildMsgData?: ParentToChildMessageData;
}): BaseMergedTransaction {
  return {
    sender: SENDER,
    destination,
    direction: 'deposit-l1',
    status: 'success',
    createdAt: 1_787_341_919_000,
    resolvedAt: null,
    txId: '0x21f72d0003dea33e0cce1d2655d680e72dbcddc3e34baea4645363318f91dbd8',
    asset: 'ETH',
    assetType,
    value: '0.611126206084167590',
    uniqueId: null,
    isWithdrawal: false,
    blockNum: 25_805_722,
    tokenAddress: null,
    parentToChildMsgData,
    parentChainId: ChainId.Ethereum,
    childChainId: ChainId.ArbitrumOne,
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.ArbitrumOne,
  };
}

function createMsgData(
  status: ParentToChildMessageStatus,
  isNativeTokenDepositMessage?: boolean,
): ParentToChildMessageData {
  return {
    status,
    retryableCreationTxID: '0x7534111b0bc2dd4d04a9d1d29236b7bb81830b8d21e3e826b13114304492e5c1',
    fetchingUpdate: false,
    isNativeTokenDepositMessage,
  };
}

describe('getDepositStatus', () => {
  it('reports a native token deposit message as successful once the funds are deposited', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(
        ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
        true,
      ),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_SUCCESS);
  });

  // This is the common case, not an exotic one: every native token deposit from this UI goes
  // through `ethBridger.depositTo`, which submits a retryable ticket with `to` set to the
  // destination, the sender's own address by default. Any such deposit whose auto-redeem fails
  // leaves the funds in escrow, so it must stay redeemable even though sender and destination
  // match. The incident that surfaced it happened to come from a router.
  it('reports an unredeemed native token retryable back to the sender as failed', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_FAILURE);
  });

  it('reports an expired native token retryable back to the sender as expired', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.EXPIRED),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.EXPIRED);
  });

  it('reports an expired native token deposit message as successful', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.EXPIRED, true),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_SUCCESS);
  });

  it('reports an unredeemed native token retryable to a custom destination as failed', () => {
    const tx = createDeposit({
      destination: OTHER_ADDRESS,
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_FAILURE);
  });

  it('reports an unredeemed token retryable as failed', () => {
    const tx = createDeposit({
      assetType: AssetType.ERC20,
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_FAILURE);
  });

  it('reports a redeemed retryable as successful', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.REDEEMED),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_SUCCESS);
  });

  it('reports a ticket that is not created yet as pending on the child chain', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.NOT_YET_CREATED),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.L2_PENDING);
  });

  it('reports a failed ticket creation', () => {
    const tx = createDeposit({
      parentToChildMsgData: createMsgData(ParentToChildMessageStatus.CREATION_FAILED),
    });

    expect(getDepositStatus(tx)).toBe(DepositStatus.CREATION_FAILED);
  });

  it('reports a pending parent chain transaction before any message data exists', () => {
    const tx = { ...createDeposit({}), status: 'pending' };

    expect(getDepositStatus(tx)).toBe(DepositStatus.L1_PENDING);
  });

  it('reports a pending child chain transaction when message data is missing', () => {
    expect(getDepositStatus(createDeposit({}))).toBe(DepositStatus.L2_PENDING);
  });
});
