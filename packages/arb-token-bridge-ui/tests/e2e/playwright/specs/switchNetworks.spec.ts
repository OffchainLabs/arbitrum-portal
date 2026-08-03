/**
 * Playwright port of tests/e2e/specs/switchNetworks.cy.ts.
 *
 * Exercises the in-app network selection (source-network popup) and the swap-networks button.
 * Runs on the local Nitro testnode chains, so it needs no extra setup beyond the login fixture.
 */
import { expect, test } from '../fixtures';
import { findDestinationChainButton, findSourceChainButton, login } from '../support/actions';
import { getL1NetworkName, getL2NetworkName } from '../support/common';

test.describe('Switch Networks', () => {
  test('should show L1 and L2 chains correctly', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'parentChain' });
    await findSourceChainButton(page, getL1NetworkName(e2eEnv));
    await findDestinationChainButton(page, getL2NetworkName(e2eEnv));
  });

  test('should select another arbitrum chain from the network popup', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'parentChain' });

    const sourceChainButton = await findSourceChainButton(page, getL1NetworkName(e2eEnv));
    await sourceChainButton.click();

    await expect(page.getByText('Select Source Network')).toBeVisible();

    // The network list virtualizes, so off-screen chains (like L3) are not in the DOM until
    // filtered. Use the search box to surface it before selecting.
    await page.getByPlaceholder('Search by network name').fill('Nitro Testnode L3');

    const l3Option = page.getByRole('button', { name: 'Switch to Nitro Testnode L3' });
    await expect(l3Option).toBeVisible();
    await l3Option.click();

    await findSourceChainButton(page, 'Nitro Testnode L3');
    await findDestinationChainButton(page, 'Nitro Testnode L2');
  });

  test('should swap source and destination chains with the Switch Networks button', async ({
    page,
    e2eEnv,
  }) => {
    await login(page, e2eEnv, { networkType: 'parentChain' });
    await findSourceChainButton(page, getL1NetworkName(e2eEnv));

    const switchNetworksButton = page.getByRole('button', { name: /Switch Networks/i });
    await expect(switchNetworksButton).toBeVisible();
    await switchNetworksButton.click();

    await findSourceChainButton(page, getL2NetworkName(e2eEnv));
  });
});
