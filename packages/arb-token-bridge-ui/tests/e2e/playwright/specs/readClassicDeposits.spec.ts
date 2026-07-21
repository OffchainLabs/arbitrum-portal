/**
 * Read classic (pre-Nitro) deposit messages from local storage cache.
 * Port of tests/e2e/specs/readClassicDeposits.cy.ts.
 */
import { ParentToChildMessageStatus } from '@arbitrum/sdk';

import { AssetType } from '../../../../src/hooks/arbTokenBridge.types';
import { Transaction } from '../../../../src/types/Transactions';
import { type E2EConfig } from '../e2eConfig';
import { expect, test } from '../fixtures';
import { login, switchToTransactionHistoryTab } from '../support/actions';

type MockClassicDepositTransactionParams = {
  txID: string;
  value: string;
} & Partial<Transaction>;

function mockClassicDepositTransaction(
  e2eEnv: E2EConfig,
  params: MockClassicDepositTransactionParams,
): Transaction {
  const dateNow = new Date();
  const dateYearAgo = new Date(dateNow.setFullYear(dateNow.getFullYear() - 1));

  return {
    type: 'deposit-l1',
    direction: 'deposit',
    source: 'event_logs',
    parentChainId: 1,
    childChainId: 42161,
    status: 'success',
    isClassic: true,
    assetName: e2eEnv.NATIVE_TOKEN_SYMBOL,
    assetType: AssetType.ETH,
    sender: e2eEnv.ADDRESS,
    l1NetworkID: '1',
    l2NetworkID: '42161',
    timestampCreated: dateYearAgo.toISOString(),
    timestampResolved: dateYearAgo.toISOString(),
    parentToChildMsgData: {
      fetchingUpdate: false,
      status: ParentToChildMessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: '0xtx',
      childTxId: undefined,
    },
    ...params,
  };
}

async function seedDeposits(
  page: import('@playwright/test').Page,
  e2eEnv: E2EConfig,
  tx: Transaction,
) {
  await page.goto('/bridge');
  await page.evaluate(
    ([key, value]) => {
      localStorage.clear();
      localStorage.setItem(key, value);
    },
    [`arbitrum:bridge:deposits-${e2eEnv.ADDRESS.toLowerCase()}`, JSON.stringify([tx])] as [
      string,
      string,
    ],
  );
}

test.describe('Read classic deposit messages', () => {
  test('can read successful native token deposit', async ({ page, e2eEnv }) => {
    await seedDeposits(
      page,
      e2eEnv,
      mockClassicDepositTransaction(e2eEnv, {
        txID: '0x00000a813d47f2c478dcc3298d5361cb3aed817648f25cace6d0c1a59d2b8309',
        value: '0.024',
      }),
    );

    // Pin the destination so the ORBIT_TEST login doesn't default it to the
    // L3, which would scope the tx history filter away from the seeded
    // Ethereum <> Arbitrum One deposit.
    await login(page, e2eEnv, {
      networkType: 'parentChain',
      networkName: 'Ethereum',
      query: { destination: 'arbitrum-one' },
    });

    await switchToTransactionHistoryTab(page, 'settled');

    const destinationTxHash = '0xd3ff2a70a115411e1ae4917351dca49281368684394d0dcac136fa08d9d9b436';

    const status = page.getByLabel(/Transaction status/i);
    await expect(status).toContainText('Success');
    await expect(status).toHaveAttribute('href', new RegExp(destinationTxHash));
  });

  test('can read successful ERC-20 deposit', async ({ page, e2eEnv }) => {
    await seedDeposits(
      page,
      e2eEnv,
      mockClassicDepositTransaction(e2eEnv, {
        txID: '0x000153c231eb9fd3690b5e818fb671bdd09d678fe46b16b8f694f3beb9cf6db1',
        value: '10,000',
        assetType: AssetType.ERC20,
        assetName: 'DAI',
      }),
    );

    await login(page, e2eEnv, { networkType: 'parentChain', networkName: 'Ethereum' });

    await switchToTransactionHistoryTab(page, 'settled');

    const destinationTxHash = '0x6cecd3bfc3ec73181c4ac0253d3f51e5aa8d26157ca7439ff9ab465de14a436f';

    const status = page.getByLabel(/Transaction status/i);
    await expect(status).toContainText('Success');
    await expect(status).toHaveAttribute('href', new RegExp(destinationTxHash));
  });
});
