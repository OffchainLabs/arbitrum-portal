import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveImport } from '../server/resolveImport';

const readContract = vi.fn();

vi.mock('@/bridge/util/networks', () => ({
  rpcURLs: { 1: 'http://ethereum.test', 42161: 'http://arbitrum.test' },
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: () => ({ readContract }),
  };
});

const PARENT = '0x6982508145454ce325ddbe47a25d4ec3d2311933';
const CHILD = '0x35e6a59f786d9266c7961ea28c7b768b33959cbb';
const NORMAL_GATEWAY = '0xa3a7b6f88361f48403514059f1f16c8e78d60eec';
const DISABLED_GATEWAY = '0x0000000000000000000000000000000000000001';
const PYUSD_ETHEREUM = '0x6c3ea9036406852006290770bedfcaba0e23a0e8';

const depositPair = { sourceChainId: 1, destinationChainId: 42161 };

function mockContracts({
  gateway,
  childDeployed = true,
}: {
  gateway: string;
  childDeployed?: boolean;
}) {
  readContract.mockImplementation(
    async ({ address, functionName }: { address: string; functionName: string }) => {
      switch (functionName) {
        case 'symbol':
        case 'name':
        case 'decimals': {
          if (!childDeployed && address === CHILD) {
            throw new Error('no contract code');
          }
          return functionName === 'decimals' ? 18 : 'PEPE';
        }
        case 'l1TokenToGateway':
          return gateway;
        case 'calculateL2TokenAddress':
          return CHILD;
        default:
          throw new Error(`unexpected call: ${functionName}`);
      }
    },
  );
}

beforeEach(() => {
  readContract.mockReset();
});

describe('resolveImport (deposit)', () => {
  it('resolves a registered token, falling back to parent metadata for an undeployed child', async () => {
    mockContracts({ gateway: NORMAL_GATEWAY, childDeployed: false });

    const resolution = await resolveImport(depositPair, PARENT);

    expect(resolution?.routes).toEqual([
      {
        provider: 'canonical',
        sourceTokenId: `1:${PARENT}`,
        destinationTokenId: `42161:${CHILD}`,
      },
    ]);
    const child = resolution?.tokens.find((token) => token.chainId === 42161);
    expect(child?.symbol).toBe('PEPE');
  });

  it('rejects tokens whose deposits are disabled on the router', async () => {
    mockContracts({ gateway: DISABLED_GATEWAY });

    expect(await resolveImport(depositPair, PARENT)).toBeNull();
  });

  it('rejects canonical-excluded tokens without touching the chain', async () => {
    mockContracts({ gateway: NORMAL_GATEWAY });

    expect(await resolveImport(depositPair, PYUSD_ETHEREUM)).toBeNull();
    expect(readContract).not.toHaveBeenCalled();
  });

  it('rejects invalid addresses', async () => {
    expect(await resolveImport(depositPair, 'not-an-address')).toBeNull();
    expect(readContract).not.toHaveBeenCalled();
  });
});
