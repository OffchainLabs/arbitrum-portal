import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import { ArbRetryableTx__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbRetryableTx__factory';
import type { Provider } from '@ethersproject/abstract-provider';
import { constants } from 'ethers';
import { beforeAll, describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { initializeBridgeNetworks } from '@/bridge/util/networks';

import {
  INDETERMINATE,
  countEthDepositsForInbox,
  findManualRedeem,
  getRedeemableChain,
  getRedeemableChainIds,
  getRetryableStatusDisplay,
  isValidTxHash,
  lookupRetryables,
} from '../retryableLookup';

const ARBITRUM_ONE_INBOX = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';
const ARBITRUM_ONE = {
  chainId: ChainId.ArbitrumOne,
  parentChainId: ChainId.Ethereum,
  inbox: ARBITRUM_ONE_INBOX,
};
// first Arbitrum One block produced by Nitro, per ARB1_NITRO_GENESIS_L1_BLOCK in @arbitrum/sdk
const ARB1_NITRO_GENESIS_L1_BLOCK = 15447158;

function createProvider({ chainId }: { chainId: number }) {
  return {
    getNetwork: async () => ({ chainId }),
  } as unknown as Provider;
}

function createParentProvider({ receipt }: { receipt: unknown }) {
  return {
    getNetwork: async () => ({ chainId: ChainId.Ethereum }),
    getTransactionReceipt: async () => receipt,
  } as unknown as Provider;
}

function createReceipt({ blockNumber }: { blockNumber: number }) {
  return {
    to: '0x0000000000000000000000000000000000000001',
    from: '0x0000000000000000000000000000000000000002',
    contractAddress: '',
    transactionIndex: 0,
    gasUsed: 0,
    logsBloom: '0x',
    blockHash: '0x',
    transactionHash: '0x'.padEnd(66, 'a'),
    logs: [],
    blockNumber,
    confirmations: 1,
    cumulativeGasUsed: 0,
    effectiveGasPrice: 0,
    byzantium: true,
    type: 2,
    status: 1,
  };
}

const TICKET_ID = '0x'.padEnd(66, 'b');
const RETRY_TX_HASH = '0x'.padEnd(66, 'c');

function createRedeemScheduledLog() {
  const contractInterface = ArbRetryableTx__factory.createInterface();
  const { data, topics } = contractInterface.encodeEventLog(
    contractInterface.getEvent('RedeemScheduled'),
    [TICKET_ID, RETRY_TX_HASH, 1, 0, constants.AddressZero, 0, 0],
  );

  return { data, topics, blockNumber: 10, transactionHash: RETRY_TX_HASH, logIndex: 0 };
}

function createRedeemProvider({ retryStatus }: { retryStatus: number }) {
  return {
    _isProvider: true,
    getNetwork: async () => ({ chainId: ChainId.ArbitrumOne }),
    getBlockNumber: async () => 100,
    getLogs: async () => [createRedeemScheduledLog()],
    getTransactionReceipt: async () => ({ status: retryStatus }),
  } as unknown as Provider;
}

beforeAll(() => {
  initializeBridgeNetworks();
});

describe('isValidTxHash', () => {
  it('accepts a 32 byte hash', () => {
    expect(isValidTxHash(`0x${'a'.repeat(64)}`)).toBe(true);
  });

  // viem's `isHash` sizes with Math.ceil, so it passes this and the rpc rejects it instead
  it('rejects a hash with a single character missing', () => {
    expect(isValidTxHash(`0x${'a'.repeat(63)}`)).toBe(false);
  });

  it('rejects a hash with a single character too many', () => {
    expect(isValidTxHash(`0x${'a'.repeat(65)}`)).toBe(false);
  });

  it.each([['0x'], [''], ['a'.repeat(64)], [`0x${'z'.repeat(64)}`]])(
    'rejects %s',
    (value: string) => {
      expect(isValidTxHash(value)).toBe(false);
    },
  );
});

describe('getRedeemableChain', () => {
  it('resolves the parent chain and inbox for an Arbitrum chain', () => {
    expect(getRedeemableChain(ChainId.ArbitrumOne)).toEqual(ARBITRUM_ONE);
  });

  it('resolves Orbit chains against their own parent, not against Ethereum', () => {
    const chain = getRedeemableChain(ChainId.ArbitrumSepolia);

    expect(chain?.parentChainId).toBe(ChainId.Sepolia);
  });

  it('returns undefined for chains that cannot receive retryables', () => {
    expect(getRedeemableChain(ChainId.Ethereum)).toBeUndefined();
    expect(getRedeemableChain(ChainId.Sepolia)).toBeUndefined();
    expect(getRedeemableChain(ChainId.Base)).toBeUndefined();
  });

  it('returns undefined for an unregistered chain', () => {
    expect(getRedeemableChain(999_999_999)).toBeUndefined();
  });
});

describe('getRedeemableChainIds', () => {
  it('offers Arbitrum chains only', () => {
    const mainnetChainIds = getRedeemableChainIds({ isTestnetMode: false });

    expect(mainnetChainIds).toContain(ChainId.ArbitrumOne);
    expect(mainnetChainIds).toContain(ChainId.ArbitrumNova);
    expect(mainnetChainIds).not.toContain(ChainId.Ethereum);
    expect(mainnetChainIds).not.toContain(ChainId.Base);
  });

  it('includes Orbit chains beyond the core ones', () => {
    expect(getRedeemableChainIds({ isTestnetMode: false }).length).toBeGreaterThan(2);
  });

  it('separates testnets from mainnets', () => {
    const mainnetChainIds = getRedeemableChainIds({ isTestnetMode: false });
    const testnetChainIds = getRedeemableChainIds({ isTestnetMode: true });

    expect(testnetChainIds).toContain(ChainId.ArbitrumSepolia);
    expect(testnetChainIds).not.toContain(ChainId.ArbitrumOne);
    expect(mainnetChainIds).not.toContain(ChainId.ArbitrumSepolia);
    expect(testnetChainIds).not.toContain(ChainId.Sepolia);
  });

  it('every offered chain resolves to a parent chain', () => {
    const chainIds = [
      ...getRedeemableChainIds({ isTestnetMode: false }),
      ...getRedeemableChainIds({ isTestnetMode: true }),
    ];

    for (const chainId of chainIds) {
      expect(getRedeemableChain(chainId)).toBeDefined();
    }
  });
});

describe('getRetryableStatusDisplay', () => {
  const allStatuses = [
    ParentToChildMessageStatus.NOT_YET_CREATED,
    ParentToChildMessageStatus.CREATION_FAILED,
    ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
    ParentToChildMessageStatus.REDEEMED,
    ParentToChildMessageStatus.EXPIRED,
    INDETERMINATE,
  ] as const;

  it('marks only a deposited-but-unredeemed ticket as redeemable', () => {
    const redeemableStatuses = allStatuses.filter(
      (status) => getRetryableStatusDisplay(status).isRedeemable,
    );

    expect(redeemableStatuses).toEqual([ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD]);
  });

  it('never offers to redeem a ticket whose status could not be resolved', () => {
    expect(getRetryableStatusDisplay(INDETERMINATE).isRedeemable).toBe(false);
  });

  it('labels every status', () => {
    for (const status of allStatuses) {
      const display = getRetryableStatusDisplay(status);

      expect(display.label).not.toBe('');
      expect(display.description).not.toBe('');
    }
  });
});

describe('countEthDepositsForInbox', () => {
  const ethDeposit = { bridgeMessageEvent: { kind: 12, inbox: ARBITRUM_ONE_INBOX } };
  const retryable = { bridgeMessageEvent: { kind: 9, inbox: ARBITRUM_ONE_INBOX } };
  const siblingChainEthDeposit = {
    bridgeMessageEvent: { kind: 12, inbox: '0xaAe29B0366299461418F5324a79Afc425BE5ae21' },
  };

  it('counts ETH deposits addressed to the given inbox', () => {
    expect(
      countEthDepositsForInbox({
        messageEvents: [ethDeposit, ethDeposit],
        inbox: ARBITRUM_ONE_INBOX,
      }),
    ).toBe(2);
  });

  it('ignores retryable submissions', () => {
    expect(
      countEthDepositsForInbox({ messageEvents: [retryable], inbox: ARBITRUM_ONE_INBOX }),
    ).toBe(0);
  });

  it('ignores ETH deposits heading to a sibling chain', () => {
    expect(
      countEthDepositsForInbox({
        messageEvents: [siblingChainEthDeposit],
        inbox: ARBITRUM_ONE_INBOX,
      }),
    ).toBe(0);
  });

  it('compares inboxes case-insensitively', () => {
    expect(
      countEthDepositsForInbox({
        messageEvents: [ethDeposit],
        inbox: ARBITRUM_ONE_INBOX.toLowerCase(),
      }),
    ).toBe(1);
  });
});

describe('findManualRedeem', () => {
  const args = {
    childChainId: ChainId.ArbitrumOne,
    retryableCreationId: TICKET_ID,
    fromBlock: 0,
  };

  it('reports a redeem whose retry transaction succeeded', async () => {
    const status = await findManualRedeem({
      ...args,
      childChainProvider: createRedeemProvider({ retryStatus: 1 }),
    });

    expect(status).toBe(ParentToChildMessageStatus.REDEEMED);
  });

  it('does not report a redeem whose retry transaction reverted', async () => {
    const status = await findManualRedeem({
      ...args,
      childChainProvider: createRedeemProvider({ retryStatus: 0 }),
    });

    expect(status).toBe(ParentToChildMessageStatus.EXPIRED);
  });
});

describe('lookupRetryables', () => {
  it('reports a hash that is not on the parent chain', async () => {
    const result = await lookupRetryables({
      parentChainTxHash: '0x'.padEnd(66, 'a'),
      parentChainProvider: createParentProvider({ receipt: null }),
      childChainProvider: createProvider({ chainId: ChainId.ArbitrumOne }),
      childChain: ARBITRUM_ONE,
    });

    expect(result).toEqual({ type: 'transactionNotFound' });
  });

  it('reports pre-Nitro Arbitrum One deposits instead of throwing', async () => {
    const result = await lookupRetryables({
      parentChainTxHash: '0x'.padEnd(66, 'a'),
      parentChainProvider: createParentProvider({
        receipt: createReceipt({ blockNumber: ARB1_NITRO_GENESIS_L1_BLOCK - 1 }),
      }),
      childChainProvider: createProvider({ chainId: ChainId.ArbitrumOne }),
      childChain: ARBITRUM_ONE,
    });

    expect(result).toEqual({ type: 'classicTransaction' });
  });

  it('reports no retryables for a transaction that created no bridge messages', async () => {
    const result = await lookupRetryables({
      parentChainTxHash: '0x'.padEnd(66, 'a'),
      parentChainProvider: createParentProvider({
        receipt: createReceipt({ blockNumber: ARB1_NITRO_GENESIS_L1_BLOCK + 1 }),
      }),
      childChainProvider: createProvider({ chainId: ChainId.ArbitrumOne }),
      childChain: ARBITRUM_ONE,
    });

    expect(result).toEqual({ type: 'noRetryables' });
  });
});
