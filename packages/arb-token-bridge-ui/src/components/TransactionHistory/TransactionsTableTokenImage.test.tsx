import { cleanup, render, screen } from '@testing-library/react';
import { constants } from 'ethers';
import { afterEach, describe, expect, it } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, type LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../wallet/ecosystems/solana';
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage';

afterEach(cleanup);

const nativeSolanaTransfer: LifiMergedTransaction = {
  txId: 'signature',
  asset: 'SOL',
  assetType: AssetType.ETH,
  blockNum: null,
  createdAt: 1_700_000_000_000,
  direction: 'deposit',
  isWithdrawal: false,
  resolvedAt: null,
  status: WithdrawalStatus.CONFIRMED,
  destinationStatus: WithdrawalStatus.CONFIRMED,
  uniqueId: null,
  value: '1',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  destination: '0x1111111111111111111111111111111111111111',
  sender: 'So11111111111111111111111111111111111111112',
  isLifi: true,
  tokenAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
  parentChainId: ChainId.Solana,
  childChainId: ChainId.ArbitrumOne,
  sourceChainId: ChainId.Solana,
  destinationChainId: ChainId.ArbitrumOne,
  toolsDetails: [{ key: 'mayan', name: 'Mayan', logoURI: '' }],
  durationMs: 0,
  fromAmount: {
    amount: '1000000000',
    amountUSD: '1',
    token: { address: SOLANA_NATIVE_TOKEN_ADDRESS, symbol: 'SOL', decimals: 9 },
  },
  toAmount: {
    amount: '1000000000000000000',
    amountUSD: '1',
    token: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  destinationTxId: null,
};

describe.sequential('TransactionsTableTokenImage', () => {
  // ApeChain has its own native token logo, which must not replace SOL's
  it.each([ChainId.ArbitrumOne, ChainId.ApeChain])(
    'uses the source chain native-token logo for a Solana transfer to %s',
    (destinationChainId) => {
      const tx = {
        ...nativeSolanaTransfer,
        childChainId: destinationChainId,
        destinationChainId,
      };
      render(<TransactionsTableTokenImage tx={tx} />, {
        wrapper: createBridgeTestWrapper({
          query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
        }),
      });

      expect(screen.getByRole('img', { name: 'Native token logo' }).getAttribute('src')).toBe(
        '/images/Solana.svg',
      );
    },
  );

  // Elysium and ApeChain are both EVM chains, so only the LiFi-only check keeps APE's logo out
  it('uses the HYPE logo for a native transfer from Elysium to ApeChain', () => {
    const tx = {
      ...nativeSolanaTransfer,
      asset: 'HYPE',
      sender: '0x1111111111111111111111111111111111111111',
      tokenAddress: constants.AddressZero,
      parentChainId: ChainId.Elysium,
      childChainId: ChainId.ApeChain,
      sourceChainId: ChainId.Elysium,
      destinationChainId: ChainId.ApeChain,
    };
    render(<TransactionsTableTokenImage tx={tx} />, {
      wrapper: createBridgeTestWrapper({
        query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      }),
    });

    expect(screen.getByRole('img', { name: 'Native token logo' }).getAttribute('src')).toBe(
      getBridgeUiConfigForChain(ChainId.Elysium).nativeTokenData?.logoUrl,
    );
  });

  it('uses the ETH logo for a native transfer from Ethereum to Elysium', () => {
    const tx = {
      ...nativeSolanaTransfer,
      asset: 'ETH',
      sender: '0x1111111111111111111111111111111111111111',
      tokenAddress: constants.AddressZero,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.Elysium,
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.Elysium,
    };
    render(<TransactionsTableTokenImage tx={tx} />, {
      wrapper: createBridgeTestWrapper({
        query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      }),
    });

    expect(screen.getByRole('img', { name: 'ETH logo' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Native token logo' })).toBeNull();
  });
});
