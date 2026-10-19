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

// Matches the navigation, timespan and snapshot steps of flow.mjs
const steps = [
  {
    name: 'Load bridge',
    short: 'Load',
    metrics: [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'script-size',
    ],
    summary: ['performance', 'largest-contentful-paint', 'total-blocking-time', 'script-size'],
  },
  {
    name: 'Configure transfer',
    short: 'Interaction',
    metrics: [
      'performance',
      'best-practices',
      'total-blocking-time',
      'cumulative-layout-shift',
      'interaction-to-next-paint',
    ],
    summary: ['total-blocking-time', 'interaction-to-next-paint'],
  },
  {
    name: 'Configured transfer',
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

function readFlows(build) {
  return fs
    .readdirSync(resultsDirectory)
    .filter((file) => file.startsWith(`${build}-`) && file.endsWith('.json'))
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

function formatDelta({ difference }, id) {
  return withUnit(difference > 0 ? `+${difference}` : `${difference}`, id);
}

function formatReport({ pr, base, runs, baseSha, runUrl }) {
  const comparisons = steps.map((step, index) =>
    Object.fromEntries(step.metrics.map((id) => [id, compare(pr[index][id], base[index][id], id)])),
  );
  const statuses = comparisons.flatMap((comparison) =>
    Object.values(comparison).map(({ status }) => status),
  );
  const verdict = statuses.includes('worse')
    ? 'worse'
    : statuses.includes('better')
      ? 'better'
      : 'same';

  // Key metrics of each step, plus any other metric that changed significantly
  const summary = steps.flatMap((step, index) => {
    const ids = step.metrics.filter(
      (id) => step.summary.includes(id) || comparisons[index][id].status !== 'same',
    );
    if (ids.length === 0) {
      return [];
    }
    const values = ids.map((id) => {
      const comparison = comparisons[index][id];
      return `${icons[comparison.status]} ${metrics[id].short ?? metrics[id].label} ${withUnit(pr[index][id], id)} (${formatDelta(comparison, id)})`;
    });
    return [`- **${step.short ?? step.name}**: ${values.join(' · ')}`];
  });

  const tables = steps.flatMap((step, index) => [
    `| ${step.name} | PR | Base | Δ |`,
    '|---|---:|---:|---:|',
    ...step.metrics.map((id) => {
      const comparison = comparisons[index][id];
      return `| ${metrics[id].label} | ${withUnit(pr[index][id], id)} | ${withUnit(base[index][id], id)} | ${icons[comparison.status]} ${formatDelta(comparison, id)} |`;
    }),
    '',
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
    `Median of ${runs} desktop runs of the bridge user flow. PR and base (${baseSha.slice(0, 7)}) runs alternate on the same runner. Δ is PR minus base.`,
    '',
    `${icons.better} improvement · ${icons.worse} regression · ${icons.same} within run-to-run noise (2 points for scores, 10% and at least 50 ms for timings, 0.02 for CLS, 5 KiB for JavaScript)`,
    '',
    ...tables,
    `Full reports are attached to the [workflow run](${runUrl}).`,
    '',
    '</details>',
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const prFlows = readFlows('pr');
  const baseFlows = readFlows('base');

  if (prFlows.length === 0 || baseFlows.length === 0) {
    throw new Error('Missing Lighthouse results for the PR or base build.');
  }

  const { owner, repo } = context.repo;
  const pullRequest = context.payload.pull_request;
  const body = formatReport({
    pr: summarize(prFlows),
    base: summarize(baseFlows),
    runs: prFlows.length,
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
