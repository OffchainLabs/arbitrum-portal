import { CoinKey, ChainId as LiFiChainId } from '@lifi/sdk';
import { describe, expect, it } from 'vitest';

import { ETHEREUM_PYUSD_LOGO_URI } from '@/bridge/util/PyusdUtils';

import { type LifiTokenWithCoinKey, assignLogoURI } from '../registry';

function buildToken(chainId = LiFiChainId.ETH): LifiTokenWithCoinKey {
  return {
    address: '0x0000000000000000000000000000000000000001',
    chainId,
    coinKey: 'PYUSD' as CoinKey,
    decimals: 6,
    logoURI: 'https://example.com/wrong.png',
    name: 'PayPal USD',
    priceUSD: '1',
    symbol: 'PYUSD',
  };
}

describe('assignLogoURI', () => {
  it('uses the Ethereum PayPal USD logo on Ethereum', () => {
    expect(assignLogoURI(buildToken()).logoURI).toBe(ETHEREUM_PYUSD_LOGO_URI);
  });

  it('uses the Ethereum PayPal USD logo on Arbitrum One', () => {
    expect(assignLogoURI(buildToken(LiFiChainId.ARB)).logoURI).toBe(ETHEREUM_PYUSD_LOGO_URI);
  });
});
