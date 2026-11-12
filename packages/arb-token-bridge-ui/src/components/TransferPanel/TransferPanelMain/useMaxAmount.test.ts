import { utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../../../test-utils/lifi';
import { ChainId } from '../../../types/ChainId';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../../wallet/ecosystems/solana';
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

  it('keeps the SOL reserve on top of the route costs', () => {
    const sol = { address: SOLANA_NATIVE_TOKEN_ADDRESS, decimals: 9, logoURI: '', symbol: 'SOL' };
    const route: LifiCrosschainTransfersRoute = {
      ...createRoute(),
      gas: [
        {
          amount: '100000',
          token: sol,
          chainId: ChainId.Solana,
          details: { id: 'source-gas', label: 'Source gas', via: 'LI.FI' },
        },
      ],
      fee: [
        {
          amount: '125000',
          token: sol,
          chainId: ChainId.Solana,
          details: { id: 'source-fee', label: 'Source fee', via: 'LI.FI' },
        },
      ],
      fromAmount: { amount: '50000000', amountUSD: '1', token: sol },
      fromChainId: ChainId.Solana,
      toChainId: ChainId.ArbitrumOne,
    };

    // 0.1 SOL - 0.002 SOL reserve - 1.4 * 0.0001 SOL gas - 0.000125 SOL fee
    expect(
      getLifiMaxAmount({
        balance: utils.parseUnits('0.1', 9),
        decimals: 9,
        sourceChainId: ChainId.Solana,
        route,
      }),
    ).toBe('0.097735');
  });
});
