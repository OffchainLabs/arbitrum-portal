import { describe, expect, it } from 'vitest';

import { CommonAddress } from '../CommonAddressUtils';
import {
  PYUSD_BLACK_LOGO_URI,
  PYUSD_BLUE_LOGO_URI,
  getArbitrumOnePyusdCanonicalToken,
  getArbitrumOnePyusdToken,
  getPyusdTokenForTransfer,
  getPyusdTokenOverride,
  isPyusdOverrideFlow,
  isTokenArbitrumOnePyusdCanonical,
} from '../PyusdUtils';

describe('getPyusdTokenOverride', () => {
  it('returns the default Ethereum to Arbitrum One PYUSD override', () => {
    expect(
      getPyusdTokenOverride({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: true,
      }),
    ).toMatchObject({
      source: { address: CommonAddress.Ethereum.PYUSD },
      destination: {
        address: CommonAddress.Ethereum.PYUSD,
        l2Address: CommonAddress.ArbitrumOne.PYUSD,
      },
    });
  });

  it('overrides canonical withdrawals to black-logo L1 PayPal USD on destination', () => {
    expect(
      getPyusdTokenOverride({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSDCanonical,
        isDepositMode: false,
      }),
    ).toMatchObject({
      source: {
        address: CommonAddress.ArbitrumOne.PYUSDCanonical,
        logoURI: PYUSD_BLUE_LOGO_URI,
      },
      destination: { address: CommonAddress.Ethereum.PYUSD, logoURI: PYUSD_BLACK_LOGO_URI },
    });
  });
});

describe('getPyusdTokenForTransfer', () => {
  it('uses black branding for official PayPal USD and blue branding for explicit canonical PayPal USD', () => {
    expect(getArbitrumOnePyusdToken().logoURI).toBe(PYUSD_BLACK_LOGO_URI);
    expect(getArbitrumOnePyusdCanonicalToken().logoURI).toBe(PYUSD_BLUE_LOGO_URI);
  });

  it('keeps the L1 lookup address and Arbitrum One child-chain address explicit', () => {
    expect(getArbitrumOnePyusdToken()).toMatchObject({
      address: CommonAddress.Ethereum.PYUSD,
      l2Address: CommonAddress.ArbitrumOne.PYUSD,
      name: 'PayPal USD',
    });
  });

  it('defaults Arbitrum One to Ethereum PayPal USD withdrawals to official PayPal USD', () => {
    expect(
      getPyusdTokenForTransfer({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: false,
      }),
    ).toMatchObject({
      address: CommonAddress.Ethereum.PYUSD,
      l2Address: CommonAddress.ArbitrumOne.PYUSD,
      destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
    });
  });

  it('keeps canonical PayPal USD explicit when the canonical address is selected', () => {
    expect(
      getPyusdTokenForTransfer({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSDCanonical,
        isDepositMode: false,
      }),
    ).toMatchObject({
      address: CommonAddress.ArbitrumOne.PYUSDCanonical,
      destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
    });
  });

  it('ignores Arbitrum-side PayPal USD addresses in deposit mode', () => {
    expect(
      getPyusdTokenForTransfer({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSDCanonical,
        isDepositMode: true,
      }),
    ).toBeNull();

    expect(
      getPyusdTokenForTransfer({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSD,
        isDepositMode: true,
      }),
    ).toBeNull();
  });
});

describe('isPyusdOverrideFlow', () => {
  it('returns true for the default LiFi-backed PayPal USD flows', () => {
    expect(
      isPyusdOverrideFlow({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: true,
      }),
    ).toBe(true);

    expect(
      isPyusdOverrideFlow({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSD,
        isDepositMode: false,
      }),
    ).toBe(true);
  });

  it('returns false for non-canonical PYUSD withdrawal addresses', () => {
    expect(
      isPyusdOverrideFlow({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSDCanonical,
        isDepositMode: false,
      }),
    ).toBe(false);

    expect(
      isPyusdOverrideFlow({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: false,
      }),
    ).toBe(true);
  });
});

describe('isTokenArbitrumOnePyusdCanonical', () => {
  it('only matches the explicit canonical Arbitrum One address', () => {
    expect(isTokenArbitrumOnePyusdCanonical(CommonAddress.ArbitrumOne.PYUSDCanonical)).toBe(true);
    expect(isTokenArbitrumOnePyusdCanonical(CommonAddress.Ethereum.PYUSD)).toBe(false);
  });
});
