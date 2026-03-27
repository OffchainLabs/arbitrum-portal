import { describe, expect, it } from 'vitest';

import { CommonAddress } from '../CommonAddressUtils';
import {
  ARBITRUM_ONE_PYUSD_OFT_LOGO_URI,
  ETHEREUM_PYUSD_LOGO_URI,
  getArbitrumOnePyusdCanonicalToken,
  getArbitrumOnePyusdOftToken,
  getPyusdTokenForTransfer,
  getPyusdTokenOverride,
  isPyusdOverrideFlow,
  isTokenArbitrumOnePyusdCanonical,
} from '../PyusdUtils';

describe('getPyusdTokenOverride', () => {
  it('returns the default Ethereum to Arbitrum One OFT override', () => {
    expect(
      getPyusdTokenOverride({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: true,
      }),
    ).toMatchObject({
      source: { address: CommonAddress.Ethereum.PYUSD },
      destination: { address: CommonAddress.ArbitrumOne.PYUSDOFT },
    });
  });

  it('overrides canonical withdrawals to black-logo L1 PYUSD on destination', () => {
    expect(
      getPyusdTokenOverride({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSDCanonical,
        isDepositMode: false,
      }),
    ).toMatchObject({
      source: {
        address: CommonAddress.ArbitrumOne.PYUSDCanonical,
        logoURI: ARBITRUM_ONE_PYUSD_OFT_LOGO_URI,
      },
      destination: { address: CommonAddress.Ethereum.PYUSD, logoURI: ETHEREUM_PYUSD_LOGO_URI },
    });
  });
});

describe('getPyusdTokenForTransfer', () => {
  it('uses black branding for OFT and blue branding for explicit canonical PYUSD', () => {
    expect(getArbitrumOnePyusdOftToken().logoURI).toBe(ETHEREUM_PYUSD_LOGO_URI);
    expect(getArbitrumOnePyusdCanonicalToken().logoURI).toBe(ARBITRUM_ONE_PYUSD_OFT_LOGO_URI);
  });

  it('defaults Arbitrum One to Ethereum PYUSD withdrawals to OFT', () => {
    expect(
      getPyusdTokenForTransfer({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: false,
      }),
    ).toMatchObject({
      address: CommonAddress.ArbitrumOne.PYUSDOFT,
      destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
    });
  });

  it('keeps canonical PYUSD explicit when the canonical address is selected', () => {
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
});

describe('isPyusdOverrideFlow', () => {
  it('returns true for the default LiFi-backed PYUSD flows', () => {
    expect(
      isPyusdOverrideFlow({
        tokenAddress: CommonAddress.Ethereum.PYUSD,
        isDepositMode: true,
      }),
    ).toBe(true);

    expect(
      isPyusdOverrideFlow({
        tokenAddress: CommonAddress.ArbitrumOne.PYUSDOFT,
        isDepositMode: false,
      }),
    ).toBe(true);
  });

  it('returns false for non-OFT withdrawal addresses', () => {
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
    ).toBe(false);
  });
});

describe('isTokenArbitrumOnePyusdCanonical', () => {
  it('only matches the explicit canonical Arbitrum One address', () => {
    expect(isTokenArbitrumOnePyusdCanonical(CommonAddress.ArbitrumOne.PYUSDCanonical)).toBe(true);
    expect(isTokenArbitrumOnePyusdCanonical(CommonAddress.Ethereum.PYUSD)).toBe(false);
  });
});
