// Profiles the renders of the bridge user flow measured by Lighthouse, see renderProfiler.ts.
// Run with `pnpm test:profile`, the report is written to RENDER_PROFILE_DIRECTORY.
import { act, fireEvent, screen } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'fs';
import { beforeAll, describe, it } from 'vitest';

import { initializeDayjs } from '../../../../app/src/initialization';
import {
  type ProfiledInteraction,
  formatRenderProfile,
  summarizeRenderProfile,
} from '../../test-utils/renderProfileReport';
import { recordCommits, waitForCommitsToSettle } from '../../test-utils/renderProfiler';
import {
  renderTransferPanel,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
} from './TransferPanel.integration.helpers';

const outputDirectory = process.env.RENDER_PROFILE_DIRECTORY ?? 'render-profile';

const interactions: { name: string; run: () => Promise<void> }[] = [
  {
    name: 'Load bridge',
    run: () => renderTransferPanel({ sourceChain: 'ethereum', destinationChain: 'arbitrum-one' }),
  },
  {
    name: 'Enter amount',
    run: async () => {
      const input = await screen.findByLabelText('Amount input');
      // One change per keystroke, like typing
      for (const value of ['1', '1.', '1.5']) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
          fireEvent.change(input, { target: { value } });
        });
      }
    },
  },
  {
    name: 'Switch networks',
    run: async () => {
      const button = await screen.findByRole('button', { name: 'Switch Networks' });
      await act(async () => {
        fireEvent.click(button);
      });
    },
  },
  {
    name: 'Select token',
    run: () => setSourceToken(tokenExpectationsByChain.ArbitrumOne.USDC),
  },
];

describe.sequential('TransferPanel render profile', () => {
  setupTransferPanelLifiIntegrationSuite();

  // Done by BridgeClient in the app, the routes show their duration once an amount is entered
  beforeAll(initializeDayjs);

  it('profiles the bridge user flow', async () => {
    const profiled: ProfiledInteraction[] = [];
    for (const { name, run } of interactions) {
      // eslint-disable-next-line no-await-in-loop
      const commits = await recordCommits(async () => {
        await run();
        await waitForCommitsToSettle();
      });
      profiled.push({ name, commits });
    }

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(`${outputDirectory}/render-profile.md`, formatRenderProfile(profiled));
    writeFileSync(
      `${outputDirectory}/render-profile.json`,
      JSON.stringify(summarizeRenderProfile(profiled), null, 2),
    );
  });
});
