import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isExcludedToken } from '../constants';
import { resolveImport } from '../server/resolveImport';

const readContract = vi.fn();

vi.mock('@/bridge/util/networks', () => ({
  rpcURLs: { 1: 'http://ethereum.test', 42161: 'http://arbitrum.test' },
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    http: (url: string) => ({ url }),
    createPublicClient: ({ transport }: { transport: { url: string } }) => ({
      readContract: (args: Parameters<typeof readContract>[0]) =>
        readContract({ ...args, rpcUrl: transport.url }),
    }),
  };
});

const PARENT = '0x6982508145454ce325ddbe47a25d4ec3d2311933';
const CHILD = '0x35e6a59f786d9266c7961ea28c7b768b33959cbb';
const NORMAL_GATEWAY = '0xa3a7b6f88361f48403514059f1f16c8e78d60eec';
const DISABLED_GATEWAY = '0x0000000000000000000000000000000000000001';

const depositPair = { sourceChainId: 1, destinationChainId: 42161 };
const withdrawalPair = { sourceChainId: 42161, destinationChainId: 1 };

function mockContracts({
  gateway,
  childDeployed = true,
}: {
  gateway: string;
  childDeployed?: boolean;
}) {
  readContract.mockImplementation(
    async ({
      address,
      functionName,
      rpcUrl,
    }: {
      address: string;
      functionName: string;
      rpcUrl: string;
    }) => {
      const chainId = rpcUrl === 'http://ethereum.test' ? 1 : 42161;

      switch (functionName) {
        case 'symbol':
        case 'name':
        case 'decimals': {
          if (chainId === 1 && address !== PARENT) {
            throw new Error('no contract code');
          }
          if (chainId === 42161 && address !== CHILD) {
            throw new Error('no contract code');
          }
          if (!childDeployed && chainId === 42161 && address === CHILD) {
            throw new Error('no contract code');
          }
          return functionName === 'decimals' ? 18 : 'PEPE';
        }
        case 'l1TokenToGateway':
          if (chainId !== 1) {
            throw new Error('gateway router only exists on L1');
          }
          return gateway;
        case 'calculateL2TokenAddress':
          if (chainId !== 1) {
            throw new Error('gateway router only exists on L1');
          }
          return CHILD;
        case 'l1Address':
          if (chainId !== 42161 || address !== CHILD) {
            throw new Error('not an Arbitrum standard token');
          }
          return PARENT;
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
  it('resolves the picker-excluded PEPE demo token, falling back to parent metadata for an undeployed child', async () => {
    mockContracts({ gateway: NORMAL_GATEWAY, childDeployed: false });

    const resolution = await resolveImport(depositPair, PARENT);

    expect(isExcludedToken(1, PARENT)).toBe(true);
    expect(isExcludedToken(42161, CHILD)).toBe(true);
    expect(resolution?.availableRoutes).toEqual([
      {
        provider: 'canonical',
        sourceToken: resolution?.sourceToken,
        destinationToken: resolution?.destinationToken,
      },
    ]);
    expect(resolution?.sourceToken.id).toBe(`1:${PARENT}`);
    expect(resolution?.destinationToken.id).toBe(`42161:${CHILD}`);
    expect(resolution?.destinationToken.symbol).toBe('PEPE');
  });

  it('accepts the destination-chain child address and resolves the source parent token', async () => {
    mockContracts({ gateway: NORMAL_GATEWAY });

    const resolution = await resolveImport(depositPair, CHILD);

    expect(resolution?.sourceToken.id).toBe(`1:${PARENT}`);
    expect(resolution?.destinationToken.id).toBe(`42161:${CHILD}`);
    expect(resolution?.availableRoutes).toEqual([
      {
        provider: 'canonical',
        sourceToken: resolution?.sourceToken,
        destinationToken: resolution?.destinationToken,
      },
    ]);
  });

  it('rejects tokens whose deposits are disabled on the router', async () => {
    mockContracts({ gateway: DISABLED_GATEWAY });

    expect(await resolveImport(depositPair, PARENT)).toBeNull();
  });

  it('rejects invalid addresses', async () => {
    expect(await resolveImport(depositPair, 'not-an-address')).toBeNull();
    expect(readContract).not.toHaveBeenCalled();
  });
});

describe('resolveImport (withdrawal)', () => {
  it('resolves the source-chain child address', async () => {
    mockContracts({ gateway: NORMAL_GATEWAY });

    const resolution = await resolveImport(withdrawalPair, CHILD);

    expect(resolution?.sourceToken.id).toBe(`42161:${CHILD}`);
    expect(resolution?.destinationToken.id).toBe(`1:${PARENT}`);
    expect(resolution?.availableRoutes).toEqual([
      {
        provider: 'canonical',
        sourceToken: resolution?.sourceToken,
        destinationToken: resolution?.destinationToken,
      },
    ]);
  });

  it('accepts the destination-chain parent address and resolves the source child token', async () => {
    mockContracts({ gateway: NORMAL_GATEWAY });

    const resolution = await resolveImport(withdrawalPair, PARENT);

    expect(resolution?.sourceToken.id).toBe(`42161:${CHILD}`);
    expect(resolution?.destinationToken.id).toBe(`1:${PARENT}`);
    expect(resolution?.availableRoutes).toEqual([
      {
        provider: 'canonical',
        sourceToken: resolution?.sourceToken,
        destinationToken: resolution?.destinationToken,
      },
    ]);
  });
});
