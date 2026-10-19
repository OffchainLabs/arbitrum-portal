// Compares the Lighthouse user flow runs of the PR build against the base build and
// posts the result as a PR comment. Each value is the median of all runs of a build.
const fs = require('fs');
const path = require('path');

const marker = '<!-- lighthouse-report -->';
const resultsDirectory = 'lighthouse-reports';

// Changes smaller than max(minDelta, minRatio × base) are within run-to-run noise
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
const verdicts = {
  better: '🟢 **Lighthouse: improvement**',
  same: '⚪ **Lighthouse: no significant change**',
  worse: '🔴 **Lighthouse: regression**',
};

const formFactors = [
  { key: 'desktop', label: 'Desktop' },
  // The JavaScript transfer size doesn't depend on the form factor, so it's only reported once
  { key: 'mobile', label: 'Mobile', exclude: ['script-size'] },
];

const interactionMetrics = [
  'total-blocking-time',
  'cumulative-layout-shift',
  'interaction-to-next-paint',
  'bootup-time',
];

// Matches the navigation, timespan and snapshot steps of flow.mjs.
// Steps of the same group share a line in the summary.
const steps = [
  {
    name: 'Load bridge',
    group: 'load',
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
    summary: ['performance', 'largest-contentful-paint', 'total-blocking-time', 'script-size'],
  },
  ...[
    ['Enter amount', 'Amount'],
    ['Switch networks', 'Networks'],
    ['Select token', 'Token'],
    ['Switch to Xai', 'Xai'],
  ].map(([name, short]) => ({
    name,
    short,
    group: 'interactions',
    metrics: interactionMetrics,
    summary: ['interaction-to-next-paint'],
  })),
  {
    name: 'Configured transfer',
    group: 'final state',
    metrics: ['accessibility', 'best-practices', 'seo'],
    summary: [],
  },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
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

function readFlows(build, formFactor) {
  return fs
    .readdirSync(resultsDirectory)
    .filter((file) => file.startsWith(`${build}-${formFactor}-`) && file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(resultsDirectory, file), 'utf8')));
}

function summarize(flows) {
  return steps.map((step, index) => {
    const lhrs = flows.map((flow) => flow.steps[index].lhr);
    return Object.fromEntries(
      step.metrics.map((id) => [
        id,
        Number(median(lhrs.map((lhr) => readMetric(lhr, id))).toFixed(metrics[id].decimals ?? 0)),
      ]),
    );
  });
}

function compare(pr, base, id) {
  const { higherIsBetter = false, minDelta, minRatio = 0, decimals = 0 } = metrics[id];
  const difference = Number((pr - base).toFixed(decimals));
  if (Math.abs(difference) < Math.max(minDelta, minRatio * Math.abs(base))) {
    return { difference, status: 'same' };
  }
  return { difference, status: difference > 0 === higherIsBetter ? 'better' : 'worse' };
}

function withUnit(value, id) {
  return metrics[id].unit ? `${value} ${metrics[id].unit}` : `${value}`;
}

function formatDelta({ id, difference }) {
  return withUnit(difference > 0 ? `+${difference}` : `${difference}`, id);
}

function formatReport({ pr, base, runs, baseSha, runUrl }) {
  const sections = formFactors.flatMap((formFactor) =>
    steps.map((step, index) => ({
      formFactor,
      step,
      rows: step.metrics
        .filter((id) => !formFactor.exclude?.includes(id))
        .map((id) => {
          const prValue = pr[formFactor.key][index][id];
          const baseValue = base[formFactor.key][index][id];
          return { id, pr: prValue, base: baseValue, ...compare(prValue, baseValue, id) };
        }),
    })),
  );
  const statuses = sections.flatMap(({ rows }) => rows.map(({ status }) => status));
  const verdict = statuses.includes('worse')
    ? 'worse'
    : statuses.includes('better')
      ? 'better'
      : 'same';

  // Key metrics of each step, plus any other metric that changed significantly
  const groups = new Map();
  for (const { formFactor, step, rows } of sections) {
    const label = `${formFactor.label} ${step.group}`;
    const items = rows
      .filter((row) => step.summary.includes(row.id) || row.status !== 'same')
      .map((row) => {
        const name = [step.short, metrics[row.id].short ?? metrics[row.id].label].filter(Boolean);
        return `${icons[row.status]} ${name.join(' ')} ${withUnit(row.pr, row.id)} (${formatDelta(row)})`;
      });
    groups.set(label, [...(groups.get(label) ?? []), ...items]);
  }
  const summary = [...groups]
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => `- **${label}**: ${items.join(' · ')}`);

  const tables = formFactors.flatMap((formFactor) => [
    `#### ${formFactor.label}`,
    '',
    ...sections
      .filter((section) => section.formFactor === formFactor)
      .flatMap(({ step, rows }) => [
        `| ${step.name} | PR | Base | Δ |`,
        '|---|---:|---:|---:|',
        ...rows.map(
          (row) =>
            `| ${metrics[row.id].label} | ${withUnit(row.pr, row.id)} | ${withUnit(row.base, row.id)} | ${icons[row.status]} ${formatDelta(row)} |`,
        ),
        '',
      ]),
  ]);

  return [
    marker,
    verdicts[verdict],
    '',
    ...summary,
    '',
    '<details>',
    '<summary>Details</summary>',
    '',
    `Median of ${runs} desktop and mobile runs of the bridge user flow. PR and base (${baseSha.slice(0, 7)}) runs alternate on the same runner. Δ is PR minus base.`,
    '',
    ...tables,
    `Full reports are attached to the [workflow run](${runUrl}).`,
    '',
    '</details>',
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const flows = Object.fromEntries(
    ['pr', 'base'].map((build) => [
      build,
      Object.fromEntries(formFactors.map(({ key }) => [key, readFlows(build, key)])),
    ]),
  );

  if (
    Object.values(flows).some((build) => Object.values(build).some((runs) => runs.length === 0))
  ) {
    throw new Error('Missing Lighthouse results for the PR or base build.');
  }

  const { owner, repo } = context.repo;
  const pullRequest = context.payload.pull_request;
  const summarizeBuild = (build) =>
    Object.fromEntries(Object.entries(build).map(([key, runs]) => [key, summarize(runs)]));
  const body = formatReport({
    pr: summarizeBuild(flows.pr),
    base: summarizeBuild(flows.base),
    runs: flows.pr.desktop.length,
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
