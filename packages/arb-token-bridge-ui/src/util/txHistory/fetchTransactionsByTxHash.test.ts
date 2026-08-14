import { ArbSys__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbSys__factory';
import { L2ArbitrumGateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2ArbitrumGateway__factory';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { describe, expect, it } from 'vitest';

import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types';
import { EthWithdrawal } from '../withdrawals/helpers';
import { getWithdrawalsFromReceipt, isValidTxHash } from './fetchTransactionsByTxHash';

const TX_HASH = '0x94e3f5f7ae10d9b98df828b7bfa3b7b1c7f0e2a1b4b28ee1cf2a4dbecdd6bbf1';
const SENDER = '0x1111111111111111111111111111111111111111';
const RECEIVER = '0x2222222222222222222222222222222222222222';
const L1_TOKEN = '0x3333333333333333333333333333333333333333';
const ARB_SYS_ADDRESS = '0x0000000000000000000000000000000000000064';
const GATEWAY_ADDRESS = '0x9E8f79EE5177aBDd76EDfC7D72c8Dc0F16955ae3';

const PARENT_CHAIN_ID = 42161;
const CHILD_CHAIN_ID = 41923;

const arbSysInterface = ArbSys__factory.createInterface();
const gatewayInterface = L2ArbitrumGateway__factory.createInterface();

function makeLog({
  address,
  encoded,
}: {
  address: string;
  encoded: { data: string; topics: readonly string[] };
}): Log {
  return {
    address,
    data: encoded.data,
    topics: [...encoded.topics],
    blockNumber: 123,
    blockHash: '0x' + 'a'.repeat(64),
    transactionHash: TX_HASH,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  };
}

function makeL2ToL1TxLog({ position, callvalue }: { position: number; callvalue: BigNumber }) {
  return makeLog({
    address: ARB_SYS_ADDRESS,
    encoded: arbSysInterface.encodeEventLog(arbSysInterface.getEvent('L2ToL1Tx'), [
      SENDER, // caller
      RECEIVER, // destination
      BigNumber.from(position), // hash
      BigNumber.from(position), // position
      BigNumber.from(1000), // arbBlockNum
      BigNumber.from(2000), // ethBlockNum
      BigNumber.from(1_700_000_000), // timestamp
      callvalue,
      '0x', // data
    ]),
  });
}

function makeWithdrawalInitiatedLog({ position, amount }: { position: number; amount: BigNumber }) {
  return makeLog({
    address: GATEWAY_ADDRESS,
    encoded: gatewayInterface.encodeEventLog(gatewayInterface.getEvent('WithdrawalInitiated'), [
      L1_TOKEN,
      SENDER, // _from
      RECEIVER, // _to
      BigNumber.from(position), // _l2ToL1Id
      BigNumber.from(0), // _exitNum
      amount, // _amount
    ]),
  });
}

function makeReceipt(logs: Log[]): TransactionReceipt {
  return {
    to: GATEWAY_ADDRESS,
    from: SENDER,
    contractAddress: '',
    transactionIndex: 0,
    gasUsed: BigNumber.from(100_000),
    logsBloom: '0x',
    blockHash: '0x' + 'a'.repeat(64),
    transactionHash: TX_HASH,
    logs,
    blockNumber: 123,
    confirmations: 10,
    cumulativeGasUsed: BigNumber.from(100_000),
    effectiveGasPrice: BigNumber.from(100_000),
    byzantium: true,
    type: 2,
    status: 1,
  };
}

describe('isValidTxHash', () => {
  it('accepts a 32-byte hex hash', () => {
    expect(isValidTxHash(TX_HASH)).toBe(true);
    expect(isValidTxHash(TX_HASH.toUpperCase().replace('0X', '0x'))).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isValidTxHash(undefined)).toBe(false);
    expect(isValidTxHash('')).toBe(false);
    expect(isValidTxHash('0x123')).toBe(false);
    expect(isValidTxHash(TX_HASH.slice(2))).toBe(false); // missing 0x
    expect(isValidTxHash(`${TX_HASH}ff`)).toBe(false); // too long
    expect(isValidTxHash('0x' + 'g'.repeat(64))).toBe(false); // non-hex
    expect(isValidTxHash('0x1111111111111111111111111111111111111111')).toBe(false); // address
  });
});

describe('getWithdrawalsFromReceipt', () => {
  it('builds a token withdrawal from WithdrawalInitiated and its matching child-to-parent event', () => {
    const receipt = makeReceipt([
      makeWithdrawalInitiatedLog({ position: 7, amount: BigNumber.from(500) }),
      makeL2ToL1TxLog({ position: 7, callvalue: BigNumber.from(0) }),
    ]);

    const withdrawals = getWithdrawalsFromReceipt({
      receipt,
      parentChainId: PARENT_CHAIN_ID,
      childChainId: CHILD_CHAIN_ID,
    });

    expect(withdrawals).toHaveLength(1);
    const tokenWithdrawal = withdrawals[0] as WithdrawalInitiated;
    expect(tokenWithdrawal.l1Token).toBe(L1_TOKEN);
    expect(tokenWithdrawal._from).toBe(SENDER);
    expect(tokenWithdrawal._to).toBe(RECEIVER);
    expect(tokenWithdrawal._l2ToL1Id.toNumber()).toBe(7);
    expect(tokenWithdrawal._amount.toNumber()).toBe(500);
    expect(tokenWithdrawal.txHash).toBe(TX_HASH);
    expect(tokenWithdrawal.timestamp?.toNumber()).toBe(1_700_000_000);
    expect(tokenWithdrawal.direction).toBe('withdrawal');
    expect(tokenWithdrawal.source).toBe('event_logs');
    expect(tokenWithdrawal.parentChainId).toBe(PARENT_CHAIN_ID);
    expect(tokenWithdrawal.childChainId).toBe(CHILD_CHAIN_ID);
  });

  it('builds an ETH withdrawal from a child-to-parent event without a token event', () => {
    const receipt = makeReceipt([
      makeL2ToL1TxLog({ position: 8, callvalue: BigNumber.from(1_000_000) }),
    ]);

    const withdrawals = getWithdrawalsFromReceipt({
      receipt,
      parentChainId: PARENT_CHAIN_ID,
      childChainId: CHILD_CHAIN_ID,
    });

    expect(withdrawals).toHaveLength(1);
    const ethWithdrawal = withdrawals[0] as EthWithdrawal;
    expect(ethWithdrawal.transactionHash).toBe(TX_HASH);
    expect(ethWithdrawal.callvalue.toNumber()).toBe(1_000_000);
    expect(ethWithdrawal.direction).toBe('withdrawal');
    expect(ethWithdrawal.source).toBe('event_logs');
    expect(ethWithdrawal.parentChainId).toBe(PARENT_CHAIN_ID);
    expect(ethWithdrawal.childChainId).toBe(CHILD_CHAIN_ID);
  });

  it('does not duplicate a token withdrawal as an ETH withdrawal', () => {
    const receipt = makeReceipt([
      makeWithdrawalInitiatedLog({ position: 7, amount: BigNumber.from(500) }),
      makeL2ToL1TxLog({ position: 7, callvalue: BigNumber.from(0) }),
      makeL2ToL1TxLog({ position: 8, callvalue: BigNumber.from(1_000_000) }),
    ]);

    const withdrawals = getWithdrawalsFromReceipt({
      receipt,
      parentChainId: PARENT_CHAIN_ID,
      childChainId: CHILD_CHAIN_ID,
    });

    expect(withdrawals).toHaveLength(2);
    const tokenWithdrawals = withdrawals.filter((tx) => 'l1Token' in tx);
    const ethWithdrawals = withdrawals.filter((tx) => !('l1Token' in tx)) as EthWithdrawal[];
    expect(tokenWithdrawals).toHaveLength(1);
    expect(ethWithdrawals).toHaveLength(1);
    expect(
      ethWithdrawals[0] && 'position' in ethWithdrawals[0]
        ? ethWithdrawals[0].position.toNumber()
        : undefined,
    ).toBe(8);
  });

  it('returns an empty list for a receipt without bridge events', () => {
    const receipt = makeReceipt([]);

    const withdrawals = getWithdrawalsFromReceipt({
      receipt,
      parentChainId: PARENT_CHAIN_ID,
      childChainId: CHILD_CHAIN_ID,
    });

    expect(withdrawals).toHaveLength(0);
  });
});
