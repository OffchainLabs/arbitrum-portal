import { CoinKey, ChainId as LifiChainId } from '@lifi/sdk';
import { BigNumber, utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import { createMockLifiRoute } from '../../test-utils/lifi';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  areTokensTheSame,
  getTransferWarningDialogType,
  hasHighAmountMismatch,
} from './TransferWarningUtils';

function tokenAmount(amount: string, decimals = 18) {
  return {
    amount,
    amountUSD: '0',
    token: { address: 'token', decimals, logoURI: '', symbol: 'TOKEN' },
  };
}

describe('hasHighAmountMismatch', () => {
  it('returns true when token quantity loss exceeds the threshold', () => {
    expect(
      hasHighAmountMismatch({
        fromAmount: tokenAmount(utils.parseUnits('1400', 18).toString()),
        toAmount: tokenAmount(utils.parseUnits('14', 18).toString()),
      }),
    ).toBe(true);
  });

  it('returns false when token quantity loss is below the threshold', () => {
    expect(
      hasHighAmountMismatch({
        fromAmount: tokenAmount(utils.parseUnits('1400', 18).toString()),
        toAmount: tokenAmount(utils.parseUnits('1330', 18).toString()),
      }),
    ).toBe(false);
  });

  it('compares token quantities too large for JavaScript numbers', () => {
    const fromAmount = BigNumber.from(10).pow(400);

    expect(
      hasHighAmountMismatch({
        fromAmount: tokenAmount(fromAmount.toString()),
        toAmount: tokenAmount(fromAmount.div(2).toString()),
      }),
    ).toBe(true);
  });
});

describe('getTransferWarningDialogType', () => {
  const route = createMockLifiRoute();
  const fromToken = { ...route.fromToken, coinKey: CoinKey.ETH };
  const toToken = { ...route.toToken, coinKey: CoinKey.ETH };
  const mismatchedAmounts = {
    fromAmount: tokenAmount(utils.parseUnits('1400', 18).toString()),
    toAmount: tokenAmount(utils.parseUnits('14', 18).toString()),
  };

  it('uses USD loss when aggregate fees have a USD value', () => {
    expect(
      getTransferWarningDialogType({
        ...mismatchedAmounts,
        fromToken,
        toToken,
        fromAmountUsd: 6,
        toAmountUsd: 0.3,
      }),
    ).toBe('high_slippage_warning');
  });

  it('does not fall back to token amounts when USD values are available', () => {
    expect(
      getTransferWarningDialogType({
        ...mismatchedAmounts,
        fromToken,
        toToken,
        fromAmountUsd: 100,
        toAmountUsd: 95,
      }),
    ).toBeUndefined();
  });

  it('uses token quantity loss when USD values are unavailable', () => {
    expect(
      getTransferWarningDialogType({
        ...mismatchedAmounts,
        fromToken,
        toToken,
        fromAmountUsd: 0,
        toAmountUsd: 0,
      }),
    ).toBe('amount_mismatch_warning');
  });
});

describe('areTokensTheSame', () => {
  it('returns true when LiFi assigns both sides the same coin key', () => {
    const fromToken = {
      address: '0x0000000000000000000000000000000000000001',
      chainId: LifiChainId.ETH,
      coinKey: CoinKey.USDC,
      decimals: 6,
      name: 'USD Coin',
      priceUSD: '1',
      symbol: 'USDC',
    };
    const toToken = {
      ...fromToken,
      address: '0x0000000000000000000000000000000000000002',
      chainId: LifiChainId.ARB,
    };
    expect(areTokensTheSame({ fromToken, toToken })).toBe(true);
  });

  it('recognizes the VIRTUAL pair when LiFi omits a coin key', () => {
    const fromToken = {
      ...createMockLifiRoute().fromToken,
      address: CommonAddress.RobinhoodChain.VIRTUAL,
      chainId: 4663 as LifiChainId,
      coinKey: undefined,
      decimals: 18,
      name: 'Virtual Protocol',
      symbol: 'VIRTUAL',
    };
    const toToken = {
      ...fromToken,
      address: CommonAddress.Ethereum.VIRTUAL,
      chainId: LifiChainId.ETH,
    };

    expect(areTokensTheSame({ fromToken, toToken })).toBe(true);
  });

  it('returns false when different tokens share an address', () => {
    const fromToken = {
      ...createMockLifiRoute().fromToken,
      coinKey: CoinKey.USDT,
    };
    const toToken = {
      ...fromToken,
      coinKey: CoinKey.USDC,
      name: 'USD Coin',
      symbol: 'USDC',
    };
    expect(areTokensTheSame({ fromToken, toToken })).toBe(false);
  });

  it('returns false when matching tokens use different decimals', () => {
    const fromToken = createMockLifiRoute().fromToken;
    const toToken = {
      ...fromToken,
      chainId: LifiChainId.ARB,
      decimals: fromToken.decimals + 1,
    };
    expect(areTokensTheSame({ fromToken, toToken })).toBe(false);
  });
});
