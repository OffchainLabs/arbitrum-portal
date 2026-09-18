import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import {
  ARB_ONE_NATIVE_USDC_TOKEN,
  ARB_SEPOLIA_NATIVE_USDC_TOKEN,
} from '../../util/TokenSelectionUtils';
import type { SafeImageProps } from '../common/SafeImage';
import { TokenInfo } from './TokenInfo';

vi.mock('../../app/api/crosschain-transfers/utils', async (actual) => ({
  ...(await actual<typeof import('../../app/api/crosschain-transfers/utils')>()),
  getTokenOverride: vi.fn(() => ({ source: null, destination: null })),
}));
vi.mock('../common/SafeImage', () => ({
  SafeImage: ({ src, alt }: SafeImageProps) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);
describe.sequential('curated token logos', () => {
  beforeEach(() =>
    vi.mocked(getTokenOverride).mockReturnValue({ source: null, destination: null }),
  );
  const wrapper = createBridgeTestWrapper({
    query: { sourceChain: ChainId.ArbitrumOne, destinationChain: ChainId.Ethereum },
  });
  it.each([ARB_ONE_NATIVE_USDC_TOKEN, ARB_SEPOLIA_NATIVE_USDC_TOKEN])(
    'uses the native USDC logo before a stale list logo for $address',
    (nativeToken) => {
      render(<TokenInfo token={{ ...nativeToken, logoURI: '/stale.svg' }} />, { wrapper });
      expect(screen.getByRole('img').getAttribute('src')).toBe(nativeToken.logoURI);
    },
  );

  it('uses a configured override logo before the token list logo', () => {
    const sourceToken = { ...ARB_ONE_NATIVE_USDC_TOKEN, logoURI: '/stale.svg' };
    vi.mocked(getTokenOverride).mockReturnValue({
      source: { ...sourceToken, logoURI: '/override.svg' },
      destination: null,
    });
    render(<TokenInfo token={sourceToken} />, { wrapper });
    expect(screen.getByRole('img').getAttribute('src')).toBe('/override.svg');
  });
});
