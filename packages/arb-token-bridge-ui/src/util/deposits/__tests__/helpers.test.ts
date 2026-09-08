import {
  EthDepositMessage,
  EthDepositMessageStatus,
  ParentToChildMessageReader,
  ParentToChildMessageReaderClassic,
  ParentToChildMessageStatus,
} from '@arbitrum/sdk';
import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../../hooks/arbTokenBridge.types';
import { DepositStatus } from '../../../state/app/state';
import { getDepositStatus } from '../../../state/app/utils';
import { getProviderForChainId } from '../../../token-bridge-sdk/utils';
import { ChainId } from '../../../types/ChainId';
import { Transaction } from '../../../types/Transactions';
import { updateAdditionalDepositData } from '../helpers';

// `updateAdditionalDepositData` wraps the parent tx receipt in the SDK's `ParentTransactionReceipt`
// to look up the message. The wrapper is replaced by a factory keyed on the receipt's tx hash, so
// each test gets its own message reader even though the suite runs concurrently.
const createParentTxReceipt = vi.hoisted(() => vi.fn());

vi.mock('@arbitrum/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arbitrum/sdk')>();

  class ParentTransactionReceipt {
    constructor(receipt: TransactionReceipt) {
      return createParentTxReceipt(receipt);
    }
  }

  return { ...actual, ParentTransactionReceipt };
});

vi.mock('../../../token-bridge-sdk/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../token-bridge-sdk/utils')>();

  return { ...actual, getProviderForChainId: vi.fn() };
});

const SENDER = '0xee7300250a9745c2bA636254a486334bb8120d0a';
const OTHER_ADDRESS = '0x370A7E2d300c14D79d4A7ee07aACA46c4B3012cF';
const CHILD_TX_HASH = '0x3c9a1f7e5b2d8c4a6e0f2b4d6a8c0e2f4a6b8d0c2e4f6a8b0d2c4e6f8a0b2d4c';
const RETRYABLE_CREATION_ID = '0x7534111b0bc2dd4d04a9d1d29236b7bb81830b8d21e3e826b13114304492e5c1';

const NATIVE_TOKEN_DEPOSIT_TX_ID =
  '0x8b6eb5b1d0f9b06b1d0e3a5e0a1cf0ef1e3d5e1b7c8a9f0d2e4b6a8c0e2f4a6b';
const RETRYABLE_TX_ID = '0x21f72d0003dea33e0cce1d2655d680e72dbcddc3e34baea4645363318f91dbd8';
const CLASSIC_NATIVE_TOKEN_TX_ID =
  '0xea5d4882507685e1adea9793cb1139f42d0cc37875baa867e3412325dbbaa34a';
const CLASSIC_TOKEN_TX_ID = '0x86b6bdf5d840f5f8212f7b521c902d1b88795383ee86a474c305983c8d931e37';

const parentProvider = {
  getTransactionReceipt: async (transactionHash: string) => ({ transactionHash }),
};

const childProvider = {
  getTransaction: async () => ({ blockNumber: 100 }),
  getBlock: async () => ({ timestamp: 1_787_341_999 }),
};

vi.mocked(getProviderForChainId).mockImplementation(
  (chainId) => (chainId === ChainId.Ethereum ? parentProvider : childProvider) as never,
);

// Small enough that `isPotentialBatchTransfer` rules the retryable out, so no extra lookups run.
const retryableMessageData = {
  callValueRefundAddress: SENDER,
  maxSubmissionFee: BigNumber.from(100_000_000_000_000),
  gasLimit: BigNumber.from(100_000),
  maxFeePerGas: BigNumber.from(100_000_000),
};

createParentTxReceipt.mockImplementation((receipt: TransactionReceipt) => {
  const nitroEthDepositMessage = {
    childTxHash: CHILD_TX_HASH,
    status: async () => EthDepositMessageStatus.DEPOSITED,
  } as unknown as EthDepositMessage;

  const nitroRetryable = {
    retryableCreationId: RETRYABLE_CREATION_ID,
    messageData: retryableMessageData,
    getSuccessfulRedeem: async () => ({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
    }),
  } as unknown as ParentToChildMessageReader;

  const classicRetryable = {
    retryableCreationId: RETRYABLE_CREATION_ID,
    childTxHash: CHILD_TX_HASH,
    status: async () => ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
  } as unknown as ParentToChildMessageReaderClassic;

  return {
    isClassic: async () =>
      receipt.transactionHash === CLASSIC_NATIVE_TOKEN_TX_ID ||
      receipt.transactionHash === CLASSIC_TOKEN_TX_ID,
    getParentToChildMessages: async () =>
      receipt.transactionHash === RETRYABLE_TX_ID ? [nitroRetryable] : [],
    getEthDeposits: async () => [nitroEthDepositMessage],
    getParentToChildMessagesClassic: async () => [classicRetryable],
  };
});

function createDeposit({
  txID,
  assetType = AssetType.ETH,
  destination = SENDER,
  isClassic,
}: {
  txID: string;
  assetType?: AssetType;
  destination?: string;
  isClassic?: boolean;
}): Transaction {
  return {
    type: 'deposit',
    status: 'pending',
    direction: 'deposit',
    source: 'subgraph',
    txID,
    sender: SENDER,
    destination,
    value: '0.611126206084167590',
    assetName: assetType === AssetType.ETH ? 'ETH' : 'USDC',
    assetType,
    tokenAddress:
      assetType === AssetType.ETH ? undefined : '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    l1NetworkID: String(ChainId.Ethereum),
    l2NetworkID: String(ChainId.ArbitrumOne),
    parentChainId: ChainId.Ethereum,
    childChainId: ChainId.ArbitrumOne,
    timestampCreated: '1787341919',
    isClassic,
  };
}

describe('updateAdditionalDepositData', () => {
  it('marks a nitro native token deposit message and reports success', async () => {
    const result = await updateAdditionalDepositData(
      createDeposit({ txID: NATIVE_TOKEN_DEPOSIT_TX_ID }),
    );

    expect(result.parentToChildMsgData).toMatchObject({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      retryableCreationTxID: CHILD_TX_HASH,
      childTxId: CHILD_TX_HASH,
      isNativeTokenDepositMessage: true,
    });
    expect(getDepositStatus(result)).toBe(DepositStatus.L2_SUCCESS);
  });

  it('records the refund address of an unredeemed native token retryable and reports failure', async () => {
    const result = await updateAdditionalDepositData(createDeposit({ txID: RETRYABLE_TX_ID }));

    expect(result.parentToChildMsgData).toMatchObject({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      retryableCreationTxID: RETRYABLE_CREATION_ID,
      callValueRefundAddress: SENDER,
    });
    expect(result.parentToChildMsgData?.isNativeTokenDepositMessage).toBeUndefined();
    expect(getDepositStatus(result)).toBe(DepositStatus.L2_FAILURE);
  });

  it('marks a classic native token deposit regardless of its destination and reports success', async () => {
    const result = await updateAdditionalDepositData(
      createDeposit({
        txID: CLASSIC_NATIVE_TOKEN_TX_ID,
        destination: OTHER_ADDRESS,
        isClassic: true,
      }),
    );

    expect(result.parentToChildMsgData).toMatchObject({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      childTxId: RETRYABLE_CREATION_ID,
      isNativeTokenDepositMessage: true,
    });
    expect(getDepositStatus(result)).toBe(DepositStatus.L2_SUCCESS);
  });

  it('does not mark a classic token deposit as a native token deposit', async () => {
    const result = await updateAdditionalDepositData(
      createDeposit({ txID: CLASSIC_TOKEN_TX_ID, assetType: AssetType.ERC20, isClassic: true }),
    );

    expect(result.parentToChildMsgData).toMatchObject({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      isNativeTokenDepositMessage: false,
    });
    expect(result.parentToChildMsgData?.childTxId).toBeUndefined();
  });
});
