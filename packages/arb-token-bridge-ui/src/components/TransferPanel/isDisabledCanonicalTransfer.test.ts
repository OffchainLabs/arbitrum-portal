import { constants } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import { isDisabledCanonicalTransfer } from './isDisabledCanonicalTransfer';

// OFT tokens whose canonical deposit is blocked in favor of their OFT route
const { BLOCKED_OFT_PARENT_ADDRESSES } = vi.hoisted(() => ({
  BLOCKED_OFT_PARENT_ADDRESSES: [
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
    '0x64d3cae387405d91f7b0d91fb1d824a281719500', // GS on Ethereum
  ],
}));

vi.mock('../../util/WithdrawOnlyUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/WithdrawOnlyUtils')>();
  return {
    ...actual,
    // tests run concurrently, so key the mock on its arguments instead of mutating it per test
    isBlockedOftDeposit: vi.fn(
      async ({ parentChainErc20Address }: { parentChainErc20Address: string }) =>
        BLOCKED_OFT_PARENT_ADDRESSES.some(
          (address) => address.toLowerCase() === parentChainErc20Address.toLowerCase(),
        ),
    ),
  };
});

function buildToken(address: string): ERC20BridgeToken {
  return {
    address,
    decimals: 18,
    name: 'Test Token',
    symbol: 'TEST',
    type: TokenType.ERC20,
    listIds: new Set<string>(),
  };
}

const usdcToken = buildToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
const rdpxToken = buildToken('0x0ff5A8451A839f5F0BB3562689D9A44089738D11');

const baseParams = {
  selectedToken: usdcToken,
  isDepositMode: true,
  parentChainId: ChainId.Ethereum,
  childChainId: ChainId.ArbitrumOne,
  isSelectedTokenWithdrawOnly: false,
  isSelectedTokenWithdrawOnlyLoading: false,
};

describe('isDisabledCanonicalTransfer', () => {
  it('returns false when no token is selected', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        selectedToken: null,
      }),
    ).toBe(false);
  });

  it('returns false for a regular token with no restrictions', async () => {
    expect(await isDisabledCanonicalTransfer(baseParams)).toBe(false);
  });

  it('returns true for a token in the transfer-disabled list, regardless of direction (rDPX)', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        selectedToken: rdpxToken,
      }),
    ).toBe(true);

    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        selectedToken: rdpxToken,
        isDepositMode: false,
      }),
    ).toBe(true);
  });

  it.each(BLOCKED_OFT_PARENT_ADDRESSES)(
    'returns true when the canonical deposit is blocked in favor of the OFT route (%s)',
    async (address) => {
      expect(
        await isDisabledCanonicalTransfer({
          ...baseParams,
          selectedToken: buildToken(address),
        }),
      ).toBe(true);
    },
  );

  it('returns true for ETH from Arbitrum One to ApeChain', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        selectedToken: buildToken(constants.AddressZero),
        parentChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.ApeChain,
      }),
    ).toBe(true);
  });

  it('returns false for an ERC20 from Arbitrum One to ApeChain', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        parentChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.ApeChain,
      }),
    ).toBe(false);
  });

  it('returns false for ETH token address on other chain pairs', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        selectedToken: buildToken(constants.AddressZero),
      }),
    ).toBe(false);
  });

  it('returns true when depositing a withdraw-only token', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        isSelectedTokenWithdrawOnly: true,
      }),
    ).toBe(true);
  });

  it('returns false while the withdraw-only status is still loading', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        isSelectedTokenWithdrawOnly: true,
        isSelectedTokenWithdrawOnlyLoading: true,
      }),
    ).toBe(false);
  });

  it('returns false when withdrawing a withdraw-only token', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        isSelectedTokenWithdrawOnly: true,
        isDepositMode: false,
      }),
    ).toBe(false);
  });

  it('returns false when the withdraw-only status is undefined', async () => {
    expect(
      await isDisabledCanonicalTransfer({
        ...baseParams,
        isSelectedTokenWithdrawOnly: undefined,
      }),
    ).toBe(false);
  });
});
