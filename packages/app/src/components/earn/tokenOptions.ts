import { constants } from 'ethers';

import { ARB_USDC_LOGO_URL, ARB_USDT_LOGO_URL } from '@/app-lib/earn/constants';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

export type EarnTokenOption = {
  symbol: string;
  address: string;
  decimals: number;
  logoUrl: string;
};

export const ETH_LOGO_URL =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png';
export const ARB_LOGO_URL =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png';

export const ETH_TOKEN_OPTION: EarnTokenOption = {
  symbol: 'ETH',
  address: constants.AddressZero,
  decimals: 18,
  logoUrl: ETH_LOGO_URL,
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
  logoUrl: ARB_LOGO_URL,
};
