import { utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import { LayerZeroTransaction } from '../state/app/state';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import { AssetType } from './arbTokenBridge.types';
import { updateAdditionalLayerZeroData } from './useOftTransactionHistory';

// Runs against a real Ethereum mainnet USDT0 send, so the log lookup is exercised on a
// real receipt rather than a fixture. The tx carries a LayerZero fee as msg.value, which
// is what makes EIP-7708 prepend a protocol Transfer log to this receipt after Glamsterdam.
const USDT0_SEND_TX = '0xb7ccb326d0b383eea44343a60e6f0563c7a7e0a5d3b96696ea39bb7cf76fe3ad';
const USDT0_SEND_BLOCK = 25799541;
const USDT0_SEND_DESTINATION = '0x36d16e71d630ba8c5bfb7ac8a459aebdac1276aa';
const USDT_AMOUNT = '2500.0';
// what the amount would read as if the ETH fee were decoded as USDT instead
const ETH_FEE_AS_USDT = '37964723.338644';

const transaction = {
  isOft: true,
  sender: '0x36d16e71d630ba8c5bfb7ac8a459aebdac1276aa',
  direction: 'deposit',
  status: 'success',
  createdAt: 1,
  resolvedAt: null,
  txId: USDT0_SEND_TX,
  asset: 'USDT',
  assetType: AssetType.ERC20,
  value: '0',
  uniqueId: null,
  isWithdrawal: false,
  blockNum: null,
  tokenAddress: CommonAddress.Ethereum.USDT,
  childChainId: ChainId.ArbitrumOne,
  parentChainId: ChainId.Ethereum,
  sourceChainId: ChainId.Ethereum,
  destinationChainId: ChainId.ArbitrumOne,
  destinationTxHash: null,
} satisfies LayerZeroTransaction;

describe('updateAdditionalLayerZeroData against a real USDT0 transfer', () => {
  it('resolves the transferred token amount from the live receipt', async () => {
    const result = await updateAdditionalLayerZeroData(transaction);

    expect(result.value).toBe(USDT_AMOUNT);
    expect(result.value).not.toBe(ETH_FEE_AS_USDT);
    expect(result.asset).toBe('USDT');
    expect(result.tokenAddress).toBe(utils.getAddress(CommonAddress.Ethereum.USDT));
    expect(result.blockNum).toBe(USDT0_SEND_BLOCK);
    expect(result.destination).toBe(USDT0_SEND_DESTINATION);
  });
});
