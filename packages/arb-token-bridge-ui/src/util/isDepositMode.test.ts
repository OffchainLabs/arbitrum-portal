import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { isDepositMode } from './isDepositMode';

describe('isDepositMode', () => {
  it('treats Robinhood Chain to ApeChain as a deposit', () => {
    expect(
      isDepositMode({
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.ApeChain,
      }),
    ).toBe(true);
  });

  it('treats ApeChain to Robinhood Chain as a withdrawal', () => {
    expect(
      isDepositMode({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.RobinhoodChain,
      }),
    ).toBe(false);
  });
});
