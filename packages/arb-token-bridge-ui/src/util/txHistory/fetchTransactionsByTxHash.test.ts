import { ArbSys__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbSys__factory';
import { L2ArbitrumGateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L2ArbitrumGateway__factory';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types';
import { fetchLifiTransactionHistory } from '../../hooks/useLifiTransactionHistory';
import { fetchOftTransactionsByTxHash } from '../../hooks/useOftTransactionHistory';
import { MergedTransaction } from '../../state/app/state';
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../cctp/fetchCCTP';
import { fetchDeposits } from '../deposits/fetchDeposits';
import { EthWithdrawal } from '../withdrawals/helpers';
import { fetchTransactionsByTxHash, getWithdrawalsFromReceipt } from './fetchTransactionsByTxHash';

vi.mock('@/token-bridge-sdk/utils', () => ({
  getProviderForChainId: vi.fn(),
}));
vi.mock('../deposits/fetchDeposits', () => ({
  fetchDeposits: vi.fn(),
}));
vi.mock('../cctp/fetchCCTP', () => ({
  fetchCCTPDeposits: vi.fn(),
  fetchCCTPWithdrawals: vi.fn(),
}));
vi.mock('../../hooks/useLifiTransactionHistory', () => ({
  fetchLifiTransactionHistory: vi.fn(),
}));
vi.mock('../../hooks/useOftTransactionHistory', () => ({
  fetchOftTransactionsByTxHash: vi.fn(),
}));
vi.mock('../../state/cctpState', () => ({
  parseSWRResponse: (response: unknown) => response,
}));

const TX_HASH = '0x94e3f5f7ae10d9b98df828b7bfa3b7b1c7f0e2a1b4b28ee1cf2a4dbecdd6bbf1';
const SENDER = '0x1111111111111111111111111111111111111111';
const RECEIVER = '0x2222222222222222222222222222222222222222';
const L1_TOKEN = '0x3333333333333333333333333333333333333333';
const ARB_SYS_ADDRESS = '0x0000000000000000000000000000000000000064';
const GATEWAY_ADDRESS = '0x9E8f79EE5177aBDd76EDfC7D72c8Dc0F16955ae3';

const PARENT_CHAIN_ID = 42161;
const CHILD_CHAIN_ID = 41923;
const CHAIN_PAIRS = [{ parentChainId: PARENT_CHAIN_ID, childChainId: CHILD_CHAIN_ID }];
const PROBE_CHAIN_IDS = [PARENT_CHAIN_ID, CHILD_CHAIN_ID];

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

/** Providers keyed by chain id; chains without an entry return no receipt. */
function mockProviders(receipts: { [chainId: number]: TransactionReceipt | Error }) {
  vi.mocked(getProviderForChainId).mockImplementation(
    (chainId: number) =>
      ({
        getTransactionReceipt: async () => {
          const result = receipts[chainId];
          if (result instanceof Error) {
            throw result;
          }
          return result ?? null;
        },
      }) as never,
  );
}

function emptyApiMocks() {
  vi.mocked(fetchDeposits).mockResolvedValue([]);
  vi.mocked(fetchCCTPDeposits).mockResolvedValue({ pending: [], completed: [] });
  vi.mocked(fetchCCTPWithdrawals).mockResolvedValue({ pending: [], completed: [] });
  vi.mocked(fetchOftTransactionsByTxHash).mockResolvedValue([]);
  vi.mocked(fetchLifiTransactionHistory).mockResolvedValue([]);
}

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

  it('drops a WithdrawalInitiated event without a matching child-to-parent event', () => {
    const receipt = makeReceipt([
      makeWithdrawalInitiatedLog({ position: 7, amount: BigNumber.from(500) }),
      makeL2ToL1TxLog({ position: 8, callvalue: BigNumber.from(1_000_000) }),
    ]);

    const withdrawals = getWithdrawalsFromReceipt({
      receipt,
      parentChainId: PARENT_CHAIN_ID,
      childChainId: CHILD_CHAIN_ID,
    });

    // the phantom token withdrawal is dropped, the real ETH withdrawal stays
    expect(withdrawals).toHaveLength(1);
    expect('l1Token' in (withdrawals[0] ?? {})).toBe(false);
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

// sequential: these tests share module-level mocks, so the config's default
// concurrency would let them clobber each other
describe.sequential('fetchTransactionsByTxHash', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    emptyApiMocks();
  });

  it('resolves a withdrawal from the child chain receipt and skips the API lookups', async () => {
    mockProviders({
      [CHILD_CHAIN_ID]: makeReceipt([
        makeL2ToL1TxLog({ position: 8, callvalue: BigNumber.from(1_000_000) }),
      ]),
    });

    const transfers = await fetchTransactionsByTxHash({
      txHash: TX_HASH,
      chainPairs: CHAIN_PAIRS,
      probeChainIds: PROBE_CHAIN_IDS,
      isTestnetMode: false,
    });

    expect(transfers).toHaveLength(1);
    expect((transfers[0] as EthWithdrawal).direction).toBe('withdrawal');
    expect(fetchCCTPDeposits).not.toHaveBeenCalled();
    expect(fetchOftTransactionsByTxHash).not.toHaveBeenCalled();
    expect(fetchLifiTransactionHistory).not.toHaveBeenCalled();
  });

  it('resolves a deposit through the hash-filtered deposits query on the parent chain', async () => {
    const deposit = { txID: TX_HASH, direction: 'deposit' };
    mockProviders({ [PARENT_CHAIN_ID]: makeReceipt([]) });
    vi.mocked(fetchDeposits).mockResolvedValue([deposit as never]);

    const transfers = await fetchTransactionsByTxHash({
      txHash: TX_HASH,
      chainPairs: CHAIN_PAIRS,
      probeChainIds: PROBE_CHAIN_IDS,
      isTestnetMode: false,
    });

    expect(fetchDeposits).toHaveBeenCalledWith(
      expect.objectContaining({ sender: SENDER, searchString: TX_HASH }),
    );
    expect(transfers).toEqual([deposit]);
    expect(fetchCCTPDeposits).not.toHaveBeenCalled();
  });

  it('falls back to the API lookups and keeps only the searched hash', async () => {
    const matching = { txId: TX_HASH, isCctp: true } as MergedTransaction;
    const other = { txId: '0x' + 'b'.repeat(64), isCctp: true } as MergedTransaction;
    mockProviders({ [PARENT_CHAIN_ID]: makeReceipt([]) });
    vi.mocked(fetchCCTPDeposits).mockResolvedValue({
      pending: [matching],
      completed: [other],
    } as never);

    const transfers = await fetchTransactionsByTxHash({
      txHash: TX_HASH,
      chainPairs: CHAIN_PAIRS,
      probeChainIds: PROBE_CHAIN_IDS,
      isTestnetMode: false,
    });

    expect(transfers).toEqual([matching]);
  });

  it('returns an empty list when the hash is not found on any chain', async () => {
    mockProviders({});

    const transfers = await fetchTransactionsByTxHash({
      txHash: TX_HASH,
      chainPairs: CHAIN_PAIRS,
      probeChainIds: PROBE_CHAIN_IDS,
      isTestnetMode: false,
    });

    expect(transfers).toEqual([]);
  });

  it('throws when nothing is found and a chain could not be checked', async () => {
    mockProviders({ [CHILD_CHAIN_ID]: new Error('rate limited') });

    await expect(
      fetchTransactionsByTxHash({
        txHash: TX_HASH,
        chainPairs: CHAIN_PAIRS,
        probeChainIds: PROBE_CHAIN_IDS,
        isTestnetMode: false,
      }),
    ).rejects.toThrow('Some chains could not be checked');
  });

  it('tolerates a failed probe when the receipt was found elsewhere', async () => {
    mockProviders({
      [PARENT_CHAIN_ID]: new Error('rate limited'),
      [CHILD_CHAIN_ID]: makeReceipt([
        makeL2ToL1TxLog({ position: 8, callvalue: BigNumber.from(1_000_000) }),
      ]),
    });

    const transfers = await fetchTransactionsByTxHash({
      txHash: TX_HASH,
      chainPairs: CHAIN_PAIRS,
      probeChainIds: PROBE_CHAIN_IDS,
      isTestnetMode: false,
    });

    expect(transfers).toHaveLength(1);
  });
});
