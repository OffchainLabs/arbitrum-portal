import { mkdir, writeFile } from 'fs/promises';
import type { FlowResult } from 'lighthouse';
import { join } from 'path';
import puppeteer, { Page } from 'puppeteer-core';

async function click(page: Page, selector: string): Promise<void> {
  const element = await page.waitForSelector(selector, { visible: true });
  if (!element) {
    throw new Error(`Could not find ${selector}`);
  }
  await element.click();
}

async function type(page: Page, selector: string, value: string): Promise<void> {
  const element = await page.waitForSelector(selector, { visible: true });
  if (!element) {
    throw new Error(`Could not find ${selector}`);
  }
  await element.click({ clickCount: 3 });
  await element.type(value);
}

async function runBridgeInteraction(page: Page): Promise<void> {
  await type(page, '[aria-label="Amount input"]', '2');
  await page.waitForSelector('[aria-label="Route arbitrum"]', { visible: true });

  await click(page, '[aria-label="Switch Networks"]');
  await page.waitForSelector('[aria-label="From: Arbitrum One"]', { visible: true });

  await click(page, '[aria-label="Select Token"]');
  await type(page, '[placeholder="Search by token name, symbol, or address"]', 'USDC');
  await click(page, '[aria-label="Select USDC.e"]');

  await click(page, '[aria-label="From: Arbitrum One"]');
  await type(page, '[placeholder="Search by network name"]', 'Xai');
  const xaiRow = await page.waitForSelector('[aria-label="Switch to Xai"]');
  await xaiRow?.click();
  await page.waitForSelector('[aria-label="From: Xai"]', { visible: true });
}

export async function executeLighthouseFlow({
  baseUrl,
  chromePath,
  reportDirectory,
  runNumber,
}: {
  baseUrl: string;
  chromePath: string;
  reportDirectory: string;
  runNumber: number;
}): Promise<FlowResult> {
  await mkdir(reportDirectory, { recursive: true });

  // Lighthouse is ESM-only. Keep this import dynamic because the scripts
  // package is intentionally CommonJS for its other utilities.
  const { desktopConfig, startFlow } = await import('lighthouse');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    await page.setViewport({ width: 1366, height: 768 });

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warn') {
        console.log(`[browser:${message.type()}] ${message.text()}`);
      }
    });

    const flow = await startFlow(page, {
      name: 'Arbitrum bridge user flow',
      config: desktopConfig,
    });

    const bridgeUrl = new URL('/bridge', baseUrl);
    bridgeUrl.search = new URLSearchParams({
      sourceChain: 'ethereum',
      destinationChain: 'arbitrum-one',
      tab: 'bridge',
      txHistory: '0',
    }).toString();

    await flow.navigate(bridgeUrl.toString(), { name: 'Load bridge' });
    await flow.startTimespan({ name: 'Configure bridge transfer' });
    await runBridgeInteraction(page);
    await flow.endTimespan();
    await flow.snapshot({ name: 'Configured transfer' });

    const result = await flow.createFlowResult();
    await writeFile(
      join(reportDirectory, `lighthouse-flow-${runNumber}.html`),
      await flow.generateReport(),
    );
    await writeFile(
      join(reportDirectory, `lighthouse-flow-${runNumber}.json`),
      JSON.stringify(result, null, 2),
    );

    return result;
  } finally {
    await browser.close();
  }
}
