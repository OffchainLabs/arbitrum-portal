// Compares the Lighthouse user flow runs of the PR against the latest runs on master and
// posts the result as a PR comment. Each value is the median of all runs.
const fs = require('fs');
const path = require('path');

const marker = '<!-- lighthouse-report -->';
const resultsDirectory = 'lighthouse-reports';
const baselineDirectory = 'lighthouse-baseline';

// Changes smaller than max(minDelta, minRatio × base) are within run-to-run noise.
// Noisier metrics need larger changes, see compare().
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

const formFactors = [
  { key: 'desktop', label: 'Desktop', icon: '🖥️' },
  // The JavaScript transfer size doesn't depend on the form factor, so it's only reported once
  { key: 'mobile', label: 'Mobile', icon: '📱', exclude: ['script-size'] },
];

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

// Median absolute deviation, a measure of the run-to-run spread that ignores outliers
function deviation(values) {
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
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

function readFlows(directory, formFactor) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory)
    .filter((file) => file.startsWith(`${formFactor}-`) && file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
}

function summarize(flows) {
  return steps.map((step, index) => {
    const lhrs = flows.map((flow) => flow.steps[index].lhr);
    return Object.fromEntries(
      step.metrics.map((id) => {
        const values = lhrs.map((lhr) => readMetric(lhr, id));
        const value = Number(median(values).toFixed(metrics[id].decimals ?? 0));
        return [id, { value, spread: deviation(values) }];
      }),
    );
  });
}

function compare(pr, base, id) {
  const { higherIsBetter = false, minDelta, minRatio = 0, decimals = 0 } = metrics[id];
  const difference = Number((pr.value - base.value).toFixed(decimals));
  // Some runs on a shared runner are much slower than others, so changes also need to exceed
  // three times the spread of the runs to count
  const threshold = Math.max(
    minDelta,
    minRatio * Math.abs(base.value),
    3 * Math.max(pr.spread, base.spread),
  );
  if (Math.abs(difference) < threshold) {
    return { difference, status: 'same' };
  }
  return { difference, status: difference > 0 === higherIsBetter ? 'better' : 'worse' };
}

function withUnit(value, id) {
  return metrics[id].unit ? `${value} ${metrics[id].unit}` : `${value}`;
}

// Relative changes are only shown for measurements, scores are already percentages
function formatDelta({ id, difference, base }) {
  const delta = withUnit(difference > 0 ? `+${difference}` : `${difference}`, id);
  if (!metrics[id].unit || base === 0) {
    return delta;
  }
  const percent = Math.round((difference / base) * 100);
  return `${delta} (${percent > 0 ? '+' : ''}${percent}%)`;
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
    ...groups.flatMap(({ formFactor, step, rows }) => [
      '<details>',
      `<summary>${formFactor.icon} ${formFactor.label} · ${step.name} — ${rows
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

function formatReport({ pr, base, runs, baseline, runUrl }) {
  const sections = formFactors.flatMap((formFactor) =>
    steps.map((step, index) => ({
      formFactor,
      step,
      rows: step.metrics
        .filter((id) => !formFactor.exclude?.includes(id))
        .map((id) => {
          const prResult = pr[formFactor.key][index][id];
          const baseResult = base[formFactor.key][index][id];
          return {
            id,
            pr: prResult.value,
            base: baseResult.value,
            ...compare(prResult, baseResult, id),
          };
        }),
    })),
  );

  const rows = sections.flatMap((section) => section.rows);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const changes = [
    ...formatChanges({ sections, status: 'worse', title: 'Regressions' }),
    ...formatChanges({ sections, status: 'better', title: 'Improvements' }),
  ];

  return [
    marker,
    '## 🔦 Lighthouse report',
    '',
    `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
    '|:---:|:---:|:---:|',
    `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
    '',
    `Median of ${runs} desktop and mobile runs of the bridge user flow, compared with the [latest master runs](${baseline.url}) (\`${baseline.sha.slice(0, 7)}\`).`,
    '',
    ...(changes.length > 0 ? ['---', '', ...changes] : []),
    '---',
    '',
    `📄 Full reports are attached to the [workflow run](${runUrl}).`,
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const runUrl = (runId) => `${context.serverUrl}/${owner}/${repo}/actions/runs/${runId}`;
  const flows = Object.fromEntries(
    [
      ['pr', resultsDirectory],
      ['base', baselineDirectory],
    ].map(([build, directory]) => [
      build,
      Object.fromEntries(formFactors.map(({ key }) => [key, readFlows(directory, key)])),
    ]),
  );

  if (Object.values(flows.pr).some((runs) => runs.length === 0)) {
    throw new Error('Missing Lighthouse results for the PR.');
  }
  // The baseline comes from the Lighthouse workflow on master, which runs after each merge
  if (Object.values(flows.base).some((runs) => runs.length === 0)) {
    core.warning('No Lighthouse baseline from master yet, skipping the comparison.');
    return;
  }

  const pullRequest = context.payload.pull_request;
  const summarizeBuild = (build) =>
    Object.fromEntries(Object.entries(build).map(([key, runs]) => [key, summarize(runs)]));
  const body = formatReport({
    pr: summarizeBuild(flows.pr),
    base: summarizeBuild(flows.base),
    runs: flows.pr.desktop.length,
    baseline: { sha: process.env.BASELINE_SHA, url: runUrl(process.env.BASELINE_RUN_ID) },
    runUrl: runUrl(context.runId),
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
