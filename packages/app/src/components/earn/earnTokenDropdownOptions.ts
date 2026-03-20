import { constants } from 'ethers';

import { ARB_USDC_LOGO_URL, ARB_USDT_LOGO_URL } from '@/app-lib/earn/constants';
import { ARBITRUM_LOGO, ETHER_TOKEN_LOGO } from '@/bridge/constants';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

export type EarnTokenOption = {
  symbol: string;
  address: string;
  decimals: number;
  logoUrl: string;
};

export const ETH_TOKEN_OPTION: EarnTokenOption = {
  symbol: 'ETH',
  address: constants.AddressZero,
  decimals: 18,
  logoUrl: ETHER_TOKEN_LOGO,
};
export const USDC_TOKEN_OPTION: EarnTokenOption = {
  symbol: 'USDC',
  address: CommonAddress.ArbitrumOne.USDC,
  decimals: 6,
  logoUrl: ARB_USDC_LOGO_URL,
};
export const USDT_TOKEN_OPTION: EarnTokenOption = {
  symbol: 'USDT',
  address: CommonAddress.ArbitrumOne.USDT,
  decimals: 6,
  logoUrl: ARB_USDT_LOGO_URL,
};
export const ARB_TOKEN_OPTION: EarnTokenOption = {
  symbol: 'ARB',
  address: CommonAddress.ArbitrumOne.ARB,
  decimals: 18,
  logoUrl: ARBITRUM_LOGO,
};
