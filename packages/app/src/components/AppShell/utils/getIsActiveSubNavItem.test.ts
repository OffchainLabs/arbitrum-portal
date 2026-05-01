import { describe, expect, it } from 'vitest';

import type { SubNavItem } from '../config/navConfig';
import { getIsActiveSubNavItem } from './getIsActiveSubNavItem';

const bridgeItem: SubNavItem = {
  label: 'Bridge',
  href: '/bridge',
  imgSrc: '/icons/navigation/bridge.svg',
};

const txHistoryItem: SubNavItem = {
  label: 'Txns',
  href: '/bridge/tx-history',
  imgSrc: '/icons/navigation/transactions.svg',
};

const buyItem: SubNavItem = {
  label: 'Buy',
  href: '/bridge/buy',
  imgSrc: '/icons/navigation/buy.svg',
};

describe('getIsActiveSubNavItem', () => {
  describe('bridge subnav', () => {
    it('marks Bridge item active only on exact /bridge pathname', () => {
      expect(getIsActiveSubNavItem(bridgeItem, '/bridge', '/bridge')).toBe(true);
      expect(getIsActiveSubNavItem(bridgeItem, '/bridge', '/bridge/tx-history')).toBe(false);
      expect(getIsActiveSubNavItem(bridgeItem, '/bridge', '/bridge/buy')).toBe(false);
      expect(getIsActiveSubNavItem(bridgeItem, '/bridge', '/bridge/buy/moonpay')).toBe(false);
    });

    it('marks Txns item active on /bridge/tx-history and its subpaths', () => {
      expect(getIsActiveSubNavItem(txHistoryItem, '/bridge', '/bridge/tx-history')).toBe(true);
      expect(getIsActiveSubNavItem(txHistoryItem, '/bridge', '/bridge/tx-history/')).toBe(true);
      expect(getIsActiveSubNavItem(txHistoryItem, '/bridge', '/bridge/tx-history/0xabc')).toBe(
        true,
      );
    });

    it('does not mark Txns item active on /bridge or /bridge/buy', () => {
      expect(getIsActiveSubNavItem(txHistoryItem, '/bridge', '/bridge')).toBe(false);
      expect(getIsActiveSubNavItem(txHistoryItem, '/bridge', '/bridge/buy')).toBe(false);
    });

    it('marks Buy item active on /bridge/buy and its subpaths', () => {
      expect(getIsActiveSubNavItem(buyItem, '/bridge', '/bridge/buy')).toBe(true);
      expect(getIsActiveSubNavItem(buyItem, '/bridge', '/bridge/buy/moonpay')).toBe(true);
    });

    it('does not mark Buy item active on /bridge or /bridge/tx-history', () => {
      expect(getIsActiveSubNavItem(buyItem, '/bridge', '/bridge')).toBe(false);
      expect(getIsActiveSubNavItem(buyItem, '/bridge', '/bridge/tx-history')).toBe(false);
    });

    it('ignores legacy ?tab=tx_history query when matching subnav items', () => {
      // The legacy tab query is handled by middleware redirect, so the active
      // subnav item is determined purely by pathname.
      expect(getIsActiveSubNavItem(bridgeItem, '/bridge', '/bridge')).toBe(true);
      expect(getIsActiveSubNavItem(txHistoryItem, '/bridge', '/bridge')).toBe(false);
    });
  });

  it('returns false for external items regardless of pathname', () => {
    const externalItem: SubNavItem = {
      label: 'Help',
      href: 'https://support.arbitrum.io',
      imgSrc: '/icons/navigation/help.svg',
      external: true,
    };
    expect(getIsActiveSubNavItem(externalItem, '/build', '/build')).toBe(false);
  });
});
