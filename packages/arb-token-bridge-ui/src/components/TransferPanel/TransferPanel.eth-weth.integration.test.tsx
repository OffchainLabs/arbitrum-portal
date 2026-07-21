import { screen } from '@testing-library/react';
import { afterEach, describe, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';

import { CommonAddress } from '../../util/CommonAddressUtils';
import { LIFI_TRANSFER_LIST_ID, type TokenListWithId } from '../../util/TokenListUtils';
import {
  type ChainQuerySlug,
  type TokenExpectation,
  ethTokenExpectation,
  expectDialogToStayClosed,
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

const mockedTokenLists = vi.hoisted(() => ({
  current: undefined as TokenListWithId[] | undefined,
}));

vi.mock('../../hooks/useTokenLists', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTokenLists')>();

  return {
    ...actual,
    useTokenLists: (...args: Parameters<typeof actual.useTokenLists>) => {
      const tokenLists = actual.useTokenLists(...args);

      return mockedTokenLists.current
        ? {
            ...tokenLists,
            data: mockedTokenLists.current,
            isLoading: false,
            isValidating: false,
          }
        : tokenLists;
    },
  };
});

type EthWethSelectionCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  selectedSourceToken: TokenExpectation;
  sourceToken: TokenExpectation;
  destinationToken: TokenExpectation;
};

const ethWethCases: EthWethSelectionCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    selectedSourceToken: nativeEthTokenExpectation,
    sourceToken: nativeEthTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Ethereum.WETHWithRobinhoodLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.ArbitrumOne.WETHWithRobinhoodLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'arbitrum-one',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
    sourceToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
    destinationToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'superposition',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
  },
];

async function assertEthWethSelection({
  sourceChain,
  destinationChain,
  selectedSourceToken,
  sourceToken,
  destinationToken,
}: EthWethSelectionCase) {
  await renderTransferPanel({
    sourceChain,
    destinationChain,
  });

  await setSourceToken(selectedSourceToken);

  await expectTokenButtonContent({
    isDestination: false,
    tokenExpectation: sourceToken,
  });
  await expectTokenButtonContent({
    isDestination: true,
    tokenExpectation: destinationToken,
  });
}

describe.sequential('TransferPanel LiFi Integration - ETH/WETH Override', () => {
  setupTransferPanelLifiIntegrationSuite();

  afterEach(() => {
    mockedTokenLists.current = undefined;
  });

  it.each(ethWethCases)(
    'renders expected source and destination tokens for ETH/WETH override: $sourceChain -> $destinationChain',
    assertEthWethSelection,
  );

  it('does not show the disabled-transfer dialog for a valid LiFi token', async () => {
    mockedTokenLists.current = [
      {
        bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
        l2ChainId: '42161',
        name: 'Test token list',
        tokens: [
          {
            address: CommonAddress.ArbitrumOne.WETH,
            chainId: ChainId.ArbitrumOne,
            decimals: 18,
            name: 'Wrapped Ether',
            symbol: 'WETH',
          },
        ],
        timestamp: '2026-07-15T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
      },
    ];

    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'robinhood-chain',
      token: CommonAddress.Ethereum.WETH,
      destinationToken: CommonAddress.Ethereum.WETH,
    });

    await expectDialogToStayClosed({
      name: 'Token cannot be bridged here',
    });
  });

  it('does not show the disabled-transfer dialog for the default ETH/WETH transfer from Superposition to ApeChain', async () => {
    // Reflects production: token lists finish loading but tokensFromLists is empty for this pair
    mockedTokenLists.current = [];

    // The default case: sanitization resolves token and destinationToken to the zero address
    await renderTransferPanel({
      sourceChain: 'superposition',
      destinationChain: 'apechain',
    });

    await expectDialogToStayClosed({
      name: 'Token cannot be bridged here',
    });
  });

  it('shows the disabled-transfer dialog for an invalid token', async () => {
    mockedTokenLists.current = [
      {
        bridgeTokenListId: 'test-list',
        l2ChainId: '42161',
        name: 'Test token list',
        tokens: [
          {
            address: CommonAddress.Ethereum.PYUSD,
            chainId: 1,
            decimals: 6,
            name: 'PayPal USD',
            symbol: 'PYUSD',
          },
        ],
        timestamp: '2026-07-15T00:00:00.000Z',
        version: { major: 1, minor: 0, patch: 0 },
      },
    ];

    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'ethereum',
      token: CommonAddress.Ethereum.PYUSD,
      destinationToken: CommonAddress.Ethereum.PYUSD,
    });

    await screen.findByRole('dialog', {
      name: 'Token cannot be bridged here',
    });
  });
});
