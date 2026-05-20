// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EarnErrorDisplay } from './EarnErrorDisplay';

describe('EarnErrorDisplay', () => {
  it('renders nothing when error is null or undefined', () => {
    const { container: nullContainer } = render(<EarnErrorDisplay error={null} />);
    expect(nullContainer.firstChild).toBe(null);

    const { container: undefContainer } = render(<EarnErrorDisplay error={undefined} />);
    expect(undefContainer.firstChild).toBe(null);
  });

  it('renders a sanitized message for a verbose viem-style error', () => {
    const verbose =
      'User rejected the request. Request Arguments: chain: undefined (id: 42161) Version: viem@2.47.4';
    render(<EarnErrorDisplay error={new Error(verbose)} />);
    expect(screen.getByText('Transaction rejected.')).toBeTruthy();
  });

  it('renders an actionable message for HTTP failures', () => {
    render(<EarnErrorDisplay error={new Error('HTTP request failed. URL: https://example')} />);
    expect(screen.getByText('Network error. Please try again.')).toBeTruthy();
  });

  it('passes plain string errors through the sanitizer', () => {
    render(<EarnErrorDisplay error="too many requests" />);
    expect(screen.getByText('Network is busy. Please try again in a moment.')).toBeTruthy();
  });
});
