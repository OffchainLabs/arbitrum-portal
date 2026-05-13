import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { constants } from 'ethers';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import {
  createIntegrationWrapper,
  getSearchParams,
} from '../../test-utils/integration-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { mapCustomChainToNetworkData } from '../../util/networks';
import orbitChainsData from '../../util/orbitChainsData.json';
import { TransferPanel } from './TransferPanel';

vi.mock('@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory', async () => {
  const { BigNumber } = await import('ethers');

  return {
    Inbox__factory: {
      connect: vi.fn(() => ({
        calculateRetryableSubmissionFee: vi.fn().mockResolvedValue(BigNumber.from(0)),
      })),
    },
  };
});

vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: vi.fn().mockReturnValue('/bridge'),
}));

vi.mock('react-virtualized', () => ({
  AutoSizer: ({
    children,
  }: {
    children: (props: { width: number; height: number }) => JSX.Element;
  }) => children({ width: 500, height: 700 }),
  List: React.forwardRef(function MockList(
    {
      rowCount,
      rowRenderer,
    }: {
      rowCount: number;
      rowRenderer: (props: {
        index: number;
        key: number;
        style: React.CSSProperties;
      }) => JSX.Element | null;
    },
    _ref: React.ForwardedRef<unknown>,
  ) {
    void _ref;
    return (
      <div>
        {Array.from({ length: rowCount }).map((_, index) => (
          <div key={index}>{rowRenderer({ index, key: index, style: {} })}</div>
        ))}
      </div>
    );
  }),
}));

type ChainQuerySlug = 'ethereum' | 'apechain' | 'superposition';
type ExpectedSymbol = 'USDC' | 'USDC.e' | 'USDT' | 'ETH' | 'WETH' | 'APE';
const INTEGRATION_ASSERT_TIMEOUT_MS = 50_000;

type RouteTokenCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  expectedSourceSymbol: ExpectedSymbol;
  expectedDestinationSymbol: ExpectedSymbol;
  expectedSourcePanelSymbols?: ExpectedSymbol[];
  expectedDestinationPanelSymbols?: ExpectedSymbol[];
};

const usdcAddressByChain: Record<ChainQuerySlug, string> = {
  ethereum: CommonAddress.Ethereum.USDC,
  apechain: CommonAddress.ApeChain.USDCe,
  superposition: CommonAddress.Superposition.USDCe,
};

const defaultTokenCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'APE',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['APE', 'USDC.e', 'USDT', 'WETH'],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'APE',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['APE', 'USDC', 'USDT', 'WETH', 'ETH'],
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC.e', 'WETH'],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC', 'WETH'],
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'ETH',
    expectedSourcePanelSymbols: ['APE'],
    expectedDestinationPanelSymbols: ['ETH', 'USDC.e', 'WETH'],
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'APE',
    expectedSourcePanelSymbols: ['ETH'],
    expectedDestinationPanelSymbols: ['APE', 'USDC.e', 'WETH'],
  },
];

const usdcCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'USDC.e',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC',
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'USDC.e',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC.e',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'USDC.e',
  },
];

const ethWethCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'WETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'APE',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'ETH',
    expectedDestinationSymbol: 'WETH',
  },
];

const swapCases: RouteTokenCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'WETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'ETH',
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    expectedSourceSymbol: 'USDC.e',
    expectedDestinationSymbol: 'WETH',
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getUsdcSourceToken(sourceChain: ChainQuerySlug): ERC20BridgeToken {
  const isEthereum = sourceChain === 'ethereum';
  return {
    type: TokenType.ERC20,
    decimals: 6,
    name: isEthereum ? 'USD Coin' : 'Bridged USDC',
    symbol: isEthereum ? 'USDC' : 'USDC.e',
    address: usdcAddressByChain[sourceChain],
    listIds: new Set<string>(),
  };
}

function renderTransferPanel({
  sourceChain,
  destinationChain,
  token,
  destinationToken,
  bridgeTokens,
  destinationAddress,
}: {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  token?: string;
  destinationToken?: string;
  bridgeTokens?: ContractStorage<ERC20BridgeToken>;
  destinationAddress: string;
}) {
  const wrapper = createIntegrationWrapper({
    search: getSearchParams({
      sourceChain,
      destinationChain,
      token,
      destinationToken,
      destinationAddress,
    }),
    bridgeTokens,
  });

  render(<TransferPanel />, { wrapper });
}

async function expectTokenButtonSymbol({
  isDestination,
  symbol,
}: {
  isDestination: boolean;
  symbol: string;
}) {
  const buttonAriaLabel = isDestination ? 'Select Destination Token' : 'Select Token';
  const tokenButton = await screen.findByRole('button', { name: buttonAriaLabel, hidden: true });
  await waitFor(
    () => {
      expect(tokenButton.textContent).toContain(symbol);
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: () =>
        new Error(`Timed out waiting for "${buttonAriaLabel}" button text to contain "${symbol}".`),
    },
  );
}

async function expectTokenPanelSymbol({
  isDestination,
  symbolsToContain,
}: {
  isDestination: boolean;
  symbolsToContain: string[];
}) {
  const buttonAriaLabel = isDestination ? 'Select Destination Token' : 'Select Token';
  const dialogTitle = isDestination ? 'Select Destination Token' : 'Select Token';

  fireEvent.click(await screen.findByRole('button', { name: buttonAriaLabel, hidden: true }));

  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText(dialogTitle);

  const matchers = symbolsToContain.map((symbol) => ({
    symbol,
    matcher: new RegExp(escapeRegExp(symbol), 'i'),
  }));

  await waitFor(
    () => {
      const missingSymbols = matchers
        .filter(
          ({ matcher }) => within(dialog).queryAllByRole('button', { name: matcher }).length === 0,
        )
        .map(({ symbol }) => symbol);

      if (missingSymbols.length > 0) {
        throw new Error(
          `Missing symbol(s) "${missingSymbols.join(', ')}" in ${isDestination ? 'destination' : 'source'} token panel.`,
        );
      }
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: () =>
        new Error(
          `Timed out waiting for [${symbolsToContain.join(', ')}] in ${isDestination ? 'destination' : 'source'} token panel.`,
        ),
    },
  );

  fireEvent.click(within(dialog).getByLabelText('Close Dialog'));

  await waitFor(
    () => {
      expect(screen.queryByRole('dialog')).toBeNull();
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: () => new Error('Timed out waiting for token selection dialog to close.'),
    },
  );
}

describe.sequential('TransferPanel LiFi Integration', () => {
  const nonConnectedDestinationAddress = 'integration-destination-address';
  const previousLifiFlag = process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI = 'true';

    const apeChain = orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.ApeChain)!;
    const superposition = orbitChainsData.mainnet.find(
      (chain) => chain.chainId === ChainId.Superposition,
    )!;

    registerCustomArbitrumNetwork(apeChain);
    registerCustomArbitrumNetwork(superposition);
    mapCustomChainToNetworkData(apeChain);
    mapCustomChainToNetworkData(superposition);
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI = previousLifiFlag;
  });

  it.each(defaultTokenCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for default token transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourceSymbol,
      expectedDestinationSymbol,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      renderTransferPanel({
        sourceChain,
        destinationChain,
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenButtonSymbol({
        isDestination: false,
        symbol: expectedSourceSymbol,
      });
      await expectTokenButtonSymbol({
        isDestination: true,
        symbol: expectedDestinationSymbol,
      });
      if (expectedSourcePanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: false,
          symbolsToContain: expectedSourcePanelSymbols,
        });
      }
      if (expectedDestinationPanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: true,
          symbolsToContain: expectedDestinationPanelSymbols,
        });
      }
    },
  );

  it.each(usdcCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for USDC transfer: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourceSymbol,
      expectedDestinationSymbol,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      const sourceUsdcAddress = usdcAddressByChain[sourceChain];
      const sourceUsdcToken = getUsdcSourceToken(sourceChain);

      renderTransferPanel({
        sourceChain,
        destinationChain,
        token: sourceUsdcAddress,
        destinationToken: sourceUsdcAddress,
        bridgeTokens: {
          [sourceUsdcAddress.toLowerCase()]: sourceUsdcToken,
        },
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenButtonSymbol({
        isDestination: false,
        symbol: expectedSourceSymbol,
      });
      await expectTokenButtonSymbol({
        isDestination: true,
        symbol: expectedDestinationSymbol,
      });
      if (expectedSourcePanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: false,
          symbolsToContain: expectedSourcePanelSymbols,
        });
      }
      if (expectedDestinationPanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: true,
          symbolsToContain: expectedDestinationPanelSymbols,
        });
      }
    },
  );

  it.each(ethWethCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for ETH/WETH override: $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourceSymbol,
      expectedDestinationSymbol,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      renderTransferPanel({
        sourceChain,
        destinationChain,
        destinationToken: constants.AddressZero,
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenButtonSymbol({
        isDestination: false,
        symbol: expectedSourceSymbol,
      });
      await expectTokenButtonSymbol({
        isDestination: true,
        symbol: expectedDestinationSymbol,
      });
      if (expectedSourcePanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: false,
          symbolsToContain: expectedSourcePanelSymbols,
        });
      }
      if (expectedDestinationPanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: true,
          symbolsToContain: expectedDestinationPanelSymbols,
        });
      }
    },
  );

  it.each(swapCases)(
    'renders source $expectedSourceSymbol and destination $expectedDestinationSymbol for swap (USDC -> ETH/WETH): $sourceChain -> $destinationChain',
    async ({
      sourceChain,
      destinationChain,
      expectedSourceSymbol,
      expectedDestinationSymbol,
      expectedSourcePanelSymbols,
      expectedDestinationPanelSymbols,
    }) => {
      const sourceUsdcAddress = usdcAddressByChain[sourceChain];
      const sourceUsdcToken = getUsdcSourceToken(sourceChain);

      renderTransferPanel({
        sourceChain,
        destinationChain,
        token: sourceUsdcAddress,
        destinationToken: constants.AddressZero,
        bridgeTokens: {
          [sourceUsdcAddress.toLowerCase()]: sourceUsdcToken,
        },
        destinationAddress: nonConnectedDestinationAddress,
      });

      await expectTokenButtonSymbol({
        isDestination: false,
        symbol: expectedSourceSymbol,
      });
      await expectTokenButtonSymbol({
        isDestination: true,
        symbol: expectedDestinationSymbol,
      });
      if (expectedSourcePanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: false,
          symbolsToContain: expectedSourcePanelSymbols,
        });
      }
      if (expectedDestinationPanelSymbols) {
        await expectTokenPanelSymbol({
          isDestination: true,
          symbolsToContain: expectedDestinationPanelSymbols,
        });
      }
    },
  );
});
