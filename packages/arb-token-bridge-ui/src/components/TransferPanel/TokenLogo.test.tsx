import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { nativeCurrencyEther } from '../../services/evm/nativeCurrency';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import type { SafeImageProps } from '../common/SafeImage';
import { TokenLogo } from './TokenLogo';

vi.mock('../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
vi.mock('../../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});
vi.mock('../common/SafeImage', () => ({
  SafeImage: ({ src }: SafeImageProps) => <img src={src} alt="" data-testid="logo" />,
}));

afterEach(cleanup);

describe.sequential('TokenLogo', () => {
  it.each([
    [false, '/images/Solana.svg'],
    [true, nativeCurrencyEther.logoUrl],
  ])(
    'falls back to the native currency of its side on Solana to Arbitrum One, isDestination=%s',
    async (isDestination, logoUrl) => {
      render(<TokenLogo srcOverride={null} isDestination={isDestination} />, {
        wrapper: createBridgeTestWrapper({
          query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
        }),
      });
      await waitFor(() => expect(screen.getByTestId('logo').getAttribute('src')).toBe(logoUrl));
    },
  );
});
