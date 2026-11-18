import { afterEach, describe, expect, it, vi } from 'vitest';

// appKit reads the flag at import time, so each case loads a fresh copy of the module.
async function loadAppKit(flag: string) {
  vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', flag);
  vi.resetModules();
  const [appKit, { SolanaAdapter }, { solana }] = await Promise.all([
    import('./appKit'),
    import('@reown/appkit-adapter-solana'),
    import('@reown/appkit/networks'),
  ]);
  return { ...appKit, SolanaAdapter, solana };
}

describe.sequential('appKit', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['false', ''])('registers nothing for Solana when the flag is %j', async (flag) => {
    const { appKitAdapters, appKitNetworks } = await loadAppKit(flag);
    expect(appKitAdapters).toEqual([]);
    expect(appKitNetworks).toEqual([]);
  });

  it('registers the Solana adapter and network when the flag is on', async () => {
    const { appKitAdapters, appKitNetworks, SolanaAdapter, solana } = await loadAppKit('true');
    expect(appKitAdapters).toHaveLength(1);
    expect(appKitAdapters[0]).toBeInstanceOf(SolanaAdapter);
    expect(appKitNetworks).toEqual([solana]);
  });
});
