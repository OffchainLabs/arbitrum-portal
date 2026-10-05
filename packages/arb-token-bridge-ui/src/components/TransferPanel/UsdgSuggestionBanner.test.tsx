import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UsdgSuggestionBanner } from './UsdgSuggestionBanner';
import { useUsdgSuggestion } from './hooks/useUsdgSuggestion';

vi.mock('./hooks/useUsdgSuggestion', () => ({ useUsdgSuggestion: vi.fn() }));

// the integration tests look the banner up by this accessible name
const BANNER_NAME = 'USDG suggestion';

function mockSuggestion(overrides: Partial<ReturnType<typeof useUsdgSuggestion>> = {}) {
  const suggestion = {
    isVisible: true,
    destinationSymbol: 'USDC',
    usdgLogoURI: undefined,
    switchToUsdg: vi.fn(),
    dismiss: vi.fn(),
    ...overrides,
  };
  vi.mocked(useUsdgSuggestion).mockReturnValue(suggestion);
  return suggestion;
}

function getBannerText() {
  return screen.getByRole('note', { name: BANNER_NAME }).textContent?.replace(/\s+/g, ' ') ?? '';
}

describe.sequential('UsdgSuggestionBanner', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing while the suggestion is hidden', () => {
    mockSuggestion({ isVisible: false });

    render(<UsdgSuggestionBanner />);

    expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
  });

  it('names the selected stablecoin in the copy', () => {
    mockSuggestion({ destinationSymbol: 'USDT' });

    render(<UsdgSuggestionBanner />);

    expect(getBannerText()).toContain(
      "USDG is Robinhood Chain's native stablecoin. Most Robinhood apps use USDG, not USDT.",
    );
  });

  it('drops the "not" clause when the destination symbol is unknown', () => {
    mockSuggestion({ destinationSymbol: undefined });

    render(<UsdgSuggestionBanner />);

    expect(getBannerText()).toContain('Most Robinhood apps use USDG.');
    expect(getBannerText()).not.toContain(', not ');
  });

  it('wires the switch and dismiss buttons to the hook', () => {
    const { switchToUsdg, dismiss } = mockSuggestion();

    render(<UsdgSuggestionBanner />);

    // the accessible name also carries the USDG logo (or its fallback), so match the label only
    fireEvent.click(screen.getByRole('button', { name: /Switch to USDG/ }));
    expect(switchToUsdg).toHaveBeenCalledTimes(1);
    expect(dismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss USDG suggestion' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(switchToUsdg).toHaveBeenCalledTimes(1);
  });
});
