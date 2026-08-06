import { constants, utils } from 'ethers';
import { describe, expect, test } from 'vitest';

import { GasEstimationStatus } from '../../../hooks/TransferPanel/useGasSummary';
import { NativeCurrency } from '../../../hooks/useNativeCurrency';
import { getGasCostAndToken } from './getGasCostAndToken';

describe('getGasCostAndToken', () => {
  const toWei = (amount: number) => utils.parseUnits(amount.toFixed(18), 18).toString();
  const mockNativeCurrency: NativeCurrency & { address: string } = {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    isCustom: false,
    address: constants.AddressZero,
  };

  const mockCustomNativeCurrency: NativeCurrency = {
    name: 'XAI',
    symbol: 'XAI',
    decimals: 18,
    isCustom: true,
    address: '0x0000000000000000000000000000000000000222',
  };
  const childChainName = 'Arbitrum One';
  const parentChainName = 'Ethereum';

  describe('should return isLoading true', () => {
    const expected = {
      isLoading: true,
      gasCost: null,
    };
    test.each([
      {
        status: 'loading',
        estimatedParentChainGasFees: undefined,
        estimatedChildChainGasFees: undefined,
        expected,
      },
      {
        status: 'success',
        estimatedParentChainGasFees: 123,
        estimatedChildChainGasFees: undefined,
        expected,
      },
      {
        status: 'success',
        estimatedParentChainGasFees: undefined,
        estimatedChildChainGasFees: 123,
        expected,
      },
    ])(
      `getGasCostAndToken({
        ...,
        gasSummaryStatus: "$status",
        estimatedParentChainGasFees: $estimatedParentChainGasFees,
        estimatedChildChainGasFees: $estimatedChildChainGasFees
      })`,
      ({ status, estimatedParentChainGasFees, estimatedChildChainGasFees, expected }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: mockNativeCurrency,
            parentChainNativeCurrency: mockNativeCurrency,
            childChainName,
            parentChainName,
            gasSummaryStatus: status as GasEstimationStatus,
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode: true,
          }),
        ).toEqual(expected);
      },
    );

    // test.each([
    //   {
    //     status: 'loading',
    //     estimatedParentChainGasFees: undefined,
    //     estimatedChildChainGasFees: undefined,
    //     expected
    //   },
    //   {
    //     status: 'success',
    //     estimatedParentChainGasFees: 123,
    //     estimatedChildChainGasFees: undefined,
    //     expected
    //   },
    //   {
    //     status: 'success',
    //     estimatedParentChainGasFees: undefined,
    //     estimatedChildChainGasFees: 123,
    //     expected
    //   }
    // ])(
    //   '.add($status, $b)',
    //   ({
    //     status,
    //     estimatedChildChainGasFees,
    //     estimatedParentChainGasFees,
    //     expected
    //   }) => {
    //     expect(status + b).toBe(expected)
    //   }
    // )
  });

  describe('should return combined gas fee for same native currency', () => {
    test.each([
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        isDepositMode: true,
      },
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 352,
        estimatedChildChainGasFees: 123,
        isDepositMode: false,
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        isDepositMode: true,
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 3890,
        estimatedChildChainGasFees: 32409,
        isDepositMode: false,
      },
    ])(
      `getGasCostAndToken({
        ...,
        currency: $parentCurrency.name,
        isDepositMode: $isDepositMode
      })`,
      ({
        parentCurrency,
        childCurrency,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        isDepositMode,
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: childCurrency,
            parentChainNativeCurrency: parentCurrency,
            childChainName,
            parentChainName,
            gasSummaryStatus: 'success',
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode,
          }),
        ).toEqual({
          isLoading: false,
          gasCost: [
            {
              amount: toWei(estimatedParentChainGasFees + estimatedChildChainGasFees),
              token: childCurrency,
              details: {
                id: 'arbitrum-gas-total',
                label: `${parentChainName} and ${childChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        });
      },
    );
  });

  describe('should return gas cost for different native currencies in deposit mode', () => {
    test.each([
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 0,
        expected: {
          isLoading: false,
          gasCost: [
            {
              amount: toWei(201),
              token: mockNativeCurrency,
              details: {
                id: 'arbitrum-gas-parent',
                label: `${parentChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        },
      },
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        expected: {
          isLoading: false,
          gasCost: [
            {
              amount: toWei(201),
              token: mockNativeCurrency,
              details: {
                id: 'arbitrum-gas-parent',
                label: `${parentChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
            {
              amount: toWei(305),
              token: mockCustomNativeCurrency,
              details: {
                id: 'arbitrum-gas-child',
                label: `${childChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        },
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        expected: {
          isLoading: false,
          gasCost: [
            {
              amount: toWei(634),
              token: mockCustomNativeCurrency,
              details: {
                id: 'arbitrum-gas-parent',
                label: `${parentChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
            {
              amount: toWei(234),
              token: mockNativeCurrency,
              details: {
                id: 'arbitrum-gas-child',
                label: `${childChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        },
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        expected: {
          isLoading: false,
          gasCost: [
            {
              amount: toWei(634),
              token: mockCustomNativeCurrency,
              details: {
                id: 'arbitrum-gas-parent',
                label: `${parentChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
            {
              amount: toWei(234),
              token: mockNativeCurrency,
              details: {
                id: 'arbitrum-gas-child',
                label: `${childChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        },
      },
    ])(
      `getGasCostAndToken({
        ...,
        parentCurrency: $parentCurrency.name,
        childCurrency: $childCurrency.name,
        selectedToken: $selectedToken
      })`,
      ({
        parentCurrency,
        childCurrency,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        expected,
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: childCurrency,
            parentChainNativeCurrency: parentCurrency,
            childChainName,
            parentChainName,
            gasSummaryStatus: 'success',
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode: true,
          }),
        ).toEqual(expected);
      },
    );
  });

  describe('should return gas cost for different native currencies in withdrawal mode', () => {
    test.each([
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        expected: {
          isLoading: false,
          gasCost: [
            {
              amount: toWei(305),
              token: mockCustomNativeCurrency,
              details: {
                id: 'arbitrum-gas-child',
                label: `${childChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        },
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        expected: {
          isLoading: false,
          gasCost: [
            {
              amount: toWei(234),
              token: mockNativeCurrency,
              details: {
                id: 'arbitrum-gas-child',
                label: `${childChainName} gas fee`,
                via: 'Arbitrum Bridge',
                iconURI: '/icons/arbitrum.svg',
              },
            },
          ],
        },
      },
    ])(
      `getGasCostAndToken({
        ...,
        parentCurrency: $parentCurrency.name,
        childCurrency: $childCurrency.name,
      })`,
      ({
        parentCurrency,
        childCurrency,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        expected,
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: childCurrency,
            parentChainNativeCurrency: parentCurrency,
            childChainName,
            parentChainName,
            gasSummaryStatus: 'success',
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode: false,
          }),
        ).toEqual(expected);
      },
    );
  });
});
