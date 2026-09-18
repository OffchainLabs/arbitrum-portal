import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { useHistoryDisclaimer } from '../../hooks/useHistoryDisclaimer';
import { TransactionHistoryDisclaimer } from './TransactionHistoryDisclaimer';

vi.mock('../../hooks/useHistoryDisclaimer', () => ({ useHistoryDisclaimer: vi.fn() }));

describe('TransactionHistoryDisclaimer', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    'renders service decisions without a wallet SDK: LiFi=%s OFT=%s',
    (showLifiDisclaimer, showOftDisclaimer) => {
      vi.mocked(useHistoryDisclaimer).mockReturnValue({
        showLifiDisclaimer,
        showOftDisclaimer,
        arbiscanUrl: 'https://arbiscan.io/address/test',
        etherscanUrl: 'https://etherscan.io/address/test',
      });
      const html = renderToStaticMarkup(<TransactionHistoryDisclaimer />);
      expect(html.includes('LiFi transactions')).toBe(showLifiDisclaimer);
      expect(html.includes('LayerZero USDT')).toBe(showOftDisclaimer);
      if (!showLifiDisclaimer && !showOftDisclaimer) expect(html).toBe('');
    },
  );
});
