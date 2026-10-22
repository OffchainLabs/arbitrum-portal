// The interactions of the browser benchmark, see README.md for what each one measures.
import type { Page } from '@playwright/test';

// Checks that must all hold for an interaction to be complete, see `holds` in pageRuntime.js
export type Check = {
  selector: string;
  count?: number;
  minCount?: number;
  everyTextIncludes?: string;
  height?: string;
  focused?: boolean;
};

// Final state of a scenario, read from its warm-up once the page stopped changing
export type Learned = Record<string, string | number>;

export type Scenario = {
  name: string;
  // The input that starts the measurement
  eventType: 'pointerdown' | 'keydown';
  // Unmeasured steps that bring the page to the starting state
  setup: (page: Page) => Promise<void>;
  act: (page: Page) => Promise<void>;
  learn: (page: Page) => Promise<Learned>;
  completion: (learned: Learned) => Check[];
  // Fails the sample when the page doesn't show the expected result
  verify: (page: Page, learned: Learned) => Promise<void>;
};

export const bridgePath =
  '/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&txHistory=0';

const tokenList = '[data-cy="tokenSearchList"] .ReactVirtualized__Grid__innerScrollContainer';
const tokenRows = `${tokenList} > *`;
const tokenSearchInput = 'input[placeholder="Search by token name, symbol, or address"]';
// react-virtualized sizes the list to all its rows, 96 px each, and only renders the visible ones
const tokenRowHeight = 96;

async function readTokenList(page: Page) {
  const height = await page.locator(tokenList).evaluate((element) => element.style.height);
  return { height, rows: Math.round(parseFloat(height) / tokenRowHeight) };
}

async function expectTokenList(page: Page, learned: Learned, text?: string) {
  const { height } = await readTokenList(page);
  if (height !== learned.height) {
    throw new Error(`The token list has ${height} of rows instead of ${learned.height}`);
  }
  if (text) {
    const rows = await page.locator(tokenRows).allTextContents();
    if (rows.length === 0 || rows.some((row) => !row.toLowerCase().includes(text))) {
      throw new Error(`The token list shows rows without "${text}": ${rows.join(' | ')}`);
    }
  }
}

const openTokenDialog = async (page: Page) => {
  await page.getByRole('button', { name: 'Select Token' }).click();
};

export const scenarios: Scenario[] = [
  {
    name: 'Open token list',
    eventType: 'pointerdown',
    setup: async () => {},
    act: openTokenDialog,
    learn: async (page) => readTokenList(page),
    completion: ({ height }) => [
      { selector: tokenList, height: String(height) },
      { selector: tokenRows, minCount: 1 },
      { selector: tokenSearchInput, focused: true },
    ],
    verify: async (page, learned) => {
      await expectTokenList(page, learned);
      // ETH and the default token list, the other lists are off by default
      if (Number(learned.rows) < 50) {
        throw new Error(`Only ${learned.rows} tokens in the list, the token lists didn't load`);
      }
    },
  },
  {
    name: 'Search token list',
    eventType: 'keydown',
    setup: async (page) => {
      await openTokenDialog(page);
      await page.locator(tokenSearchInput).pressSequentially('USD');
    },
    // The last letter of USDC, a single keystroke
    act: async (page) => {
      await page.keyboard.press('C');
    },
    learn: async (page) => readTokenList(page),
    completion: ({ height }) => [
      { selector: tokenList, height: String(height) },
      { selector: tokenRows, minCount: 1, everyTextIncludes: 'usdc' },
    ],
    verify: async (page, learned) => {
      await expectTokenList(page, learned, 'usdc');
    },
  },
  {
    name: 'Switch networks',
    eventType: 'pointerdown',
    setup: async () => {},
    act: async (page) => {
      await page.getByRole('button', { name: 'Switch Networks' }).click();
    },
    learn: async () => ({}),
    completion: () => [
      { selector: '[aria-label="From: Arbitrum One"]' },
      { selector: '[aria-label="To: Ethereum"]' },
    ],
    verify: async (page) => {
      await page.locator('[aria-label="From: Arbitrum One"]').waitFor({ timeout: 1000 });
      await page.locator('[aria-label="To: Ethereum"]').waitFor({ timeout: 1000 });
    },
  },
];
