# Browser benchmark

Measures a few bridge interactions in Chrome against production builds of the app, and the React
render time of the subtrees they update in a separate profiling build. The render profile in
`src/components/MainContent/MainContent.profile.tsx` counts renders in Vitest. This benchmark
measures what the user waits for in a real browser.

## Commands

From the repository root, with Node 22:

```sh
pnpm install
pnpm run install:chromium   # the Chrome for Testing version pinned in package.json

# Built into the app: RPC URLs on an origin the benchmark answers with generated data, so a build
# for the benchmark can't be deployed. The workflow sets the same variables.
export NEXT_PUBLIC_INFURA_KEY=profile NEXT_PUBLIC_RPC_PROVIDER=infura VAULTS_FYI_API_KEY=unused
export NEXT_PUBLIC_RPC_URL_ETHEREUM=https://rpc.profile.test/1
export NEXT_PUBLIC_RPC_URL_SEPOLIA=https://rpc.profile.test/11155111
export NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE=https://rpc.profile.test/42161
export NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA=https://rpc.profile.test/42170
export NEXT_PUBLIC_RPC_URL_BASE=https://rpc.profile.test/8453
export NEXT_PUBLIC_RPC_URL_ARBITRUM_SEPOLIA=https://rpc.profile.test/421614
export NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA=https://rpc.profile.test/84532

# Production build
pnpm --filter app run build
(cd packages/app && PORT=3000 pnpm start &)
pnpm --filter arb-token-bridge-ui bench:browser
node .github/browser-bench/report.js packages/arb-token-bridge-ui/browser-bench-results

# Profiling build, after stopping the server: React's profiling build and the <Profiler> wrappers
BENCH_PROFILER=true pnpm --filter app run build --profile
(cd packages/app && PORT=3000 pnpm start &)
BENCH_BUILD=profiling pnpm --filter arb-token-bridge-ui bench:browser
```

To compare two revisions, build each in its own checkout, start them on two ports and set
`BENCH_TARGETS=pr=http://localhost:3000,master=http://localhost:3001`. The report compares the
targets named `pr` and `master`. CI does this in `.github/workflows/browser-bench.yml`, with
`.github/browser-bench/serve.sh`, on PRs that change `packages/`. Three runners share the work:
production rounds 1 to 5 and 6 to 10, and the profiling build. Each one builds master and the PR
and measures them alternately, so they're always compared on the same machine.

Settings, all optional:

| Variable                 | Default                    | Meaning                                                                 |
| :----------------------- | :------------------------- | :---------------------------------------------------------------------- |
| `BENCH_BUILD`            | `production`               | `production` or `profiling`, must match the running build               |
| `BENCH_TARGETS`          | `pr=http://localhost:3000` | Comma-separated `name=url` of running servers                           |
| `BENCH_REVISIONS`        |                            | Comma-separated `name=commit`, recorded with the results                |
| `BENCH_SAMPLES`          | `5`                        | Measured rounds of each scenario                                        |
| `BENCH_FIRST_ROUND`      | `1`                        | Number of the first round, when runners share the rounds                |
| `BENCH_SHARD`            |                            | Adds `-<shard>` to the result file names, when runners share the rounds |
| `BENCH_SCENARIOS`        | all                        | Comma-separated scenario names                                          |
| `BENCH_TRACE`            | `false`                    | Records a Chrome trace of one extra sample per scenario and target      |
| `BENCH_OUTPUT`           | `browser-bench-results`    | Directory of `production.json`, `profiling.json` and `traces/`          |
| `BENCH_REQUIRE_PROFILER` | `pr`                       | Targets whose profiling build must collect `<Profiler>` samples         |
| `BENCH_DEBUG`            | `false`                    | Logs every request the benchmark answers                                |
| `CHROME_PATH`            | pinned Chrome for Testing  | Another Chrome executable                                               |
| `BENCH_WARN_ABSOLUTE_MS` | `20`                       | Warning threshold of the report, in ms                                  |
| `BENCH_WARN_RELATIVE`    | `0.1`                      | Warning threshold of the report, relative to master                     |

## Scenarios

All three start on `/bridge?sourceChain=ethereum&destinationChain=arbitrum-one&tab=bridge&txHistory=0`,
without a wallet, once the Select Token button shows ETH, no request has been in flight for a second
and no long task ran for a second. They're defined in `scenarios.ts`.

| Scenario          | Starting state                                   | Action                        | Complete when                                                                                          |
| :---------------- | :----------------------------------------------- | :---------------------------- | :----------------------------------------------------------------------------------------------------- |
| Open token list   | Bridge loaded                                    | Click Select Token            | The token list has its final number of rows, at least one row is rendered and the search box has focus |
| Search token list | Token dialog open, `USD` typed in the search box | Press `C`, a single keystroke | The list has its final number of rows and every rendered row contains `usdc`                           |
| Switch networks   | Bridge loaded                                    | Click Switch Networks         | The source network reads Arbitrum One and the destination Ethereum                                     |

The final number of rows comes from an unmeasured warm-up of the same build and scenario, read
once the page stopped changing for a second. Every sample then checks the page shows the same
result, so a sample that fails or skips the interaction fails the run instead of looking fast.

The dataset is the render profile's generated data, see `src/test-utils/renderProfileFixtures.ts`.
The token lists have the sizes of the real ones, about 1,800 tokens in total. Only ETH and the
default list, 51 rows, show when the dialog opens, as in production. Search goes through all the
lists.

### Differences from production

- Requests outside the app's pages and assets get generated responses, including the app's own
  `/api` routes and JSON-RPC calls. Other requests, like token logos, fail like network errors.
  The report lists them.
- Timers of 2 seconds or more never fire, so polling can't land in a measurement. The scenarios
  don't depend on any.
- CSS transitions and animations last 0 seconds, and `prefers-reduced-motion` is set.
- Each sample uses a new browser context: empty HTTP cache, storage and memory. The interaction
  happens after the page loaded, so it measures a first interaction on a freshly loaded page.
- The Next server runs on the same machine, so the RSC request of Switch networks takes
  milliseconds instead of a round trip to Vercel.

## Metrics

Each sample records:

- **Completion**: from the timestamp of the input event to the first rendered frame where the
  completion check holds. The check runs in `requestAnimationFrame`, so the frame that sees it hold
  also renders it, and the end is taken in a task posted from that callback, after the main thread
  rendered the frame. Recorded with `performance.mark()` and `performance.measure()`. It doesn't
  include the compositor and display, a few milliseconds.
- **Event Timing latency**: the longest Event Timing entry of the interaction, from input to the
  next presented frame. Event Timing only reports events of 16 ms or more, so a missing value
  means faster than that. It comes from a few scripted interactions and isn't field INP.
- **Long tasks**: count and total duration of the long tasks overlapping the measurement. Long
  animation frames are recorded too.

The profiling build adds, for each `<Profiler>` id, the `onRender` calls whose `commitTime` falls in
the measurement:

- **Commits**: the number of `onRender` calls, one per commit that rendered something in the
  subtree. It isn't a number of component renders. A subtree without commits during the
  interaction counts as 0 ms when it rendered at another time on that build, so going from no
  render on master to slow renders in the PR is a regression. A subtree that never rendered on
  master's pages is reported as not measured on master.
- **actualDuration**: total and longest, the time React spent rendering the subtree in those
  commits.
- **baseDuration**: the longest, React's estimate of rendering the whole subtree without memoized
  parts skipping. It's context, not a measured run without memoization.

The wrapped subtrees are `TransferPanelMain` and `Routes`, siblings, and `TokenSearch`, which is
inside `TransferPanelMain`. Nested durations overlap, so the report never adds them up. Profiling
slows React down and React's render time leaves out layout, paint and other scripts, so profiling
results are reported apart from the production timings.

The wrappers come from `src/components/common/benchProfiler.tsx`. `next.config.js` always defines
`BENCH_PROFILER`, so the normal build compiles them away. CI checks that no production build
contains `__BENCH_PROFILER__`, and the benchmark fails if a production build collects a profiler
sample or the PR's profiling build collects none.

## Comparison and warnings

In each round, every scenario runs once on each target, in random order. A metric changes when the
median of the differences between the PR and master within each round is over both
`BENCH_WARN_ABSOLUTE_MS` and `BENCH_WARN_RELATIVE` of master's median, in either direction. The
React render time of each `<Profiler>` subtree is compared the same way, between the profiling
builds.

The PR comment follows the Lighthouse and render profile comments: counts of regressions,
improvements and unchanged values, then collapsed sections with only the values that changed, and
the subtrees master can't measure yet. Regressions are GitHub warnings and never fail the job.
Every sample is in the uploaded `production.json` and `profiling.json`.

The job fails when a scenario breaks, a measurement is missing, a build is invalid or the
collection fails.

Every result file records the build, the revision of each target, the Chrome and Playwright
versions, the viewport, the cache policy, the machine and the date.

## Measured variation and detection

On a MacBook, with Chrome 128 and 10 rounds, the same production build on two ports as `pr` and
`master` gave these medians in the first run. The last column is the median of the differences
between `pr` and `master` in each round, for the completion, over three separate runs. None of the
three runs flagged a change.

| Scenario          | Completion | Event Timing latency | Long tasks | Completion Δ, 3 runs |
| :---------------- | ---------: | -------------------: | ---------: | :------------------- |
| Open token list   |     128 ms |               140 ms |     101 ms | −7.9 to +1.2 ms      |
| Search token list |      12 ms |                28 ms |       0 ms | −0.6 to +1.0 ms      |
| Switch networks   |     536 ms |                40 ms |     401 ms | −9.4 to −4.8 ms      |

Single samples varied more, up to 168 ms on Switch networks. A 3 ms change on Search token list is
already 25%, which is why a change needs both thresholds. CI runners will vary more, so the
thresholds should be set from a few runs there.

To check the benchmark catches regressions, I added a 100 ms busy wait to the Switch Networks
click handler and a 20 ms busy wait to every render of the token list panel, then compared with
the unchanged builds over 5 rounds:

- Switch networks: completion +100 ms, Event Timing latency +104 ms, long tasks +109 ms, all
  regressions. `TransferPanelMain` render time moved by 2 ms, since the delay is in the handler.
- Open token list: completion +41 ms, Event Timing latency +40 ms, long tasks +43 ms, all
  regressions. `TokenSearch` render time went from 63 to 102 ms in the profiling build.
- Search token list: completion +15 ms, under the 20 ms threshold. `TokenSearch` render time went
  from 7 to 23 ms.

## Limitations

- The thresholds are starting points. They should be set from the normal variation on CI before
  a timing can fail the job.
- Completion ends when the main thread rendered the frame, not when the display showed it.
- Three scripted interactions on a CI runner don't represent users' devices.
