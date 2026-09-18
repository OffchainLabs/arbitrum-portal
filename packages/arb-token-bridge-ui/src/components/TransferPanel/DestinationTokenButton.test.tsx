import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { constants } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { APE_TOKEN_LOGO, WETH_TOKEN_LOGO } from '../../constants';
import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useDestinationSelection } from '../../hooks/useDestinationToken';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { DestinationTokenButton } from './DestinationTokenButton';

const selection = vi.hoisted(() => ({ destinationToken: undefined as string | undefined }));

vi.mock('../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [selection],
}));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: { id: ChainId.RobinhoodChain },
      destinationChain: { id: ChainId.ApeChain },
    },
  ],
}));
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({ isDepositMode: true, childChainProvider: {} }),
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

describe.sequential('DestinationTokenButton on Robinhood to ApeChain', () => {
  afterEach(cleanup);

  it.each([
    {
      name: 'USDG to default native APE',
      sourceToken: usdg,
      destinationToken: undefined,
      symbol: 'APE',
      logo: APE_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
    {
      name: 'USDG to explicitly selected WETH',
      sourceToken: usdg,
      destinationToken: constants.AddressZero,
      symbol: 'WETH',
      logo: WETH_TOKEN_LOGO,
      quoteAddress: CommonAddress.ApeChain.WETH,
    },
    {
      name: 'default APE transfer',
      sourceToken: null,
      destinationToken: undefined,
      symbol: 'APE',
      logo: APE_TOKEN_LOGO,
      quoteAddress: constants.AddressZero,
    },
  ])(
    'matches the quoted asset for $name',
    ({ sourceToken, destinationToken, symbol, logo, quoteAddress }) => {
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
