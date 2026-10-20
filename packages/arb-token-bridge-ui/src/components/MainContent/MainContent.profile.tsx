// Profiles the renders of the bridge user flow measured by Lighthouse, see renderProfiler.ts.
// Requests get generated responses and timers follow a fake clock, so every run renders the same
// way. Run with `pnpm test:profile`, the summary is written to RENDER_PROFILE_DIRECTORY.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'fs';
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
import { advanceClock, recordCommits, settle } from '../../test-utils/renderProfiler';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { setupTransferPanelLifiIntegrationSuite } from '../TransferPanel/TransferPanel.integration.helpers';
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
  await act(async () => event());
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

const interactions: { name: string; run: () => Promise<void> }[] = [
  {
    name: 'Load bridge',
    run: () =>
      fire(() =>
        render(<MainContent />, {
          wrapper: createIntegrationWrapper({
            search: getSearchParams({ sourceChain: 'ethereum', destinationChain: 'arbitrum-one' }),
            swrMiddleware: [swrKeyProfiler],
          }),
        }),
      ),
  },
  {
    name: 'Enter amount',
    run: async () => {
      const input = screen.getByLabelText('Amount input');
      for (const value of ['1', '1.']) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => fireEvent.change(input, { target: { value } }));
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

describe.sequential('Bridge render profile', () => {
  setupTransferPanelLifiIntegrationSuite();

  // Done by BridgeClient in the app, the routes show their duration once an amount is entered
  beforeAll(initializeDayjs);

  it('profiles the bridge user flow', async () => {
    const profiled: ProfiledInteraction[] = [];
    for (const { name, run } of interactions) {
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
          interactions: summarizeRenderProfile(profiled),
          unhandledRequests: getUnhandledRequests(),
        },
        null,
        2,
      ),
    );
  });
});
