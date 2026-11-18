import { constants } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import * as lifiCrossTransfers from '../../hooks/useLifiCrossTransferRoute';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
} from './TransferPanel.default-tokens.cases';
import {
  ethTokenExpectation,
  expectTokenButtonContent,
  expectTokenPanelContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setDestinationToken,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
} from './TransferPanel.integration.helpers';

describe.sequential('TransferPanel LiFi Integration - Default Token', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each([
    {
      sourceName: 'Ethereum',
      sourceChain: 'ethereum',
      sourceChainId: ChainId.Ethereum,
      usdc: CommonAddress.Ethereum.USDC,
    },
    {
      sourceName: 'Arbitrum One',
      sourceChain: 'arbitrum-one',
      sourceChainId: ChainId.ArbitrumOne,
      usdc: CommonAddress.ArbitrumOne.USDC,
    },
  ] as const)(
    'defaults $sourceName USDC to ETH on Robinhood when no supported USDC pair exists',
    async ({ sourceChain, sourceChainId, usdc }) => {
      const quoteSpy = vi.spyOn(lifiCrossTransfers, 'useLifiCrossTransfersRoute');
      const sourceUsdc = {
        ...tokenExpectationsByChain.Ethereum.USDC,
        contract: usdc,
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      };

      await renderTransferPanel({
        sourceChain,
        destinationChain: 'robinhood-chain',
      });
      await setSourceToken(sourceUsdc);
      expect(quoteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fromChainId: sourceChainId,
          fromToken: usdc,
          toChainId: ChainId.RobinhoodChain,
          toToken: constants.AddressZero,
        }),
      );
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: ethTokenExpectation,
      });
      await expectTokenPanelContent({
        isDestination: true,
        symbolsToContain: ['ETH', 'USDG'],
        symbolsToExclude: ['USDC'],
        tokenExpectations: [
          nativeEthTokenExpectation,
          tokenExpectationsByChain.RobinhoodChain.USDG,
        ],
      });
      // Fails from swr 2.4.2 on: the destination token picker doesn't reopen after a token
      // was chosen. That's why swr is pinned to exactly 2.4.1 in packages/app and
      // packages/arb-token-bridge-ui. 2.4.2 only changed vercel/swr#4252 (double-unsubscribe
      // guard) and vercel/swr#4271 (suspense status). The cause on our side isn't known yet.
      await setDestinationToken(tokenExpectationsByChain.RobinhoodChain.USDG);
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: tokenExpectationsByChain.RobinhoodChain.USDG,
      });
      expect(quoteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ toToken: CommonAddress.RobinhoodChain.USDG }),
      );
      await setDestinationToken(nativeEthTokenExpectation);
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: ethTokenExpectation,
      });
      quoteSpy.mockRestore();
    },
  );

  // The other cases are in TransferPanel.default-tokens-2/3.integration.test.tsx
  it.each(defaultTokenCases.slice(0, 3))(defaultTokenCaseTitle, assertDefaultTokenCase);

  it.each([
    {
      sourceChain: 'arbitrum-one' as const,
      chainId: ChainId.ArbitrumOne,
      address: CommonAddress.ArbitrumOne.USDC,
    },
    {
      sourceChain: 'ethereum' as const,
      chainId: ChainId.Ethereum,
      address: CommonAddress.Ethereum.USDC,
    },
  ])(
    'defaults a saved $sourceChain USDC destination to ETH on Robinhood',
    async ({ sourceChain, chainId, address }) => {
      const quoteSpy = vi.spyOn(lifiCrossTransfers, 'useLifiCrossTransfersRoute');
      await renderTransferPanel({
        sourceChain,
        destinationChain: 'robinhood-chain',
        token: address,
        destinationToken: address,
      });

      await expectTokenButtonContent({
        isDestination: false,
        tokenExpectation: {
          symbol: 'USDC',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        },
      });
      await expectTokenButtonContent({
        isDestination: true,
        tokenExpectation: ethTokenExpectation,
      });
      expect(quoteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fromChainId: chainId,
          fromToken: address,
          toChainId: ChainId.RobinhoodChain,
          toToken: constants.AddressZero,
        }),
      );
      quoteSpy.mockRestore();
    },
  );
});
