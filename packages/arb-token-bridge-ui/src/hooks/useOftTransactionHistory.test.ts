import { BigNumber, utils } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { LayerZeroTransaction } from '../state/app/state';
import { ChainId } from '../types/ChainId';
import { addressesEqual } from '../util/AddressUtils';
import { CommonAddress } from '../util/CommonAddressUtils';
import { AssetType } from './arbTokenBridge.types';
import { updateAdditionalLayerZeroData } from './useOftTransactionHistory';

// tests in this package run concurrently, so receipts are keyed by tx id rather than
// swapping a shared mock return value
const { receipts } = vi.hoisted(() => ({ receipts: new Map<string, unknown>() }));

vi.mock('../token-bridge-sdk/utils', () => ({
  getProviderForChainId: () => ({
    getTransactionReceipt: (txId: string) => Promise.resolve(receipts.get(txId)),
  }),
}));

vi.mock('../token-bridge-sdk/oftUtils', () => ({
  getChainIdFromEid: (eid: number) => eid,
  getOftV2TransferDecodedData: () =>
    Promise.resolve([
      [30110, '0x000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'],
    ]),
}));

vi.mock('../util/TokenUtils', () => ({
  fetchErc20Data: () => Promise.resolve({ symbol: 'USDT', decimals: 6 }),
}));

const SYSTEM_ADDRESS = '0xfffffffffffffffffffffffffffffffffffffffe';
const SENDER = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const USDT_OFT_ADAPTER = '0x6c96de32cea08842dcc4058c14d3aaad7fa41dee';
const TRANSFER_TOPIC = utils.id('Transfer(address,address,uint256)');

const TOKEN_AMOUNT = 1_500_000; // 1.5 USDT at 6 decimals
const ETH_FEE = utils.parseEther('0.0025');

function transferLog({ address, amount }: { address: string; amount: BigNumber | number }) {
  return {
    address,
    topics: [TRANSFER_TOPIC, utils.hexZeroPad(SENDER, 32), utils.hexZeroPad(USDT_OFT_ADAPTER, 32)],
    data: utils.hexZeroPad(BigNumber.from(amount).toHexString(), 32),
  };
}

const protocolEthTransferLog = transferLog({ address: SYSTEM_ADDRESS, amount: ETH_FEE });
const usdtTransferLog = transferLog({
  address: CommonAddress.Ethereum.USDT,
  amount: TOKEN_AMOUNT,
});

function oftTransaction(
  txId: string,
  logs: unknown[],
  tokenAddress: string = CommonAddress.Ethereum.USDT,
): LayerZeroTransaction {
  receipts.set(txId, { blockNumber: 100, logs });

  return {
    isOft: true,
    sender: SENDER,
    direction: 'deposit',
    status: 'pending',
    createdAt: 1,
    resolvedAt: null,
    txId,
    asset: 'USDT',
    assetType: AssetType.ERC20,
    value: '0',
    uniqueId: null,
    isWithdrawal: false,
    blockNum: null,
    tokenAddress,
    childChainId: ChainId.ArbitrumOne,
    parentChainId: ChainId.Ethereum,
    sourceChainId: ChainId.Ethereum,
    destinationChainId: ChainId.ArbitrumOne,
    destinationTxHash: null,
  } as LayerZeroTransaction;
}

describe('updateAdditionalLayerZeroData', () => {
  it('reads the token transfer when a protocol ETH transfer log is emitted first', async () => {
    const tx = oftTransaction('0xaa', [protocolEthTransferLog, usdtTransferLog]);

    const result = await updateAdditionalLayerZeroData(tx);

    expect(result.value).toBe('1.5');
    expect(result.asset).toBe('USDT');
    expect(addressesEqual(result.tokenAddress ?? undefined, CommonAddress.Ethereum.USDT)).toBe(
      true,
    );
    expect(result.blockNum).toBe(100);
  });

  it('reads the token transfer when it is the only log in the receipt', async () => {
    const tx = oftTransaction('0xbb', [usdtTransferLog]);

    const result = await updateAdditionalLayerZeroData(tx);

    expect(result.value).toBe('1.5');
  });

  it('reads the token transfer on the withdrawal side, where the token is the Arbitrum USDT', async () => {
    const arbitrumUsdtTransferLog = transferLog({
      address: CommonAddress.ArbitrumOne.USDT,
      amount: TOKEN_AMOUNT,
    });
    const tx = oftTransaction('0xdd', [arbitrumUsdtTransferLog], CommonAddress.ArbitrumOne.USDT);

    const result = await updateAdditionalLayerZeroData(tx);

    expect(result.value).toBe('1.5');
    expect(addressesEqual(result.tokenAddress ?? undefined, CommonAddress.ArbitrumOne.USDT)).toBe(
      true,
    );
  });

  it('throws when the receipt has no transfer log for the token', async () => {
    const tx = oftTransaction('0xcc', [protocolEthTransferLog]);

    await expect(updateAdditionalLayerZeroData(tx)).rejects.toThrow(
      'No token transfer log found for OFT transaction',
    );
  });
});
