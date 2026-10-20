// Runs the Lighthouse bridge user flow against the app at APP_URL, on desktop and mobile.
import { mkdir, writeFile } from 'fs/promises';
import { desktopConfig, startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';

import { measureModules } from './modules.mjs';

const runs = 5;
// Long enough for every poller of the bridge to run at least once
const idleDuration = 32_000;
const outputDirectory = process.env.OUTPUT_DIRECTORY ?? 'lighthouse-reports';
const bridgePath =
  '/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&txHistory=0';

async function click(page, selector) {
  const element = await page.waitForSelector(selector, { visible: true });
  await element.click();
}

async function type(page, selector, value) {
  const element = await page.waitForSelector(selector, { visible: true });
  await element.click({ clickCount: 3 });
  await element.type(value);
}

// Each interaction is its own timespan, so a regression points to the interaction that caused it
const interactions = [
  {
    name: 'Enter amount',
    run: async (page) => {
      await type(page, '[aria-label="Amount input"]', '2');
      await page.waitForSelector('[aria-label="Route arbitrum"]', { visible: true });
    },
  },
  {
    name: 'Switch networks',
    run: async (page) => {
      await click(page, '[aria-label="Switch Networks"]');
      await page.waitForSelector('[aria-label="From: Arbitrum One"]', { visible: true });
    },
  },
  {
    name: 'Select token',
    run: async (page) => {
      await click(page, '[aria-label="Select Token"]');
      await type(page, '[placeholder="Search by token name, symbol, or address"]', 'USDC');
      await click(page, '::-p-text(USDC.e)');
      await page.waitForSelector('[aria-label="Select Token"] ::-p-text(USDC.e)', {
        visible: true,
      });
    },
  },
  // Nothing happens on screen, but the selected token refreshes every 10s, the gas price and
  // TPS every 30s and the LiFi prices every 31s
  {
    name: 'Idle',
    run: () => new Promise((resolve) => setTimeout(resolve, idleDuration)),
  },
  {
    name: 'Switch to Xai',
    run: async (page) => {
      await click(page, '[aria-label="From: Arbitrum One"]');
      await type(page, '[placeholder="Search by network name"]', 'Xai');
      await (await page.waitForSelector('[aria-label="Switch to Xai"]')).click();
      await page.waitForSelector('[aria-label="From: Xai"]', { visible: true });
    },
  },
];

// Lighthouse emulates the screen and throttles the network and CPU of each form factor
const formFactors = { desktop: desktopConfig, mobile: undefined };

async function runFlow(origin, config) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);

    const flow = await startFlow(page, { name: 'Bridge user flow', config });
    await flow.navigate(new URL(bridgePath, origin).href, { name: 'Load bridge' });
    for (const interaction of interactions) {
      await flow.startTimespan({ name: interaction.name });
      await interaction.run(page);
      await flow.endTimespan();
    }
    await flow.snapshot({ name: 'Configured transfer' });

    const [loadBridge] = flow.createArtifactsJson().gatherSteps;
    return {
      result: await flow.createFlowResult(),
      html: await flow.generateReport(),
      modules: measureModules(loadBridge.artifacts),
    };
  } finally {
    await browser.close();
  }
}

await mkdir(outputDirectory, { recursive: true });

for (let run = 1; run <= runs; run += 1) {
  for (const [formFactor, config] of Object.entries(formFactors)) {
    console.log(`Run ${run}/${runs}: ${formFactor}`);
    const { result, html, modules } = await runFlow(process.env.APP_URL, config);
    const file = `${outputDirectory}/${formFactor}-${run}`;
    await writeFile(`${file}.json`, JSON.stringify(result));
    await writeFile(`${file}.html`, html);
    // Every run loads the same scripts, so the first one is enough
    if (run === 1 && formFactor === 'desktop') {
      await writeFile(`${outputDirectory}/modules.json`, JSON.stringify(modules));
    }
  }
}
