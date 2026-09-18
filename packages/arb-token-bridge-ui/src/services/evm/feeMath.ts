import type { BigNumber } from 'ethers';

import { DEFAULT_GAS_PRICE_PERCENT_INCREASE } from '../../token-bridge-sdk/Erc20DepositStarter';
import { percentIncrease } from '../../token-bridge-sdk/utils';

export function getCanonicalChildGasPrice(price: BigNumber) {
  return percentIncrease(price, DEFAULT_GAS_PRICE_PERCENT_INCREASE);
}
