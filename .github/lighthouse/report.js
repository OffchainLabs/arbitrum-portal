// Compares the Lighthouse user flow runs of the PR build against the base build and
// posts the result as a PR comment. Each value is the median of all runs of a build.
const fs = require('fs');
const path = require('path');

const marker = '<!-- lighthouse-report -->';
const resultsDirectory = 'lighthouse-reports';

const metrics = {
  'performance': { label: 'Performance' },
  'accessibility': { label: 'Accessibility' },
  'best-practices': { label: 'Best Practices' },
  'seo': { label: 'SEO' },
  'first-contentful-paint': { label: 'First Contentful Paint', short: 'FCP', unit: 'ms' },
  'largest-contentful-paint': { label: 'Largest Contentful Paint', short: 'LCP', unit: 'ms' },
  'total-blocking-time': { label: 'Total Blocking Time', short: 'TBT', unit: 'ms' },
  'cumulative-layout-shift': { label: 'Cumulative Layout Shift', short: 'CLS', decimals: 3 },
  'speed-index': { label: 'Speed Index', short: 'SI', unit: 'ms' },
  'total-byte-weight': { label: 'Total Byte Weight', short: 'Size', unit: 'KiB' },
  'interaction-to-next-paint': { label: 'Interaction to Next Paint', short: 'INP', unit: 'ms' },
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
      'speed-index',
      'total-byte-weight',
    ],
    summary: ['performance', 'largest-contentful-paint', 'total-blocking-time'],
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
  if (lhr.categories[id]) {
    return (lhr.categories[id].score ?? 0) * 100;
  }
  const value = lhr.audits[id]?.numericValue ?? 0;
  return metrics[id].unit === 'KiB' ? value / 1024 : value;
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

function withUnit(value, id) {
  return metrics[id].unit ? `${value} ${metrics[id].unit}` : `${value}`;
}

function delta(pr, base, id) {
  const difference = Number((pr - base).toFixed(metrics[id].decimals ?? 0));
  return withUnit(difference > 0 ? `+${difference}` : `${difference}`, id);
}

function formatReport({ pr, base, runs, baseSha, runUrl }) {
  const summary = steps
    .map((step, index) => ({ step, pr: pr[index], base: base[index] }))
    .filter(({ step }) => step.summary.length > 0)
    .map(({ step, pr, base }) => {
      const values = step.summary.map((id) =>
        id === 'performance'
          ? `Performance **${pr[id]}** (base ${base[id]}, ${delta(pr[id], base[id], id)})`
          : `${metrics[id].short} ${withUnit(pr[id], id)} (${delta(pr[id], base[id], id)})`,
      );
      return `${step.short}: ${values.join(', ')}`;
    });

  const tables = steps.flatMap((step, index) => [
    `| ${step.name} | PR | Base | Δ |`,
    '|---|---:|---:|---:|',
    ...step.metrics.map(
      (id) =>
        `| ${metrics[id].label} | ${withUnit(pr[index][id], id)} | ${withUnit(base[index][id], id)} | ${delta(pr[index][id], base[index][id], id)} |`,
    ),
    '',
  ]);

  return [
    marker,
    `🗼 **Lighthouse** · ${summary.join(' · ')}`,
    '',
    '<details>',
    '<summary>Details</summary>',
    '',
    `Median of ${runs} desktop runs of the bridge user flow. PR and base (${baseSha.slice(0, 7)}) runs alternate on the same runner. Δ is PR minus base.`,
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
