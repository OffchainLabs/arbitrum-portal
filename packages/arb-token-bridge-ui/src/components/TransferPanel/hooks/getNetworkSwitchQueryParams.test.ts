import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { getNetworkSwitchQueryParams } from './getNetworkSwitchQueryParams';

describe('getNetworkSwitchQueryParams', () => {
  it('computes token and destinationToken against the switched chain pair', () => {
    const result = getNetworkSwitchQueryParams({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
      disableTransfersToNonArbitrumChains: false,
      selectedTokenAddressAfterSwitch: CommonAddress.ArbitrumOne.PYUSD,
    });

    expect(result).toEqual({
      sourceChain: ChainId.ArbitrumOne,
      destinationChain: ChainId.Ethereum,
      token: CommonAddress.ArbitrumOne.PYUSD,
      destinationToken: CommonAddress.Ethereum.PYUSD,
    });
  });
});
