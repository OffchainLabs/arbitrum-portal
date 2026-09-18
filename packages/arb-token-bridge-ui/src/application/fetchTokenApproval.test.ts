import { BigNumber } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenType } from '../hooks/arbTokenBridge.types';
import type { TokenApprovalInput } from './fetchTokenApproval';
import { fetchTokenApproval } from './fetchTokenApproval';

const approval = vi.hoisted(() => ({ estimate: vi.fn(), gasPrice: vi.fn(), signer: vi.fn() }));
vi.mock('../token-bridge-sdk/utils', () => ({
  getProviderForChainId: () => ({ getGasPrice: approval.gasPrice }),
}));
vi.mock('../token-bridge-sdk/OftV2TransferStarter', () => ({
  OftV2TransferStarter: class {
    approveTokenEstimateGas = approval.estimate;
  },
}));
vi.mock('../token-bridge-sdk/oftUtils', () => ({
  getOftV2TransferConfig: () => ({
    isValid: true,
    sourceChainAdapterAddress: '0x0000000000000000000000000000000000000002',
  }),
}));
vi.mock('./evmExecutionRuntime', () => ({
  getEvmExecutionRuntime: approval.signer,
}));

const input = {
  sourceChainId: 1,
  destinationChainId: 42161,
  route: 'oftV2' as const,
  walletAddress: '0x0000000000000000000000000000000000000001' as const,
  token: {
    type: TokenType.ERC20,
    address: '0x0000000000000000000000000000000000000003',
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
    listIds: new Set<string>(),
  },
} satisfies TokenApprovalInput;

describe.sequential('approval metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approval.signer.mockResolvedValue({ signer: {} });
    approval.estimate.mockResolvedValue(BigNumber.from(100_000));
    approval.gasPrice.mockResolvedValue(BigNumber.from(1_000_000_000));
  });

  it.each(['estimate', 'gasPrice', 'signer'] as const)(
    'keeps the spender and maximum approval warning when %s fails',
    async (operation) => {
      approval[operation].mockRejectedValueOnce(new Error('RPC unavailable'));
      const result = await fetchTokenApproval(input);
      expect(result).toEqual({
        contractAddress: '0x0000000000000000000000000000000000000002',
        requiresMaximumApproval: true,
        estimatedGasFees: undefined,
      });
    },
  );

  it('returns the gas fee when an estimate is available', async () => {
    expect(await fetchTokenApproval(input)).toMatchObject({ estimatedGasFees: 0.0001 });
  });

  it('does not invent a zero fee without a connected wallet', async () => {
    expect(await fetchTokenApproval({ ...input, walletAddress: undefined })).toMatchObject({
      estimatedGasFees: undefined,
      requiresMaximumApproval: true,
    });
    expect(approval.signer).not.toHaveBeenCalled();
  });
});
