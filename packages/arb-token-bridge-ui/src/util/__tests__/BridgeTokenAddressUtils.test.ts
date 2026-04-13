import { describe, expect, it } from 'vitest';

import { getBridgeTokenChildChainAddress } from '../BridgeTokenAddressUtils';
import { CommonAddress } from '../CommonAddressUtils';

describe('getBridgeTokenChildChainAddress', () => {
  it('prefers l2Address when present', () => {
    expect(
      getBridgeTokenChildChainAddress({
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e'],
      }),
    ).toBe(CommonAddress.ArbitrumOne['USDC.e']);
  });

  it('returns undefined when the child-chain address is not explicitly known', () => {
    expect(
      getBridgeTokenChildChainAddress({
        address: CommonAddress.ApeChain.WETH,
      }),
    ).toBeUndefined();
  });
});
