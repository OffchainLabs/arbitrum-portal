import { cleanup, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { constants, utils } from 'ethers';
import type { Key } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RouteCost } from '../../../app/api/crosschain-transfers/types';
import type { RouteTool } from '../../../app/api/crosschain-transfers/types';
import { createBridgeTestWrapper } from '../../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { Route, RouteStep } from './Route';

dayjs.extend(relativeTime);

afterEach(cleanup);

vi.mock('@/app/components/common/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
    <>
      {children}
      <div data-testid="tooltip-content">{content}</div>
    </>
  ),
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

function createRouteCost(
  id: string,
  cost: Omit<RouteCost, 'details' | 'chainId'> & { chainId?: number },
): RouteCost {
  return {
    chainId: ChainId.Ethereum,
    ...cost,
    details: {
      id,
      label: 'Test cost',
      via: 'Test Bridge',
    },
  };
}

function renderRoute({
  bridgeFee = [],
  gasCost,
  routeTools,
  routeSteps,
  sourceChain = ChainId.Ethereum,
  destinationChain = ChainId.ArbitrumOne,
  cacheEntries = [],
}: {
  sourceChain?: ChainId;
  destinationChain?: ChainId;
  cacheEntries?: ReadonlyArray<readonly [Key, unknown]>;
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
    {
      wrapper: createBridgeTestWrapper({ query: { sourceChain, destinationChain }, cacheEntries }),
    },
  );
}

describe.sequential('Route', () => {
  it('shows the gas USD total instead of joining token amounts', () => {
    renderRoute({
      gasCost: [
        createRouteCost('eth-gas', {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
        }),
        createRouteCost('usdc-gas', {
          amount: utils.parseUnits('1', 6).toString(),
          token: usdcToken,
          amountUSD: '1',
        }),
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
        createRouteCost('eth-gas', {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
        }),
      ],
      bridgeFee: [
        createRouteCost('eth-fee', {
          amount: utils.parseEther('0.002').toString(),
          token: ethToken,
          amountUSD: '4',
        }),
        createRouteCost('usdc-fee', {
          amount: utils.parseUnits('2', 6).toString(),
          token: usdcToken,
          amountUSD: '2',
        }),
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
        createRouteCost('eth-gas', {
          amount: utils.parseEther('0.001').toString(),
          token: ethToken,
          amountUSD: '2',
        }),
      ],
      routeTools: [
        {
          key: 'across',
          name: 'Across',
          logoURI: 'https://example.com/across.png',
        },
        {
          key: 'fly',
          name: 'Fly',
          logoURI: 'https://example.com/fly.png',
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
          chainId: ChainId.Ethereum,
          details: {
            id: 'known-gas',
            label: 'Known gas fee',
            via: 'Relay',
          },
        },
        {
          amount: utils.parseUnits('1', 6).toString(),
          token: usdcToken,
          chainId: ChainId.Ethereum,
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
    renderRoute({
      cacheEntries: [
        [
          [[], ChainId.Ethereum, ChainId.ArbitrumOne, 'useTokensFromLists'],
          { [usdcToken.address.toLowerCase()]: { priceUSD: 1 } },
        ],
      ],
      gasCost: [
        {
          amount: utils.parseUnits('2', 6).toString(),
          token: usdcToken,
          chainId: ChainId.Ethereum,
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

  it('does not show USD values in testnet fee breakdown tooltips', () => {
    renderRoute({
      sourceChain: ChainId.Sepolia,
      destinationChain: ChainId.ArbitrumSepolia,
      gasCost: [
        createRouteCost('testnet-gas', {
          amount: utils.parseEther('0.001').toString(),
          amountUSD: '2',
          token: ethToken,
        }),
      ],
    });

    expect(screen.getByLabelText('Route gas').textContent).toBe('0.001 ETH');
    expect(screen.getAllByText('0.001 ETH')).toHaveLength(2);
    expect(screen.queryByText(/\$2/)).toBeNull();
    expect(screen.queryByText('Total cost')).toBeNull();
  });

  it('does not price another chain native token as ETH', () => {
    renderRoute({
      cacheEntries: [
        [
          [ChainId.ApeChain, ChainId.Ethereum, 'nativeCurrency'],
          {
            name: 'ApeCoin',
            symbol: 'APE',
            decimals: 18,
            isCustom: true,
            address: CommonAddress.Ethereum.APE,
          },
        ],
      ],
      gasCost: [
        createRouteCost('ape-gas', {
          amount: utils.parseEther('1').toString(),
          chainId: ChainId.ApeChain,
          token: { ...ethToken, symbol: 'APE' },
        }),
      ],
    });

    expect(screen.getByLabelText('Route gas').textContent).toBe('1 APE');
    expect(screen.getAllByText('1 APE')).toHaveLength(2);
    expect(screen.queryByText('1 APE (~$2,000)')).toBeNull();
  });
});
