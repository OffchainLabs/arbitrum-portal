/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import { isWithdrawOnlyToken } from '../WithdrawOnlyUtils';

const networkTestTimeout = 10000;

describe('isWithdrawOnlyToken', () => {
  const orbitChainId = 660279; // Xai

  it('should allow deposits for a standard token', async () => {
    const result = await isWithdrawOnlyToken({
      parentChainErc20Address: '0x1234567890123456789012345678901234567890',
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(result).toBe(false);
  });

  it('should block deposits for a token in the withdraw-only list', async () => {
    const result = await isWithdrawOnlyToken({
      parentChainErc20Address: '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3', // MIM on Arbitrum One
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(result).toBe(true);
  });

  it('should block deposits for USDC.e on an Orbit chain', async () => {
    const result = await isWithdrawOnlyToken({
      parentChainErc20Address: CommonAddress.ArbitrumOne['USDC.e'],
      parentChainId: ChainId.ArbitrumOne,
      childChainId: orbitChainId,
    });
    expect(result).toBe(true);
  });

  it('should allow deposits for USDC.e on a non-Orbit chain', async () => {
    const result = await isWithdrawOnlyToken({
      parentChainErc20Address: CommonAddress.ArbitrumOne['USDC.e'],
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
    });
    expect(result).toBe(false);
  });

  it(
    'should block deposits for ENA token (has OFT on both Ethereum and Arbitrum)',
    async () => {
      const result = await isWithdrawOnlyToken({
        parentChainErc20Address: '0x57e114b691db790c35207b2e685d4a43181e6061', // ENA innerTokenAddress on Ethereum
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
      });
      expect(result).toBe(true);
    },
    { timeout: networkTestTimeout },
  );

  it(
    'should allow deposits for DAI token (has OFT only on Ethereum, not on Arbitrum)',
    async () => {
      const result = await isWithdrawOnlyToken({
        parentChainErc20Address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI innerTokenAddress on Ethereum
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
      });
      expect(result).toBe(false);
    },
    { timeout: networkTestTimeout },
  );

  it(
    'should allow deposits for ARB token (no OFT implementation)',
    async () => {
      const result = await isWithdrawOnlyToken({
        parentChainErc20Address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', // ARB token on Ethereum
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
      });
      expect(result).toBe(false);
    },
    { timeout: networkTestTimeout },
  );

  it(
    'should allow deposits for USDT as a special case',
    async () => {
      const usdtAddress = CommonAddress.Ethereum.USDT;

      const result = await isWithdrawOnlyToken({
        parentChainErc20Address: usdtAddress,
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
      });
      expect(result).toBe(false);
    },
    { timeout: networkTestTimeout },
  );

  it(
    'should allow deposits for a token not in LayerZero metadata',
    async () => {
      const result = await isWithdrawOnlyToken({
        parentChainErc20Address: '0x9876543210987654321098765432109876543210',
        parentChainId: ChainId.Ethereum,
        childChainId: ChainId.ArbitrumOne,
      });
      expect(result).toBe(false);
    },
    { timeout: networkTestTimeout },
  );
});
