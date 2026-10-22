// Profiles the renders of the bridge user flow measured by Lighthouse, see renderProfiler.ts.
// Requests get generated responses and timers follow a fake clock, so every run renders the same
// way. Run with `pnpm test:profile`, the summary is written to RENDER_PROFILE_DIRECTORY.
// React has no act() in its production build, so the profile renders and fires events without
// @testing-library/react, and waits for React itself, see settle().
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { fireEvent, screen, within } from '@testing-library/dom';
import { mkdirSync, writeFileSync } from 'fs';
import { createRoot } from 'react-dom/profiling';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initializeDayjs } from '../../../../app/src/initialization';
import {
  createIntegrationWrapper,
  getSearchParams,
} from '../../test-utils/integration-test-wrapper';
import { getUnhandledRequests, waitForNetworkIdle } from '../../test-utils/renderProfileNetwork';
import {
  type ProfiledInteraction,
  summarizeRenderProfile,
} from '../../test-utils/renderProfileReport';
import { recordSwrKeys, swrKeyProfiler } from '../../test-utils/renderProfileSwr';
import { advanceClock, recordCommits, settle, watchRoot } from '../../test-utils/renderProfiler';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { mapCustomChainToNetworkData } from '../../util/networks';
import orbitChainsData from '../../util/orbitChainsData.json';
import { MainContent } from './MainContent';

const outputDirectory = process.env.RENDER_PROFILE_DIRECTORY ?? 'render-profile';

// MainContent reads the tab from the URL to show the transfer panel
vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: () => '/bridge',
  useSearchParams: () => new URLSearchParams(),
}));

// Fires an event, then lets everything it triggers finish
async function fire(event: () => void) {
  event();
  await settle({ waitForIdle: waitForNetworkIdle });
}

// Time between keystrokes when typing
async function pause() {
  await advanceClock({ waitForIdle: waitForNetworkIdle, duration: 100 });
}

function getTokenRow(symbol: string) {
  const row = within(screen.getByRole('dialog'))
    .getAllByText(symbol, { exact: true })
    .map((element) => element.closest('button'))
    .find((button) => button !== null);
  if (!row) {
    throw new Error(`${symbol} is missing from the token panel.`);
  }
  return row;
}

function renderBridge() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  watchRoot(root as unknown as Parameters<typeof watchRoot>[0]);
  const Wrapper = createIntegrationWrapper({
    search: getSearchParams({ sourceChain: 'ethereum', destinationChain: 'arbitrum-one' }),
    swrMiddleware: [swrKeyProfiler],
  });
  root.render(
    <Wrapper>
      <MainContent />
    </Wrapper>,
  );
}

const interactions: { name: string; run: () => Promise<void> }[] = [
  {
    name: 'Load bridge',
    run: () => fire(renderBridge),
  },
  {
    name: 'Enter amount',
    run: async () => {
      const input = screen.getByLabelText('Amount input');
      for (const value of ['1', '1.']) {
        fireEvent.change(input, { target: { value } });
        // eslint-disable-next-line no-await-in-loop
        await pause();
      }
      await fire(() => fireEvent.change(input, { target: { value: '1.5' } }));
    },
  },
  {
    name: 'Switch networks',
    run: () => fire(() => fireEvent.click(screen.getByRole('button', { name: 'Switch Networks' }))),
  },
  {
    name: 'Select token',
    run: async () => {
      await fire(() =>
        fireEvent.click(screen.getByRole('button', { name: 'Select Token', hidden: true })),
      );
      await fire(() =>
        fireEvent.change(
          within(screen.getByRole('dialog')).getByPlaceholderText(
            'Search by token name, symbol, or address',
          ),
          { target: { value: CommonAddress.ArbitrumOne.USDC } },
        ),
      );
      await fire(() => fireEvent.click(getTokenRow('USDC')));
    },
  },
  {
    // Nothing happens on screen, but the selected token refreshes every 10s, the gas price and
    // TPS every 30s and the LiFi prices every 31s, like the idle step of Lighthouse
    name: 'Idle',
    run: () => advanceClock({ waitForIdle: waitForNetworkIdle, duration: 32_000 }),
  },
];

describe('Bridge render profile', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI = 'true';
    // Done by BridgeClient in the app, the routes show their duration once an amount is entered
    initializeDayjs();
    // Like the transfer panel integration tests, which can bridge to these chains
    [ChainId.ApeChain, ChainId.RobinhoodChain].forEach((chainId) => {
      const chain = orbitChainsData.mainnet.find((orbitChain) => orbitChain.chainId === chainId);
      if (!chain) {
        throw new Error(`Orbit chain ${chainId} is missing.`);
      }
      registerCustomArbitrumNetwork(chain);
      mapCustomChainToNetworkData(chain);
    });
  });

  it('profiles the bridge user flow', async () => {
    const profiled: ProfiledInteraction[] = [];
    for (const { name, run } of interactions) {
      // Garbage left by the previous interaction shouldn't be collected during this one
      globalThis.gc?.();
      let commits: ProfiledInteraction['commits'] = [];
      // eslint-disable-next-line no-await-in-loop
      const swr = await recordSwrKeys(async () => {
        commits = await recordCommits(run);
      });
      profiled.push({ name, commits, swr });
    }

    // The flow went through, so the profile measured what it should
    expect(
      screen.getByRole('button', { name: 'Select Token', hidden: true }).textContent,
    ).toContain('USDC');

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      `${outputDirectory}/render-profile.json`,
      JSON.stringify(
        {
          build: process.env.RENDER_PROFILE_BUILD ?? 'development',
          interactions: summarizeRenderProfile(profiled),
          unhandledRequests: getUnhandledRequests(),
        },
        null,
        2,
      ),
    );
  });
});
