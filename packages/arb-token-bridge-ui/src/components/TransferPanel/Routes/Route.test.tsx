import { cleanup, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { constants, utils } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RouteCost } from '../../../app/api/crosschain-transfers/types';
import { ChainId } from '../../../types/ChainId';
import { Route, RouteStep, RouteTool } from './Route';

dayjs.extend(relativeTime);

const tokenSearchUtilsMock = vi.hoisted(() => ({
  tokensFromLists: {} as Record<string, { priceUSD?: number }>,
}));

afterEach(() => {
  cleanup();
  tokenSearchUtilsMock.tokensFromLists = {};
});

vi.mock('@/app/components/common/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
    <>
      {children}
      <div data-testid="tooltip-content">{content}</div>
    </>
  ),
}));

vi.mock('../../../hooks/TransferPanel/useIsBatchTransferSupported', () => ({
  useIsBatchTransferSupported: () => false,
}));

vi.mock('../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [
    {
      amount2: '',
      destinationAddress: undefined,
      theme: {},
    },
    vi.fn(),
  ],
}));

vi.mock('../../../hooks/useETHPrice', () => ({
  useETHPrice: () => ({
    ethPrice: 2_000,
    ethToUSD: (eth: number) => eth * 2_000,
  }),
}));

vi.mock('../../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: () => ({
    decimals: 18,
    isCustom: false,
    name: 'Ether',
    symbol: 'ETH',
  }),
}));

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: { id: ChainId.Ethereum },
      sourceChainProvider: {},
    },
  ],
}));

vi.mock('../../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({
    childChainProvider: {},
    isDepositMode: true,
  }),
}));

vi.mock('../../../hooks/useSelectedToken', () => ({
  useSelectedToken: () => [null, vi.fn()],
}));

vi.mock('../TokenSearchUtils', () => ({
  useTokensFromLists: () => ({ data: tokenSearchUtilsMock.tokensFromLists, isLoading: false }),
  useTokensFromUser: () => ({}),
}));

vi.mock('../../App/AppContext', () => ({
  useAppContextState: () => ({
    layout: {
      isTransferring: false,
    },
  }),
}));

const ethToken = {
  address: constants.AddressZero,
  decimals: 18,
  logoURI: '',
  symbol: 'ETH',
};

const usdcToken = {
  address: '0x0000000000000000000000000000000000000001',
  decimals: 6,
  logoURI: '',
  symbol: 'USDC',
};

function renderRoute({
  bridgeFee,
  gasCost,
  routeTools,
  routeSteps,
}: {
  bridgeFee?: RouteCost[];
  gasCost: RouteCost[];
  routeTools?: RouteTool[];
  routeSteps?: RouteStep[];
}) {
  cleanup();

  render(
    <Route
      type="lifi"
      amountReceived="1"
      bridge="Test Bridge"
      bridgeIconURI="/icons/lifi.svg"
      durationMs={60_000}
      gasCost={gasCost}
      bridgeFee={bridgeFee}
      routeTools={routeTools}
      routeSteps={routeSteps}
      isLoadingGasEstimate={false}
      selected={false}
      onSelectedRouteClick={vi.fn()}
    />,
  );
}

describe('Route', () => {
  it('shows the gas USD total instead of joining token amounts', () => {
    renderRoute({
      gasCost: [
        {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
        },
        {
          amount: utils.parseUnits('1', 6).toString(),
          token: usdcToken,
          amountUSD: '1',
        },
      ],
    });

    const routeGas = screen.getByLabelText('Route gas');

    expect(routeGas.textContent).toBe('~$3 USD');
    expect(routeGas.textContent).not.toContain('ETH and');
    expect(routeGas.textContent).not.toContain('USDC');
  });

  it('shows the bridge fee USD total instead of joining token amounts', () => {
    renderRoute({
      gasCost: [
        {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
        },
      ],
      bridgeFee: [
        {
          amount: utils.parseEther('0.002').toString(),
          token: ethToken,
          amountUSD: '4',
        },
        {
          amount: utils.parseUnits('2', 6).toString(),
          token: usdcToken,
          amountUSD: '2',
        },
      ],
    });

    const routeBridgeFee = screen.getByLabelText('Route bridge fee');

    expect(routeBridgeFee.textContent).toBe('~$6 USD');
    expect(routeBridgeFee.textContent).not.toContain('ETH and');
    expect(routeBridgeFee.textContent).not.toContain('USDC');
  });

  it('shows all route tools and renders step details in the route tooltip', () => {
    renderRoute({
      gasCost: [
        {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
        },
      ],
      routeTools: [
        {
          id: 'across',
          name: 'Across',
          iconURI: 'https://example.com/across.png',
        },
        {
          id: 'fly',
          name: 'Fly',
          iconURI: 'https://example.com/fly.png',
        },
      ],
      routeSteps: [
        {
          id: 'bridge-step',
          label: 'Bridge from Arbitrum One (USDC) to Robinhood (USDC)',
          via: 'Relay',
          iconURI: 'https://example.com/relay.png',
          fromAmount: utils.parseUnits('100', 6).toString(),
          fromToken: usdcToken,
          toAmount: utils.parseUnits('100', 6).toString(),
          toToken: usdcToken,
        },
        {
          id: 'swap-step',
          label: 'Swap Robinhood (USDC) to Robinhood (SpaceX)',
          via: 'Fly',
          iconURI: 'https://example.com/fly.png',
          fromAmount: utils.parseUnits('100', 6).toString(),
          fromToken: usdcToken,
          toAmount: utils.parseUnits('3323.23', 6).toString(),
          toToken: {
            address: '0x0000000000000000000000000000000000000002',
            decimals: 6,
            logoURI: '',
            symbol: 'SpaceX',
          },
        },
      ],
    });

    const routeTools = screen.getByLabelText('Route tools: Across, Fly');
    expect(routeTools.textContent).toBe('via+');
    expect(routeTools.textContent).not.toContain('Across');
    expect(routeTools.textContent).not.toContain('Fly');
    expect(screen.getByText('ROUTE')).toBeDefined();
    expect(screen.getByText('Bridge from Arbitrum One (USDC) to Robinhood (USDC)')).toBeDefined();
    expect(screen.getByText('via Relay')).toBeDefined();
    expect(screen.getByText('100 USDC → 100 USDC')).toBeDefined();
    expect(screen.getByText('Swap Robinhood (USDC) to Robinhood (SpaceX)')).toBeDefined();
    expect(screen.getByText('via Fly')).toBeDefined();
    expect(screen.getByText('100 USDC → 3,323.23 SpaceX')).toBeDefined();
  });

  it('does not show a tooltip total when a breakdown item has unknown USD value', () => {
    renderRoute({
      gasCost: [
        {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
          details: {
            id: 'known-gas',
            label: 'Known gas fee',
            via: 'Relay',
          },
        },
        {
          amount: utils.parseUnits('1', 6).toString(),
          token: usdcToken,
          details: {
            id: 'unknown-gas',
            label: 'Unknown gas fee',
            via: 'Fly',
          },
        },
      ],
    });

    expect(screen.getByText('Known gas fee')).toBeDefined();
    expect(screen.getByText('Unknown gas fee')).toBeDefined();
    expect(screen.queryByText('Total cost')).toBeNull();
  });

  it('uses token-list prices in route fee breakdown tooltips', () => {
    tokenSearchUtilsMock.tokensFromLists = {
      [usdcToken.address.toLowerCase()]: { priceUSD: 1 },
    };

    renderRoute({
      gasCost: [
        {
          amount: utils.parseUnits('2', 6).toString(),
          token: usdcToken,
          details: {
            id: 'usdc-gas',
            label: 'USDC gas fee',
            via: 'Relay',
          },
        },
      ],
    });

    expect(screen.getByLabelText('Route gas').textContent).toBe('~$2 USD');
    expect(screen.getByText('2 USDC (~$2)')).toBeDefined();
    expect(screen.getByText('Total cost')).toBeDefined();
  });
});
