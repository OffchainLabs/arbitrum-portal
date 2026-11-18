import { utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../../../test-utils/lifi';
import { getLifiMaxAmount } from './useMaxAmount';

const eth = {
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  logoURI: '',
  symbol: 'ETH',
};

function createRoute(): LifiCrosschainTransfersRoute {
  return {
    type: 'lifi',
    durationMs: 0,
    gas: [
      {
        amount: utils.parseEther('0.01').toString(),
        token: eth,
        chainId: 42161,
        details: { id: 'source-gas', label: 'Source gas', via: 'LI.FI' },
      },
      {
        amount: utils.parseEther('0.5').toString(),
        token: eth,
        chainId: 999,
        details: { id: 'destination-gas', label: 'Destination gas', via: 'LI.FI' },
      },
    ],
    fee: [
      {
        amount: utils.parseEther('0.02').toString(),
        token: eth,
        chainId: 42161,
        details: { id: 'source-fee', label: 'Source fee', via: 'LI.FI' },
      },
    ],
    fromAmount: { amount: utils.parseEther('0.1').toString(), amountUSD: '1', token: eth },
    toAmount: { amount: utils.parseEther('0.09').toString(), amountUSD: '0.9', token: eth },
    fromChainId: 42161,
    toChainId: 999,
    protocolData: {
      route: createMockLifiRoute(),
    },
  };
}

describe('getLifiMaxAmount', () => {
  it('subtracts buffered source-chain gas and source-token fees', () => {
    expect(
      getLifiMaxAmount({
        balance: utils.parseEther('1'),
        decimals: 18,
        sourceChainId: 42161,
        route: createRoute(),
      }),
    ).toBe('0.966');
  });
});
