import {
  EthDepositMessage,
  EthDepositMessageStatus,
  ParentToChildMessageReader,
  ParentToChildMessageReaderClassic,
  ParentToChildMessageStatus,
  ParentTransactionReceipt,
} from '@arbitrum/sdk';
import { Provider, TransactionReceipt } from '@ethersproject/providers';
import { utils } from 'ethers';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { normalizeTimestamp } from '../../state/app/utils';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { Transaction, TxnStatus } from '../../types/Transactions';
import { fetchErc20Data } from '../TokenUtils';

export function isEthDepositMessage(
  message: EthDepositMessage | ParentToChildMessageReader | ParentToChildMessageReaderClassic,
): message is EthDepositMessage {
  return !('retryableCreationId' in message);
}

export const updateAdditionalDepositData = async (depositTx: Transaction): Promise<Transaction> => {
  const parentProvider = getProviderForChainId(depositTx.parentChainId);
  const childProvider = getProviderForChainId(depositTx.childChainId);

  // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
  // 2. on the basis of those, finally calculate the status of the transaction

  // fetch timestamp creation date
  let timestampCreated = new Date().toISOString();
  if (depositTx.timestampCreated) {
    // if timestamp is already there in Subgraphs, take it from there
    timestampCreated = String(normalizeTimestamp(depositTx.timestampCreated));
  } else if (depositTx.blockNumber) {
    // if timestamp not in subgraph, fallback to onchain data
    timestampCreated = String(
      normalizeTimestamp((await parentProvider.getBlock(depositTx.blockNumber)).timestamp),
    );
  }

  // there are scenarios where we will return the deposit tx early
  // we need to make sure it has the updated timestamp no matter what
  depositTx.timestampCreated = timestampCreated;

  const { isClassic } = depositTx; // isClassic is known before-hand from subgraphs

  const { parentToChildMsg } = await getParentToChildMessageDataFromParentTxHash({
    depositTxId: depositTx.txID,
    parentProvider,
    childProvider,
    isClassic,
  });

  if (!parentToChildMsg) {
    return depositTx;
  }

  if (isClassic) {
    return updateClassicDepositStatusData({
      depositTx,
      parentToChildMsg: parentToChildMsg as ParentToChildMessageReaderClassic,
      timestampCreated,
      childProvider,
    });
  }

  if (isEthDepositMessage(parentToChildMsg)) {
    return updateETHDepositStatusData({
      depositTx,
      ethDepositMessage: parentToChildMsg,
      childProvider,
      timestampCreated,
    });
  }

  // ERC-20 deposit or ETH to a custom address
  const tokenDeposit = await updateTokenDepositStatusData({
    depositTx,
    parentToChildMsg: parentToChildMsg as ParentToChildMessageReader,
    timestampCreated,
    parentProvider,
    childProvider,
  });

  // check local storage first, fallback to fetching on chain
  if (depositTx.value2) {
    return { ...tokenDeposit, value2: depositTx.value2 };
  }

  const { value2 } = await getBatchTransferDepositData({
    l1ToL2Msg: parentToChildMsg as ParentToChildMessageReader | undefined,
    depositStatus: tokenDeposit.status,
  });

  return {
    ...tokenDeposit,
    value2,
  };
};

const getBatchTransferDepositData = async ({
  l1ToL2Msg,
  depositStatus,
}: {
  l1ToL2Msg: ParentToChildMessageReader | undefined;
  depositStatus: TxnStatus | undefined;
}): Promise<{
  value2: Transaction['value2'];
}> => {
  if (!l1ToL2Msg) {
    return { value2: undefined };
  }

  if (!isPotentialBatchTransfer({ l1ToL2Msg })) {
    return { value2: undefined };
  }

  // get maxSubmissionCost, which is the amount of ETH sent in batched ERC-20 deposit + max gas cost
  const maxSubmissionCost = Number(
    utils.formatEther(l1ToL2Msg.messageData.maxSubmissionFee.toString()),
  );

  // we deduct gas cost from max submission fee, which leaves us with amount2 (extra ETH sent with ERC-20)
  if (depositStatus === 'success') {
    // if success, we use the actual gas cost
    const retryableFee = await getRetryableFee({
      l1ToL2Msg,
    });

    if (!retryableFee) {
      return { value2: undefined };
    }

    return { value2: String(Number(maxSubmissionCost) - Number(retryableFee)) };
  }

  // when not success, we don't know the final gas cost yet so we use estimates
  const estimatedRetryableFee = utils.formatEther(
    l1ToL2Msg.messageData.gasLimit.mul(l1ToL2Msg.messageData.maxFeePerGas),
  );

  return {
    value2: String(Number(maxSubmissionCost) - Number(estimatedRetryableFee)),
  };
};

const isPotentialBatchTransfer = ({ l1ToL2Msg }: { l1ToL2Msg: ParentToChildMessageReader }) => {
  const { maxSubmissionFee, gasLimit, maxFeePerGas } = l1ToL2Msg.messageData;

  const estimatedGas = gasLimit.mul(maxFeePerGas);

  const maxSubmissionFeeNumber = Number(utils.formatEther(maxSubmissionFee));
  const estimatedGasNumber = Number(utils.formatEther(estimatedGas));

  const excessGasFee = maxSubmissionFeeNumber - estimatedGasNumber;
  const percentageGasUsed = (estimatedGasNumber / maxSubmissionFeeNumber) * 100;

  // heuristic for determining if it's a batch transfer (based on maxSubmissionFee)
  return excessGasFee >= 0.001 && percentageGasUsed < 10;
};

const getRetryableFee = async ({ l1ToL2Msg }: { l1ToL2Msg: ParentToChildMessageReader }) => {
  const autoRedeemReceipt = (
    (await l1ToL2Msg.getSuccessfulRedeem()) as {
      status: ParentToChildMessageStatus.REDEEMED;
      childTxReceipt: TransactionReceipt;
    }
  ).childTxReceipt;

  if (!autoRedeemReceipt) {
    return undefined;
  }

  const autoRedeemGas = autoRedeemReceipt.gasUsed.mul(autoRedeemReceipt.effectiveGasPrice);

  const retryableCreationReceipt = await l1ToL2Msg.getRetryableCreationReceipt();

  if (!retryableCreationReceipt) {
    return undefined;
  }

  const retryableCreationGas = retryableCreationReceipt.gasUsed.mul(
    retryableCreationReceipt.effectiveGasPrice,
  );

  const gasUsed = autoRedeemGas.add(retryableCreationGas);

  return utils.formatEther(gasUsed);
};

const updateETHDepositStatusData = async ({
  depositTx,
  ethDepositMessage,
  childProvider,
  timestampCreated,
}: {
  depositTx: Transaction;
  ethDepositMessage: EthDepositMessage;
  timestampCreated: string;
  childProvider: Provider;
}): Promise<Transaction> => {
  // from the eth-deposit-message, extract more things like retryableCreationTxID, status, etc

  if (!ethDepositMessage) return depositTx;

  const status = await ethDepositMessage.status();
  const isDeposited = status === EthDepositMessageStatus.DEPOSITED;

  const retryableCreationTxID = ethDepositMessage.childTxHash;

  const childBlockNum = isDeposited
    ? (await childProvider.getTransaction(retryableCreationTxID)).blockNumber
    : null;

  const timestampResolved = childBlockNum
    ? normalizeTimestamp((await childProvider.getBlock(childBlockNum)).timestamp)
    : null;

  // return the data to populate on UI
  const updatedDepositTx: Transaction = {
    ...depositTx,
    status: retryableCreationTxID ? 'success' : 'pending',
    timestampCreated,
    timestampResolved: timestampResolved ? String(timestampResolved) : undefined,
    parentToChildMsgData: {
      status: isDeposited
        ? ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD
        : ParentToChildMessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `childTxId` after the deposit is confirmed
      childTxId: isDeposited ? ethDepositMessage.childTxHash : undefined,
      fetchingUpdate: false,
    },
  };

  return updatedDepositTx;
};

const updateTokenDepositStatusData = async ({
  depositTx,
  parentToChildMsg,
  timestampCreated,
  parentProvider,
  childProvider,
}: {
  depositTx: Transaction;
  timestampCreated: string;
  parentProvider: Provider;
  childProvider: Provider;
  parentToChildMsg: ParentToChildMessageReader;
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated,
  };

  // fallback to on-chain token information if subgraph doesn't have it
  const { tokenAddress, assetName } = updatedDepositTx;
  if (!assetName && tokenAddress) {
    const { symbol } = await fetchErc20Data({
      address: tokenAddress,
      provider: parentProvider,
    });
    updatedDepositTx.assetName = symbol;
  }

  if (!parentToChildMsg) return updatedDepositTx;

  // get the status data of `parentToChildMsg`, if it is redeemed - `getSuccessfulRedeem` also returns its l2TxReceipt
  const res = await parentToChildMsg.getSuccessfulRedeem();

  const childTxId =
    res.status === ParentToChildMessageStatus.REDEEMED
      ? res.childTxReceipt.transactionHash
      : undefined;

  const parentToChildMsgData = {
    status: res.status,
    childTxId,
    fetchingUpdate: false,
    retryableCreationTxID: parentToChildMsg.retryableCreationId,
  };

  const isDeposited = parentToChildMsgData.status === ParentToChildMessageStatus.REDEEMED;

  const childBlockNum = isDeposited
    ? (await childProvider.getTransaction(parentToChildMsg.retryableCreationId)).blockNumber
    : null;

  const timestampResolved = childBlockNum
    ? normalizeTimestamp((await childProvider.getBlock(childBlockNum)).timestamp)
    : null;

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: parentToChildMsg.retryableCreationId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved ? String(timestampResolved) : undefined,
    parentToChildMsgData,
  };

  return completeDepositTx;
};

const updateClassicDepositStatusData = async ({
  depositTx,
  parentToChildMsg,
  timestampCreated,
  childProvider,
}: {
  depositTx: Transaction;
  timestampCreated: string;
  childProvider: Provider;
  parentToChildMsg: ParentToChildMessageReaderClassic;
}): Promise<Transaction> => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated,
  };

  const status = await parentToChildMsg.status();

  const isCompletedEthDeposit =
    depositTx.assetType === AssetType.ETH &&
    status >= ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD;

  const childTxId = (() => {
    if (isCompletedEthDeposit) {
      return parentToChildMsg.retryableCreationId;
    }

    if (status === ParentToChildMessageStatus.REDEEMED) {
      return parentToChildMsg.childTxHash;
    }

    return undefined;
  })();

  const parentToChildMsgData = {
    status,
    childTxId,
    fetchingUpdate: false,
    retryableCreationTxID: parentToChildMsg.retryableCreationId,
  };

  const l2BlockNum = childTxId ? (await childProvider.getTransaction(childTxId)).blockNumber : null;

  const timestampResolved = l2BlockNum
    ? normalizeTimestamp((await childProvider.getBlock(l2BlockNum)).timestamp)
    : null;

  const completeDepositTx: Transaction = {
    ...updatedDepositTx,
    status: childTxId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved: timestampResolved ? String(timestampResolved) : undefined,
    parentToChildMsgData,
  };

  return completeDepositTx;
};

export const getParentToChildMessageDataFromParentTxHash = async ({
  depositTxId,
  parentProvider,
  childProvider,
  isClassic, // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string;
  parentProvider: Provider;
  childProvider: Provider;
  isClassic?: boolean;
}): Promise<{
  isClassic?: boolean;
  parentToChildMsg?:
    | ParentToChildMessageReaderClassic
    | EthDepositMessage
    | ParentToChildMessageReader;
}> => {
  // fetch Parent transaction receipt
  const depositTxReceipt = await parentProvider.getTransactionReceipt(depositTxId);

  // TODO: Handle tx not found
  if (!depositTxReceipt) {
    return {};
  }

  const parentTxReceipt = new ParentTransactionReceipt(depositTxReceipt);

  const getClassicDepositMessage = async () => {
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessagesClassic(childProvider);
    return {
      isClassic: true,
      parentToChildMsg,
    };
  };

  const getNitroDepositMessage = async () => {
    // deposits via retryables
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessages(childProvider);

    if (parentToChildMsg) {
      return {
        isClassic: false,
        parentToChildMsg,
      };
    }

    // nitro eth deposit (to the same address)
    const [ethDepositMessage] = await parentTxReceipt.getEthDeposits(childProvider);

    return {
      isClassic: false,
      parentToChildMsg: ethDepositMessage,
    };
  };

  const safeIsClassic = isClassic ?? (await parentTxReceipt.isClassic(childProvider)); // if it is unknown whether the transaction isClassic or not, fetch the result

  if (safeIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    return getClassicDepositMessage();
  }

  // post-nitro deposit - both eth + token
  return getNitroDepositMessage();
};
