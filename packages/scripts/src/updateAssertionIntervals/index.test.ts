import { ethers } from 'ethers';
import { describe, expect, it } from 'vitest';

import {
  applyDelayEstimates,
  buildDelaySamples,
  isMessageBearingBatchTransaction,
  median,
} from './index';

const batchPosterInterface = new ethers.utils.Interface([
  'function addSequencerL2Batch(uint256 sequenceNumber, bytes data, uint256 afterDelayedMessagesRead, address gasRefunder, uint256 prevMessageCount, uint256 newMessageCount)',
  'function addSequencerL2BatchFromOrigin(uint256 sequenceNumber, bytes data, uint256 afterDelayedMessagesRead, address gasRefunder)',
  'function addSequencerL2BatchFromOrigin(uint256 sequenceNumber, bytes data, uint256 afterDelayedMessagesRead, address gasRefunder, uint256 prevMessageCount, uint256 newMessageCount)',
]);

describe('updateAssertionIntervals helpers', () => {
  it('computes the median for odd and even collections', () => {
    expect(median([1, 9, 5])).toBe(5);
    expect(median([1, 3, 5, 9])).toBe(4);
  });

  it('identifies message-bearing batch poster transactions', () => {
    const nonEmptyBatchData = batchPosterInterface.encodeFunctionData('addSequencerL2Batch', [
      1,
      '0x1234',
      0,
      '0x0000000000000000000000000000000000000001',
      10,
      12,
    ]);
    const emptyBatchData = batchPosterInterface.encodeFunctionData('addSequencerL2Batch', [
      1,
      '0x1234',
      0,
      '0x0000000000000000000000000000000000000001',
      12,
      12,
    ]);
    const legacyOriginBatchData = batchPosterInterface.encodeFunctionData(
      'addSequencerL2BatchFromOrigin(uint256,bytes,uint256,address)',
      [1, '0x1234', 0, '0x0000000000000000000000000000000000000001'],
    );

    expect(isMessageBearingBatchTransaction(nonEmptyBatchData)).toBe(true);
    expect(isMessageBearingBatchTransaction(emptyBatchData)).toBe(false);
    expect(isMessageBearingBatchTransaction(legacyOriginBatchData)).toBe(true);
  });

  it('builds delay samples from complete assertion cycles', () => {
    const samples = buildDelaySamples(
      [
        {
          afterInboxBatchAcc: '0xassertion-0',
          blockNumber: 10,
          logIndex: 0,
          timestamp: 100,
        },
        {
          afterInboxBatchAcc: '0xbatch-3',
          blockNumber: 40,
          logIndex: 0,
          timestamp: 400,
        },
      ],
      [
        {
          afterAcc: '0xbatch-1',
          blockNumber: 20,
          logIndex: 0,
          timestamp: 180,
          isMessageBearing: false,
        },
        {
          afterAcc: '0xbatch-2',
          blockNumber: 25,
          logIndex: 0,
          timestamp: 220,
          isMessageBearing: true,
        },
        {
          afterAcc: '0xbatch-3',
          blockNumber: 30,
          logIndex: 0,
          timestamp: 260,
          isMessageBearing: true,
        },
      ],
    );

    expect(samples).toEqual([
      {
        batchPostingDelaySeconds: 120,
        assertionAfterBatchDelaySeconds: 180,
      },
    ]);
  });

  it('skips cycles without a message-bearing batch', () => {
    const samples = buildDelaySamples(
      [
        {
          afterInboxBatchAcc: '0xassertion-0',
          blockNumber: 10,
          logIndex: 0,
          timestamp: 100,
        },
        {
          afterInboxBatchAcc: '0xbatch-2',
          blockNumber: 40,
          logIndex: 0,
          timestamp: 400,
        },
      ],
      [
        {
          afterAcc: '0xbatch-1',
          blockNumber: 20,
          logIndex: 0,
          timestamp: 180,
          isMessageBearing: false,
        },
        {
          afterAcc: '0xbatch-2',
          blockNumber: 30,
          logIndex: 0,
          timestamp: 260,
          isMessageBearing: false,
        },
      ],
    );

    expect(samples).toEqual([]);
  });

  it('applies delay estimates without touching chains that were not recomputed', () => {
    const data = {
      mainnet: [
        {
          chainId: 1001,
          bridgeUiConfig: {
            assertionIntervalSeconds: 3600,
          },
        },
        {
          chainId: 1002,
          bridgeUiConfig: {
            assertionIntervalSeconds: 7200,
          },
        },
      ],
      testnet: [],
    } as any;

    const updatedChains = applyDelayEstimates(
      data,
      new Map([
        [
          1002,
          {
            assertionIntervalSeconds: 1200,
          },
        ],
      ]),
    );

    expect(updatedChains).toBe(1);
    expect(data.mainnet[0].bridgeUiConfig).toEqual({ assertionIntervalSeconds: 3600 });
    expect(data.mainnet[1].bridgeUiConfig).toEqual({
      assertionIntervalSeconds: 1200,
    });
  });
});
