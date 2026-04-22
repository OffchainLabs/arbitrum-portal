import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import {
  getBridgeTokenChildChainAddress,
  isApeChainEthDestinationSelection,
  isApeChainEthSelection,
} from '../BridgeTokenAddressUtils';
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

describe('isApeChainEthSelection', () => {
  it('treats zero-address selections on ApeChain routes as the ETH/WETH path', () => {
    expect(
      isApeChainEthSelection({
        tokenAddress: '0x0000000000000000000000000000000000000000',
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ApeChain,
      }),
    ).toBe(true);
  });

  it('does not treat zero-address selections on non-ApeChain routes as the ApeChain ETH path', () => {
    expect(
      isApeChainEthSelection({
        tokenAddress: '0x0000000000000000000000000000000000000000',
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
      }),
    ).toBe(false);
  });
});

describe('isApeChainEthDestinationSelection', () => {
  it('normalizes manual ApeChain WETH destination selections to the zero-address ETH query token', () => {
    expect(
      isApeChainEthDestinationSelection(
        {
          address: CommonAddress.ArbitrumOne.WETH,
          l2Address: CommonAddress.ApeChain.WETH,
        },
        ChainId.ApeChain,
      ),
    ).toBe(true);
  });

  it('keeps non-ApeChain destination token selections unchanged', () => {
    expect(
      isApeChainEthDestinationSelection(
        {
          address: CommonAddress.ArbitrumOne.WETH,
          l2Address: CommonAddress.ArbitrumOne.WETH,
        },
        ChainId.ArbitrumOne,
      ),
    ).toBe(false);
  });
});
