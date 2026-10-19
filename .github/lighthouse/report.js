// Compares the Lighthouse runs of the PR build against the base build and
// posts the result as a PR comment. Both builds are measured on the same runner,
// and each value is the median of all runs, to keep the comparison stable.
const fs = require('fs');
const path = require('path');

const marker = '<!-- lighthouse-report -->';

const categories = [
  { id: 'performance', label: 'Performance' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'best-practices', label: 'Best Practices' },
  { id: 'seo', label: 'SEO' },
];

const audits = [
  { id: 'first-contentful-paint', label: 'First Contentful Paint', short: 'FCP', unit: 'ms' },
  { id: 'largest-contentful-paint', label: 'Largest Contentful Paint', short: 'LCP', unit: 'ms' },
  { id: 'total-blocking-time', label: 'Total Blocking Time', short: 'TBT', unit: 'ms' },
  { id: 'cumulative-layout-shift', label: 'Cumulative Layout Shift', short: 'CLS', unit: '' },
  { id: 'speed-index', label: 'Speed Index', short: 'SI', unit: 'ms' },
  { id: 'total-byte-weight', label: 'Total Byte Weight', short: 'Size', unit: 'KiB' },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, unit) {
  if (unit === 'KiB') return Math.round(value / 1024);
  if (unit === 'ms') return Math.round(value);
  return Number(value.toFixed(3));
}

function summarize(lhrs) {
  const values = {};
  for (const { id } of categories) {
    values[id] = Math.round(median(lhrs.map((lhr) => (lhr.categories[id]?.score ?? 0) * 100)));
  }
  for (const { id, unit } of audits) {
    values[id] = round(median(lhrs.map((lhr) => lhr.audits[id]?.numericValue ?? 0)), unit);
  }
  return values;
}

function withUnit(value, unit) {
  return unit ? `${value} ${unit}` : `${value}`;
}

function delta(pr, base, unit = '') {
  const difference = Number((pr - base).toFixed(3));
  return withUnit(difference > 0 ? `+${difference}` : `${difference}`, unit);
}

function formatReport({ pr, base, runs, pagePath, baseSha, runUrl }) {
  const performance = `Performance **${pr.performance}** (base ${base.performance}, ${delta(pr.performance, base.performance)})`;
  const keyMetrics = audits
    .filter(({ short }) => ['LCP', 'TBT', 'CLS'].includes(short))
    .map(
      ({ id, short, unit }) =>
        `${short} ${withUnit(pr[id], unit)} (${delta(pr[id], base[id], unit)})`,
    );

  const rows = [
    ...categories.map(
      ({ id, label }) => `| ${label} | ${pr[id]} | ${base[id]} | ${delta(pr[id], base[id])} |`,
    ),
    ...audits.map(
      ({ id, label, unit }) =>
        `| ${label} | ${withUnit(pr[id], unit)} | ${withUnit(base[id], unit)} | ${delta(pr[id], base[id], unit)} |`,
    ),
  ];

  return [
    marker,
    `🗼 **Lighthouse** · ${[performance, ...keyMetrics].join(' · ')}`,
    '',
    '<details>',
    '<summary>Details</summary>',
    '',
    `Median of ${runs} desktop runs of \`${pagePath}\` with simulated throttling. The PR and its base (${baseSha.slice(0, 7)}) are built and measured on the same runner. Δ is PR minus base.`,
    '',
    '| | PR | Base | Δ |',
    '|---|---:|---:|---:|',
    ...rows,
    '',
    `Full reports are attached to the [workflow run](${runUrl}).`,
    '',
    '</details>',
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const { RESULTS_PATH, PR_URL, BASE_URL } = process.env;
  const manifest = JSON.parse(fs.readFileSync(path.join(RESULTS_PATH, 'manifest.json'), 'utf8'));
  const lhrs = manifest.map(({ jsonPath }) =>
    JSON.parse(fs.readFileSync(path.resolve(RESULTS_PATH, jsonPath), 'utf8')),
  );
  // LHCI replaces ports in the manifest URLs, so match on the requested URL instead
  const lhrsFor = (url) =>
    lhrs.filter(({ requestedUrl }) => new URL(requestedUrl).origin === new URL(url).origin);
  const prLhrs = lhrsFor(PR_URL);
  const baseLhrs = lhrsFor(BASE_URL);

  if (prLhrs.length === 0 || baseLhrs.length === 0) {
    throw new Error('Missing Lighthouse results for the PR or base build.');
  }

  const { owner, repo } = context.repo;
  const pullRequest = context.payload.pull_request;
  const body = formatReport({
    pr: summarize(prLhrs),
    base: summarize(baseLhrs),
    runs: prLhrs.length,
    pagePath: new URL(PR_URL).pathname,
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
