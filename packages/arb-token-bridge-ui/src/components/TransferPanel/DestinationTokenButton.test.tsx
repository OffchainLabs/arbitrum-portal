import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { constants } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { APE_TOKEN_LOGO, ETHER_TOKEN_LOGO, WETH_TOKEN_LOGO } from '../../constants';
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useDestinationSelection } from '../../hooks/useDestinationToken';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { DestinationTokenButton } from './DestinationTokenButton';

const selection = vi.hoisted(() => ({ destinationToken: undefined as string | undefined }));
const route = vi.hoisted(() => ({ isOutbound: false }));

vi.mock('../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [selection],
}));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: { id: route.isOutbound ? ChainId.ApeChain : ChainId.RobinhoodChain },
      destinationChain: { id: route.isOutbound ? ChainId.RobinhoodChain : ChainId.ApeChain },
    },
  ],
}));
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({ isDepositMode: !route.isOutbound, childChainProvider: {} }),
}));
vi.mock('../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: () => ({ symbol: 'APE', logoUrl: APE_TOKEN_LOGO }),
}));
vi.mock('../../hooks/useSelectedToken', () => ({ useSelectedToken: vi.fn() }));
vi.mock('../../state', () => ({
  useAppState: () => ({ app: { arbTokenBridge: { bridgeTokens: {} } } }),
}));
vi.mock('./TokenSearchUtils', () => ({
  useTokensFromLists: () => ({ data: {} }),
}));
vi.mock('../common/Dialog2', () => ({
  useDialog2: () => [{}, vi.fn()],
  DialogWrapper: () => null,
}));
vi.mock('./TokenLogo', () => ({
  TokenLogo: ({ srcOverride }: { srcOverride?: string }) => (
    <span data-testid="token-logo" data-src={srcOverride} />
  ),
}));

const usdg: ERC20BridgeToken = {
  address: CommonAddress.RobinhoodChain.USDG,
  name: 'Global Dollar',
  symbol: 'USDG',
  decimals: 6,
  type: TokenType.ERC20,
  listIds: new Set(),
  lifiOnlyChainId: ChainId.RobinhoodChain,
};

const apeUsdc: ERC20BridgeToken = {
  ...usdg,
  address: CommonAddress.ApeChain.USDCe,
  l2Address: CommonAddress.ApeChain.USDCe,
  name: 'Bridged USDC',
  symbol: 'USDC.e',
  lifiOnlyChainId: ChainId.ApeChain,
};

describe.sequential('DestinationTokenButton on ApeChain routes', () => {
  afterEach(cleanup);

  it.each([
    {
      name: 'USDG to default native APE',
      isOutbound: false,
      sourceToken: usdg,
      destinationToken: undefined,
      symbol: 'APE',
      logo: APE_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
    {
      name: 'USDG to explicitly selected WETH',
      isOutbound: false,
      sourceToken: usdg,
      destinationToken: constants.AddressZero,
      symbol: 'WETH',
      logo: WETH_TOKEN_LOGO,
      quoteAddress: CommonAddress.ApeChain.WETH,
    },
    {
      name: 'default APE transfer',
      isOutbound: false,
      sourceToken: null,
      destinationToken: undefined,
      symbol: 'APE',
      logo: APE_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
    {
      name: 'unsupported saved USDG destination to native APE',
      isOutbound: false,
      sourceToken: usdg,
      destinationToken: usdg.address,
      symbol: 'APE',
      logo: APE_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
    {
      name: 'outbound default APE transfer',
      isOutbound: true,
      sourceToken: null,
      destinationToken: undefined,
      symbol: 'APE',
      logo: APE_TOKEN_LOGO,
      quoteAddress: CommonAddress.RobinhoodChain.APE,
    },
    {
      name: 'outbound explicitly selected ETH',
      isOutbound: true,
      sourceToken: null,
      destinationToken: constants.AddressZero,
      symbol: 'ETH',
      logo: ETHER_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
    {
      name: 'outbound unknown saved destination to native ETH',
      isOutbound: true,
      sourceToken: null,
      destinationToken: CommonAddress.Ethereum.USDC,
      symbol: 'ETH',
      logo: ETHER_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
    {
      name: 'outbound repeated source-only USDC destination to native ETH',
      isOutbound: true,
      sourceToken: apeUsdc,
      destinationToken: apeUsdc.address,
      symbol: 'ETH',
      logo: ETHER_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
  ])(
    'matches the quoted asset for $name',
    ({ isOutbound, sourceToken, destinationToken, symbol, logo, quoteAddress }) => {
      route.isOutbound = isOutbound;
      selection.destinationToken = destinationToken;
      vi.mocked(useSelectedToken).mockReturnValue([sourceToken, vi.fn()]);

      // Use the real hook and override policy for both the quote address and the button.
      const { result } = renderHook(useDestinationSelection);
      expect(result.current.destinationAddress).toBe(quoteAddress);

      render(<DestinationTokenButton />);
      expect(screen.getByRole('button', { name: 'Select Destination Token' }).textContent).toBe(
        symbol,
      );
      expect(screen.getByTestId('token-logo').getAttribute('data-src')).toBe(logo);
    },
  );
});
