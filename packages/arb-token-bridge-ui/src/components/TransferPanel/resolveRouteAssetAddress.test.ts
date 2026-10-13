import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { resolveNativeUsdcDestinationAddress } from './resolveRouteAssetAddress';

describe('resolveNativeUsdcDestinationAddress', () => {
  it('uses native USDC for a CCTP deposit instead of the canonical USDC.e mapping', () => {
    expect(
      resolveNativeUsdcDestinationAddress({
        destinationChainId: ChainId.ArbitrumOne,
        selectedRoute: 'cctp',
        selectedRouteContext: undefined,
      }),
    ).toBe(CommonAddress.ArbitrumOne.USDC);
  });

  it('uses the quoted destination asset for a LiFi route', () => {
    const quotedAddress = '0x1111111111111111111111111111111111111111';

    expect(
      resolveNativeUsdcDestinationAddress({
        destinationChainId: ChainId.ArbitrumOne,
        selectedRoute: 'lifi',
        selectedRouteContext: {
          toAmount: { token: { address: quotedAddress } },
        },
      }),
    ).toBe(quotedAddress);
  });
});
