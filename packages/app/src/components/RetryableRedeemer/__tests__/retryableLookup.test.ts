import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import type { Provider } from '@ethersproject/abstract-provider';
import { beforeAll, describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { initializeBridgeNetworks } from '@/bridge/util/networks';

import {
  countEthDepositsForInbox,
  getRedeemableChain,
  getRedeemableChainIds,
  getRetryableStatusDisplay,
  lookupRetryables,
} from '../retryableLookup';

const ARBITRUM_ONE_INBOX = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';
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

beforeAll(() => {
  initializeBridgeNetworks();
});

describe('getRedeemableChain', () => {
  it('resolves the parent chain and inbox for an Arbitrum chain', () => {
    expect(getRedeemableChain(ChainId.ArbitrumOne)).toEqual({
      chainId: ChainId.ArbitrumOne,
      parentChainId: ChainId.Ethereum,
      inbox: ARBITRUM_ONE_INBOX,
    });
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
  it('marks only a deposited-but-unredeemed ticket as redeemable', () => {
    const redeemableStatuses = [
      ParentToChildMessageStatus.NOT_YET_CREATED,
      ParentToChildMessageStatus.CREATION_FAILED,
      ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      ParentToChildMessageStatus.REDEEMED,
      ParentToChildMessageStatus.EXPIRED,
    ].filter((status) => getRetryableStatusDisplay(status).isRedeemable);

    expect(redeemableStatuses).toEqual([ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD]);
  });

  it('labels every status', () => {
    for (const status of [
      ParentToChildMessageStatus.NOT_YET_CREATED,
      ParentToChildMessageStatus.CREATION_FAILED,
      ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      ParentToChildMessageStatus.REDEEMED,
      ParentToChildMessageStatus.EXPIRED,
    ]) {
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

describe('lookupRetryables', () => {
  it('reports a hash that is not on the parent chain', async () => {
    const result = await lookupRetryables({
      parentChainTxHash: '0x'.padEnd(66, 'a'),
      parentChainProvider: createParentProvider({ receipt: null }),
      childChainProvider: createProvider({ chainId: ChainId.ArbitrumOne }),
      inbox: ARBITRUM_ONE_INBOX,
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
      inbox: ARBITRUM_ONE_INBOX,
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
      inbox: ARBITRUM_ONE_INBOX,
    });

    expect(result).toEqual({ type: 'noRetryables' });
  });
});
