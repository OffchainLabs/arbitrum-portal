import { BigNumber, constants } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { getGasSummaryStatus } from '../TransferPanel/useGasSummary';

vi.mock('../TransferPanel/useSelectedTokenDecimals', () => ({
  useSelectedTokenDecimals: vi.fn().mockReturnValue(18),
}));

vi.mock('../../components/TransferPanel/hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: vi.fn(),
}));

describe('getGasSummaryStatus', () => {
  describe('given the following combinations of amount and balance', () => {
    const mockedGasSummaryParams = {
      gasEstimatesError: null,
    };

    it('should return success if both amount and balance are zero', async () => {
      const result = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: constants.Zero,
      });
      expect(result).toEqual('success');
    });

    it('should return insufficientBalance if amount is lower than balance', async () => {
      const result = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: constants.Zero,
      });
      expect(result).toEqual('insufficientBalance');
    });

    it('should return loading if balance is null', async () => {
      const result1 = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: null,
      });
      expect(result1).toEqual('loading');

      const result2 = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: null,
      });
      expect(result2).toEqual('loading');
    });
  });

  it('should return error if there is a gas estimate error', async () => {
    const result = getGasSummaryStatus({
      gasEstimatesError: new Error('cannot estimate gas'),
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
    });
    expect(result).toEqual('error');
  });
});
