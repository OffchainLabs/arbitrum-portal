// Measures the interactions of scenarios.ts in Chrome against running production builds of the
// app, see README.md. Runs in Vitest for its TypeScript and path aliases, which the generated API
// responses of the render profile need, and drives the browser with Playwright.
// Samples run one after the other, so they never compete for the CPU.
/* eslint-disable no-await-in-loop */
import { type Browser, type BrowserContext, type Page, chromium } from '@playwright/test';
import { version as playwrightVersion } from '@playwright/test/package.json';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { getResponse } from 'msw';
import os from 'os';
import path from 'path';
import { test } from 'vitest';

import { profileHandlers } from '../../src/test-utils/renderProfileNetwork';
import { type Learned, type Scenario, bridgePath, scenarios } from './scenarios';

type Build = 'production' | 'profiling';
type Target = { name: string; url: string; revision: string };

const build = (process.env.BENCH_BUILD ?? 'production') as Build;
const samples = Number(process.env.BENCH_SAMPLES ?? 5);
// CI splits the rounds between runners, each with its own numbers and result file
const firstRound = Number(process.env.BENCH_FIRST_ROUND ?? 1);
const shard = process.env.BENCH_SHARD;
const outputDirectory = path.resolve(process.env.BENCH_OUTPUT ?? 'browser-bench-results');
const traces = process.env.BENCH_TRACE === 'true';
// The targets whose profiling build must have the <Profiler> wrappers
const profiledTargets = (process.env.BENCH_REQUIRE_PROFILER ?? 'pr').split(',');
const viewport = { width: 1280, height: 800 };
const quietMs = 1000;
const completionTimeoutMs = 10_000;

const repository = path.resolve(__dirname, '../../../..');
const chromePath =
  process.env.CHROME_PATH ??
  (() => {
    const { chromeVersion, chromePath: cacheDirectory } = JSON.parse(
      execSync('node -p "JSON.stringify(require(\'./package.json\').config)"', {
        cwd: repository,
      }).toString(),
    );
    const builds: Record<string, { platform: string; executable: string }> = {
      darwin: {
        platform: 'mac_arm',
        executable:
          'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      },
      linux: { platform: 'linux', executable: 'chrome-linux64/chrome' },
    };
    const chromeBuild = builds[os.platform()];
    if (!chromeBuild) {
      throw new Error(`No pinned Chrome for ${os.platform()}, set CHROME_PATH`);
    }
    return path.join(
      repository,
      cacheDirectory,
      'chrome',
      `${chromeBuild.platform}-${chromeVersion}`,
      chromeBuild.executable,
    );
  })();

// BENCH_TARGETS=pr=http://localhost:3000,master=http://localhost:3001
// BENCH_REVISIONS=pr=<sha>,master=<sha>
function parsePairs(value: string) {
  return Object.fromEntries(
    value
      .split(',')
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf('=');
        return [pair.slice(0, index), pair.slice(index + 1)];
      }),
  );
}
const revisions = parsePairs(process.env.BENCH_REVISIONS ?? '');
const targets: Target[] = Object.entries(
  parsePairs(process.env.BENCH_TARGETS ?? 'pr=http://localhost:3000'),
).map(([name, url]) => ({ name, url, revision: revisions[name] ?? 'unknown' }));

const scenarioNames = process.env.BENCH_SCENARIOS?.split(',');
const selectedScenarios = scenarioNames
  ? scenarios.filter(({ name }) => scenarioNames.includes(name))
  : scenarios;

function shuffle<T>(values: T[]) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    const value = shuffled[index] as T;
    shuffled[index] = shuffled[other] as T;
    shuffled[other] = value;
  }
  return shuffled;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Answers every request that doesn't go to the app's pages and assets with the generated
// responses of the render profile, including the app's own /api routes. Unknown requests fail
// like a network error.
async function routeNetwork(context: BrowserContext, target: Target) {
  const network = { pending: 0, lastActivity: Date.now(), unhandled: new Set<string>() };
  const origin = new URL(target.url).origin;
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin && !url.pathname.startsWith('/api/')) {
      return route.continue();
    }
    network.pending += 1;
    network.lastActivity = Date.now();
    try {
      const corsHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      };
      if (request.method() === 'OPTIONS') {
        return await route.fulfill({ status: 204, headers: corsHeaders });
      }
      const hasBody = !['GET', 'HEAD'].includes(request.method());
      const response = await getResponse(
        profileHandlers,
        new Request(url, {
          method: request.method(),
          headers: request.headers(),
          body: hasBody ? (request.postData() ?? undefined) : undefined,
        }),
      );
      if (process.env.BENCH_DEBUG === 'true') {
        console.log(`${response?.status ?? 'none'} ${request.method()} ${url.href.slice(0, 150)}`);
      }
      if (!response || response.type === 'error') {
        network.unhandled.add(`${request.method()} ${url.origin}${url.pathname}`);
        return await route.abort('failed');
      }
      return await route.fulfill({
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
        body: Buffer.from(await response.arrayBuffer()),
      });
    } finally {
      network.pending -= 1;
      network.lastActivity = Date.now();
    }
  });
  return network;
}

// Waits until no request was in flight and no long task ran for a second
async function waitForQuiet(page: Page, network: { pending: number; lastActivity: number }) {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const sinceLongTask = await page.evaluate(
      () => performance.now() - window.__bench.lastLongTaskEnd(),
    );
    if (
      network.pending === 0 &&
      Date.now() - network.lastActivity >= quietMs &&
      sinceLongTask >= quietMs
    ) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error('The page never became quiet');
    }
    await sleep(100);
  }
}

// A new browser context per sample, so every sample starts from a fresh page with an empty
// HTTP cache and storage
async function runSample({
  browser,
  target,
  scenario,
  sample,
  learned,
  tracePath,
}: {
  browser: Browser;
  target: Target;
  scenario: Scenario;
  sample: number;
  learned?: Learned;
  tracePath?: string;
}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
    serviceWorkers: 'block',
  });
  try {
    await context.addInitScript({ path: path.join(__dirname, 'pageRuntime.js') });
    const network = await routeNetwork(context, target);
    const page = await context.newPage();
    await page.goto(new URL(bridgePath, target.url).href);
    await page.getByRole('button', { name: 'Select Token' }).filter({ hasText: 'ETH' }).waitFor();
    await waitForQuiet(page, network);
    await scenario.setup(page);
    await waitForQuiet(page, network);

    if (tracePath) {
      await browser.startTracing(page, { path: tracePath, screenshots: true });
    }
    // The page watches for completion from here, before the input is sent. The warm-up has no
    // expected state yet, it waits for the page to settle instead.
    await page.evaluate(
      ([name, index, eventType, checks, timeout]) =>
        window.__bench.arm(name, index, eventType, true, checks, timeout),
      [
        scenario.name,
        sample,
        scenario.eventType,
        learned ? scenario.completion(learned) : null,
        completionTimeoutMs,
      ] as const,
    );
    await scenario.act(page);
    const result = learned ? await page.evaluate(() => window.__bench.complete()) : undefined;
    if (tracePath) {
      await browser.stopTracing();
    }
    // A measured sample already saw the final state, only the warm-up waits for it
    if (!learned) {
      await waitForQuiet(page, network);
    }
    const finalState = learned ?? (await scenario.learn(page));
    await scenario.verify(page, finalState);
    return { result, learned: finalState, unhandled: [...network.unhandled] };
  } finally {
    await context.close();
  }
}

// Per <Profiler> id: the commits during the interaction, their total and longest actualDuration
// and the longest baseDuration. Ids are kept apart, nested subtrees overlap.
function summarizeProfiler(
  entries: { id: string; actualDuration: number; baseDuration: number }[],
) {
  const byId: Record<
    string,
    { commits: number; actualTotal: number; actualMax: number; baseMax: number }
  > = {};
  for (const { id, actualDuration, baseDuration } of entries) {
    const summary = (byId[id] ??= { commits: 0, actualTotal: 0, actualMax: 0, baseMax: 0 });
    summary.commits += 1;
    summary.actualTotal += actualDuration;
    summary.actualMax = Math.max(summary.actualMax, actualDuration);
    summary.baseMax = Math.max(summary.baseMax, baseDuration);
  }
  return byId;
}

test(
  `browser benchmark, ${build} build`,
  async () => {
    mkdirSync(path.join(outputDirectory, 'traces'), { recursive: true });
    const browser = await chromium.launch({ executablePath: chromePath, headless: true });
    const results = {
      meta: {
        build,
        targets,
        samples,
        firstRound,
        shard,
        scenarios: selectedScenarios.map(({ name }) => name),
        browser: `Chrome ${browser.version()}`,
        playwright: playwrightVersion,
        viewport,
        deviceScaleFactor: 1,
        cache: 'new browser context per sample: empty HTTP cache and storage',
        network: 'generated responses, see renderProfileNetwork.ts',
        timers: 'timers of 2 s or more never fire, transitions and animations disabled',
        machine: {
          os: `${os.platform()} ${os.release()}`,
          cpus: os.cpus()[0]?.model,
          cores: os.cpus().length,
        },
        node: process.version,
        date: new Date().toISOString(),
      },
      samples: [] as Record<string, unknown>[],
      unhandledRequests: [] as string[],
      errors: [] as string[],
    };
    const write = () =>
      writeFileSync(
        path.join(outputDirectory, `${build}${shard ? `-${shard}` : ''}.json`),
        JSON.stringify(results, null, 2),
      );

    try {
      // Warm-up, unmeasured: starts the servers' caches and reads the final state of each
      // scenario on each target
      const learned: Record<string, Learned> = {};
      for (const scenario of selectedScenarios) {
        for (const target of targets) {
          const warmUp = await runSample({ browser, target, scenario, sample: 0 });
          learned[`${target.name} ${scenario.name}`] = warmUp.learned;
          results.unhandledRequests.push(...warmUp.unhandled);
        }
      }

      for (let round = firstRound; round < firstRound + samples; round += 1) {
        for (const scenario of selectedScenarios) {
          // Targets alternate in random order, so a slow moment of the machine hits both
          for (const [position, target] of shuffle(targets).entries()) {
            const { result } = await runSample({
              browser,
              target,
              scenario,
              sample: round,
              learned: learned[`${target.name} ${scenario.name}`],
            });
            if (!result) {
              throw new Error(`${scenario.name}: no measurement on ${target.name}`);
            }
            const { profilerSamples, interactionEvents, ...timings } = result;
            results.samples.push({
              target: target.name,
              scenario: scenario.name,
              round,
              position,
              ...timings,
              interactionEvents,
              profiler: summarizeProfiler(profilerSamples),
              profilerSamples,
            });
            console.log(
              `${build} ${target.name} ${scenario.name} #${round}: ${timings.duration.toFixed(1)} ms`,
            );
          }
        }
      }

      if (traces) {
        for (const scenario of selectedScenarios) {
          for (const target of targets) {
            const name = `${build}-${target.name}-${scenario.name}`.replace(/\W+/g, '-');
            await runSample({
              browser,
              target,
              scenario,
              sample: -1,
              learned: learned[`${target.name} ${scenario.name}`],
              tracePath: path.join(outputDirectory, 'traces', `${name}.json`),
            });
          }
        }
      }

      // The normal build must not collect anything, the profiling build of the targets with the
      // wrappers must
      for (const target of targets) {
        const profilerCount = results.samples
          .filter((sample) => sample.target === target.name)
          .reduce((total, sample) => total + (sample.profilerSamples as unknown[]).length, 0);
        if (build === 'production' && profilerCount > 0) {
          results.errors.push(`The production build of ${target.name} collected profiler samples`);
        }
        if (build === 'profiling' && profiledTargets.includes(target.name) && profilerCount === 0) {
          results.errors.push(
            `The profiling build of ${target.name} collected no profiler samples`,
          );
        }
      }
    } catch (error) {
      results.errors.push(String(error));
    } finally {
      results.unhandledRequests = [...new Set(results.unhandledRequests)].sort();
      write();
      await browser.close();
    }
    if (results.errors.length > 0) {
      throw new Error(results.errors.join('\n'));
    }
  },
  60 * 60 * 1000,
);

declare global {
  interface Window {
    __bench: {
      lastLongTaskEnd: () => number;
      arm: (
        scenario: string,
        sample: number,
        eventType: string,
        collectProfiler: boolean,
        checks: ReturnType<Scenario['completion']> | null,
        timeoutMs: number,
      ) => void;
      complete: () => Promise<{
        start: number;
        end: number;
        duration: number;
        interactionLatency: number | null;
        interactionEvents: unknown[];
        longTaskCount: number;
        longTaskDuration: number;
        longAnimationFrameCount: number;
        longAnimationFrameBlocking: number;
        profilerSamples: { id: string; actualDuration: number; baseDuration: number }[];
        profilerIds: string[];
      }>;
    };
  }
}
