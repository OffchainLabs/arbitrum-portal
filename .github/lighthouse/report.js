// Compares the Lighthouse user flow runs of the PR against the runs of master and posts the result
// as a PR comment. Each runner measures both, so a run of the PR is compared with the run of master
// on the same runner. Values are medians of all runs, changes are means of the differences between
// the PR and master on each runner, with their 99% confidence interval.
const fs = require('fs');
const path = require('path');

const marker = '<!-- lighthouse-report -->';
const resultsDirectory = 'lighthouse-reports/pr';
const baselineDirectory = 'lighthouse-reports/master';

// Changes smaller than max(minDelta, minRatio × base) are too small to matter, see compare()
const metrics = {
  'performance': { label: 'Performance', higherIsBetter: true, minDelta: 2 },
  'accessibility': { label: 'Accessibility', higherIsBetter: true, minDelta: 2 },
  'best-practices': { label: 'Best Practices', higherIsBetter: true, minDelta: 2 },
  'seo': { label: 'SEO', higherIsBetter: true, minDelta: 2 },
  'first-contentful-paint': {
    label: 'First Contentful Paint',
    short: 'FCP',
    unit: 'ms',
    minDelta: 50,
    minRatio: 0.1,
  },
  'largest-contentful-paint': {
    label: 'Largest Contentful Paint',
    short: 'LCP',
    unit: 'ms',
    minDelta: 50,
    minRatio: 0.1,
  },
  'total-blocking-time': {
    label: 'Total Blocking Time',
    short: 'TBT',
    unit: 'ms',
    minDelta: 50,
    minRatio: 0.1,
  },
  'cumulative-layout-shift': {
    label: 'Cumulative Layout Shift',
    short: 'CLS',
    decimals: 3,
    minDelta: 0.02,
  },
  'interaction-to-next-paint': {
    label: 'Interaction to Next Paint',
    short: 'INP',
    unit: 'ms',
    minDelta: 50,
    minRatio: 0.1,
  },
  'bootup-time': {
    label: 'JavaScript Execution Time',
    short: 'JS time',
    unit: 'ms',
    minDelta: 50,
    minRatio: 0.1,
  },
  // Unlike the total byte weight, which varies with API responses, this is stable across runs
  'script-size': {
    label: 'JavaScript Transfer Size',
    short: 'JS',
    unit: 'KiB',
    minDelta: 5,
    read: (lhr) =>
      (lhr.audits['resource-summary']?.details?.items?.find(
        (item) => item.resourceType === 'script',
      )?.transferSize ?? 0) / 1024,
  },
};

const icons = { better: '🟢', same: '⚪', worse: '🔴' };

// Script sizes by module come from source maps and are the same on every run, so smaller changes
// are real but too small to list
const minModuleChange = 1024;
const modulesShown = 10;

const interactionMetrics = [
  'total-blocking-time',
  'cumulative-layout-shift',
  'interaction-to-next-paint',
  'bootup-time',
];

// Matches the navigation, timespan and snapshot steps of flow.mjs
const steps = [
  {
    name: 'Load bridge',
    metrics: [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'bootup-time',
      'script-size',
    ],
  },
  ...['Enter amount', 'Switch networks', 'Select token', 'Switch to Xai'].map((name) => ({
    name,
    metrics: interactionMetrics,
  })),
  {
    name: 'Configured transfer',
    metrics: ['accessibility', 'best-practices', 'seo'],
  },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Two-sided 99% quantiles of Student's t distribution, by degrees of freedom
const tQuantiles = [
  63.657, 9.925, 5.841, 4.604, 4.032, 3.707, 3.499, 3.355, 3.25, 3.169, 3.106, 3.055, 3.012, 2.977,
  2.947, 2.921, 2.898, 2.878, 2.861, 2.845,
];

// Mean and 99% confidence interval of the differences between the PR and master on each runner
function confidenceInterval(differences) {
  const mean =
    differences.reduce((total, difference) => total + difference, 0) / differences.length;
  if (differences.length < 2) {
    return { mean, low: -Infinity, high: Infinity };
  }
  const variance =
    differences.reduce((total, difference) => total + (difference - mean) ** 2, 0) /
    (differences.length - 1);
  const t = tQuantiles[differences.length - 2] ?? 2.576;
  const margin = t * Math.sqrt(variance / differences.length);
  return { mean, low: mean - margin, high: mean + margin };
}

function readMetric(lhr, id) {
  if (metrics[id].read) {
    return metrics[id].read(lhr);
  }
  if (lhr.categories[id]) {
    return (lhr.categories[id].score ?? 0) * 100;
  }
  return lhr.audits[id]?.numericValue ?? 0;
}

// Uncompressed size of the scripts the bridge loaded, by module, written by flow.mjs
function readModules(directory) {
  const file = path.join(directory, 'modules.json');
  return fs.existsSync(file)
    ? new Map(Object.entries(JSON.parse(fs.readFileSync(file, 'utf8'))))
    : undefined;
}

function readFlows(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory)
    .filter((file) => file.startsWith('run-') && file.endsWith('.json'))
    .map((file) => ({
      run: file,
      flow: JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
    }));
}

// Median of each metric, and its value in each run
function summarize(flows) {
  return steps.map((step, index) =>
    Object.fromEntries(
      step.metrics.map((id) => {
        const values = new Map(
          flows.map(({ run, flow }) => [run, readMetric(flow.steps[index].lhr, id)]),
        );
        const value = Number(median([...values.values()]).toFixed(metrics[id].decimals ?? 0));
        return [id, { value, values }];
      }),
    ),
  );
}

function compare(pr, base, id) {
  const { higherIsBetter = false, minDelta, minRatio = 0, decimals = 0 } = metrics[id];
  // Runners differ in speed by up to 2 times, so each run of the PR is compared with the run of
  // master on the same runner
  const differences = [...pr.values.keys()]
    .filter((run) => base.values.has(run))
    .map((run) => pr.values.get(run) - base.values.get(run));
  const interval = confidenceInterval(differences);
  const difference = Number(interval.mean.toFixed(decimals));
  // A change counts when its whole 99% confidence interval is past the smallest change that
  // matters. An interval that only excludes zero is too easy to reach by chance with this many
  // metrics, or with a small difference between the two sides of a runner.
  const threshold = Math.max(minDelta, minRatio * Math.abs(base.value));
  if (interval.low >= threshold || interval.high <= -threshold) {
    return { difference, interval, status: difference > 0 === higherIsBetter ? 'better' : 'worse' };
  }
  return { difference, interval, status: 'same' };
}

function withUnit(value, id) {
  return metrics[id].unit ? `${value} ${metrics[id].unit}` : `${value}`;
}

function formatSigned(value, id) {
  const rounded = Number(value.toFixed(metrics[id].decimals ?? 0));
  return withUnit(rounded > 0 ? `+${rounded}` : `${rounded}`, id);
}

// Relative changes are only shown for measurements, scores are already percentages
function formatDelta({ id, difference, interval, base }) {
  const delta = formatSigned(difference, id);
  const range = `<br><sub>99% CI ${formatSigned(interval.low, id)} to ${formatSigned(interval.high, id)}</sub>`;
  if (!metrics[id].unit || base === 0) {
    return `${delta}${range}`;
  }
  const percent = Math.round((difference / base) * 100);
  return `${delta} (${percent > 0 ? '+' : ''}${percent}%)${range}`;
}

function formatDirection(id) {
  return metrics[id].higherIsBetter ? '⬆️ higher is better' : '⬇️ lower is better';
}

// One collapsible section per status, with a nested one for each step that changed
function formatChanges({ sections, status, title }) {
  const groups = sections
    .map((section) => ({ ...section, rows: section.rows.filter((row) => row.status === status) }))
    .filter(({ rows }) => rows.length > 0);
  const count = groups.reduce((total, { rows }) => total + rows.length, 0);
  if (count === 0) {
    return [];
  }

  return [
    '<details>',
    `<summary><b>${icons[status]} ${title} (${count})</b></summary>`,
    '',
    ...groups.flatMap(({ step, rows }) => [
      '<details>',
      `<summary>${step.name} — ${rows
        .map(({ id }) => metrics[id].short ?? metrics[id].label)
        .join(', ')}</summary>`,
      '',
      '| Metric | Master | PR | Δ |',
      '|:---|---:|---:|---:|',
      ...rows.map(
        (row) =>
          `| ${metrics[row.id].label}<br><sub>${formatDirection(row.id)}</sub> | ${withUnit(row.base, row.id)} | ${withUnit(row.pr, row.id)} | **${formatDelta(row)}** |`,
      ),
      '',
      '</details>',
      '',
    ]),
    '</details>',
    '',
  ];
}

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

// The modules whose size changed the most, to tell what changed the JavaScript transfer size
function formatModules({ pr, base }) {
  if (!pr || !base) {
    return [];
  }
  const changes = [...new Set([...pr.keys(), ...base.keys()])]
    .map((module) => ({ module, pr: pr.get(module) ?? 0, base: base.get(module) ?? 0 }))
    .map((change) => ({ ...change, difference: change.pr - change.base }))
    .filter(({ difference }) => Math.abs(difference) >= minModuleChange)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  if (changes.length === 0) {
    return [];
  }
  const total = (modules) => [...modules.values()].reduce((sum, bytes) => sum + bytes, 0);
  const difference = total(pr) - total(base);
  const hidden = changes.length - modulesShown;

  return [
    '<details>',
    `<summary><b>📦 JavaScript by module (${difference >= 0 ? '+' : '−'}${formatSize(Math.abs(difference))})</b></summary>`,
    '',
    `Uncompressed size of the scripts the bridge loads, by package or source file, from source maps. Turbopack's runtime and imported JSON files have no source map. Changes under ${formatSize(minModuleChange)} aren't listed.`,
    '',
    '| Module | Master | PR | Δ |',
    '|:---|---:|---:|---:|',
    ...changes
      .slice(0, modulesShown)
      .map(
        ({ module, pr: p, base: b, difference: d }) =>
          `| \`${module}\` | ${b ? formatSize(b) : '—'} | ${p ? formatSize(p) : '—'} | **${d > 0 ? '+' : '−'}${formatSize(Math.abs(d))}** |`,
      ),
    ...(hidden > 0
      ? ['', `${hidden} more modules changed by over ${formatSize(minModuleChange)}.`]
      : []),
    '',
    '</details>',
    '',
  ];
}

function formatReport({ pr, base, modules, runs, baseSha, runUrl }) {
  const sections = steps.map((step, index) => ({
    step,
    rows: step.metrics.map((id) => {
      const prResult = pr[index][id];
      const baseResult = base[index][id];
      return {
        id,
        pr: prResult.value,
        base: baseResult.value,
        ...compare(prResult, baseResult, id),
      };
    }),
  }));

  const rows = sections.flatMap((section) => section.rows);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const changes = [
    ...formatChanges({ sections, status: 'worse', title: 'Regressions' }),
    ...formatChanges({ sections, status: 'better', title: 'Improvements' }),
    ...formatModules(modules),
  ];

  return [
    marker,
    '## 🔦 Lighthouse report',
    '',
    `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
    '|:---:|:---:|:---:|',
    `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
    '',
    `Median of ${runs} desktop runs of the bridge user flow, compared with master at \`${baseSha.slice(0, 7)}\` on the same runners. A change counts when its whole 99% confidence interval is past the metric's smallest change that matters.`,
    '',
    ...(changes.length > 0 ? ['---', '', ...changes] : []),
    '---',
    '',
    `📄 Full reports are attached to the [workflow run](${runUrl}).`,
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const flows = { pr: readFlows(resultsDirectory), base: readFlows(baselineDirectory) };

  if (flows.pr.length === 0) {
    throw new Error('Missing Lighthouse results for the PR.');
  }
  if (flows.base.length === 0) {
    throw new Error('Missing Lighthouse results for master.');
  }

  const pullRequest = context.payload.pull_request;
  const body = formatReport({
    pr: summarize(flows.pr),
    base: summarize(flows.base),
    modules: { pr: readModules(resultsDirectory), base: readModules(baselineDirectory) },
    runs: flows.pr.length,
    baseSha: pullRequest.base.sha,
    runUrl: `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`,
  });

  await core.summary.addRaw(body).write();

  // The token is read-only on forks, so only comment on PRs from this repository
  if (pullRequest.head.repo.full_name !== `${owner}/${repo}`) {
    return;
  }

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pullRequest.number,
    per_page: 100,
  });
  const previous = comments.find(
    (comment) => comment.user?.type === 'Bot' && comment.body?.includes(marker),
  );

  if (previous) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: previous.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: pullRequest.number, body });
  }
};
