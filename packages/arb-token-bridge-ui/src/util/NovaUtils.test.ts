import { constants, utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import {
  NOVA_MAX_ETH_DEPOSIT_AMOUNT,
  NovaDepositBlockReason,
  getNovaDepositBlockReason,
  isNovaDestination,
} from './NovaUtils';

const USDC = CommonAddress.Ethereum.USDC;

describe('isNovaDestination', () => {
  it('is true only for Nova', () => {
    expect(isNovaDestination(ChainId.ArbitrumNova)).toBe(true);
    expect(isNovaDestination(ChainId.ArbitrumOne)).toBe(false);
    expect(isNovaDestination(ChainId.Ethereum)).toBe(false);
  });
});

describe('getNovaDepositBlockReason', () => {
  const cases: {
    name: string;
    destinationChainId: number;
    selectedTokenAddress: string | undefined;
    destinationTokenAddress: string | undefined;
    amount: string;
    expected: NovaDepositBlockReason | null;
  }[] = [
    {
      name: 'allows an ETH deposit below the cap',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: undefined,
      destinationTokenAddress: undefined,
      amount: '0.005',
      expected: null,
    },
    {
      name: 'allows an ETH deposit exactly at the cap',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: undefined,
      destinationTokenAddress: undefined,
      amount: String(NOVA_MAX_ETH_DEPOSIT_AMOUNT),
      expected: null,
    },
    {
      name: 'blocks an ETH deposit above the cap',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: undefined,
      destinationTokenAddress: undefined,
      amount: '0.02',
      expected: 'amount-capped',
    },
    {
      /**
       * The LiFi list for Ethereum <> Nova contains a real AddressZero entry, so `?token=0x0..0`
       * resolves to a non-null token object for plain ETH. It must still be allowed.
       */
      name: 'allows an AddressZero deposit below the cap',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: constants.AddressZero,
      destinationTokenAddress: undefined,
      amount: '0.005',
      expected: null,
    },
    {
      name: 'blocks an ERC20 deposit',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: USDC,
      destinationTokenAddress: undefined,
      amount: '0.005',
      expected: 'eth-only',
    },
    {
      name: 'blocks an ERC20 deposit even when under the cap and priced in ETH',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: USDC,
      destinationTokenAddress: undefined,
      amount: '0.000001',
      expected: 'eth-only',
    },
    {
      name: 'blocks a LiFi swap that delivers an ERC20 into Nova',
      destinationChainId: ChainId.ArbitrumNova,
      selectedTokenAddress: undefined,
      destinationTokenAddress: USDC,
      amount: '0.005',
      expected: 'eth-only',
    },
    // Withdrawals out of Nova must never be affected
    {
      name: 'allows a Nova to Ethereum ERC20 withdrawal of any size',
      destinationChainId: ChainId.Ethereum,
      selectedTokenAddress: USDC,
      destinationTokenAddress: undefined,
      amount: '5',
      expected: null,
    },
    {
      name: 'allows a Nova to Arbitrum One ERC20 transfer of any size',
      destinationChainId: ChainId.ArbitrumOne,
      selectedTokenAddress: USDC,
      destinationTokenAddress: undefined,
      amount: '5',
      expected: null,
    },
    {
      name: 'allows a Nova to Ethereum ETH withdrawal above the Nova cap',
      destinationChainId: ChainId.Ethereum,
      selectedTokenAddress: undefined,
      destinationTokenAddress: undefined,
      amount: '5',
      expected: null,
    },
  ];

  it.each(cases)(
    '$name',
    ({ destinationChainId, selectedTokenAddress, destinationTokenAddress, amount, expected }) => {
      expect(
        getNovaDepositBlockReason({
          destinationChainId,
          selectedTokenAddress,
          destinationTokenAddress,
          amount: utils.parseEther(amount),
        }),
      ).toBe(expected);
    },
  );

  it('treats an empty destination token as native ETH', () => {
    expect(
      getNovaDepositBlockReason({
        destinationChainId: ChainId.ArbitrumNova,
        selectedTokenAddress: undefined,
        destinationTokenAddress: '',
        amount: utils.parseEther('0.005'),
      }),
    ).toBeNull();
  });

  it('reports eth-only before the cap when both would apply', () => {
    expect(
      getNovaDepositBlockReason({
        destinationChainId: ChainId.ArbitrumNova,
        selectedTokenAddress: USDC,
        destinationTokenAddress: undefined,
        amount: utils.parseEther('100'),
      }),
    ).toBe('eth-only');
  });
});
