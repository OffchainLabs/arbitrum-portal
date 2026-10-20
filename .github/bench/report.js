// Compares the benchmarks of the PR against the same benchmarks run on master, on the same
// runner, and posts the result as a PR comment. Each value is the mean time per operation.
const fs = require('fs');

const marker = '<!-- bench-report -->';
const resultsFile = 'bench-results/pr.json';
const baselineFile = 'bench-results/master.json';

// Changes smaller than this ratio, or than the combined margin of error of both runs, are noise
const minRatio = 0.1;

const icons = { better: '🟢', same: '⚪', worse: '🔴', new: '🆕', failed: '❌' };

// Benchmarks are keyed by file, describe blocks and name, which are the same on master and the
// PR because the PR's bench files are copied into the master checkout
function readBenchmarks(file) {
  if (!fs.existsSync(file)) {
    return undefined;
  }
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(
    report.files.flatMap(({ groups }) =>
      groups.flatMap(({ fullName, benchmarks }) =>
        benchmarks.map((benchmark) => [
          `${fullName} > ${benchmark.name}`,
          // fullName starts with the file path, which isn't needed to tell groups apart
          { ...benchmark, group: fullName.split(' > ').slice(1).join(' › ') },
        ]),
      ),
    ),
  );
}

// Vitest doesn't fail the run when a benchmark throws, it only leaves out its statistics
function hasFailed(benchmark) {
  return typeof benchmark.mean !== 'number';
}

function compare(pr, base) {
  if (hasFailed(pr)) {
    return { status: 'failed' };
  }
  // A benchmark that fails on master, e.g. because the PR adds the function, is new
  if (!base || hasFailed(base)) {
    return { status: 'new' };
  }
  const ratio = pr.mean / base.mean - 1;
  // rme is the relative margin of error of the mean, in percent
  const threshold = Math.max(minRatio, (pr.rme + base.rme) / 100);
  if (Math.abs(ratio) < threshold) {
    return { ratio, status: 'same' };
  }
  return { ratio, status: ratio < 0 ? 'better' : 'worse' };
}

// Benchmarks report times in milliseconds
function formatTime(milliseconds) {
  const absolute = Math.abs(milliseconds);
  const [value, unit] =
    absolute >= 1
      ? [milliseconds, 'ms']
      : absolute >= 0.001
        ? [milliseconds * 1_000, 'µs']
        : [milliseconds * 1_000_000, 'ns'];
  return `${Number(value.toPrecision(3))} ${unit}`;
}

function formatDelta({ pr, base, ratio }) {
  const difference = pr.mean - base.mean;
  const percent = Math.round(ratio * 100);
  return `${difference > 0 ? '+' : ''}${formatTime(difference)} (${percent > 0 ? '+' : ''}${percent}%)`;
}

// The function name, e.g. "formatAmount" for "formatAmount, 1000 numbers"
function shortName(name) {
  return name.split(',')[0];
}

function groupByDescribe(rows) {
  const groups = new Map();
  rows.forEach((row) => groups.set(row.pr.group, [...(groups.get(row.pr.group) ?? []), row]));
  return [...groups.entries()];
}

// One collapsible section per status, with a nested one for each describe block that changed
function formatChanges({ rows, status, title }) {
  const changed = rows.filter((row) => row.status === status);
  if (changed.length === 0) {
    return [];
  }

  return [
    '<details>',
    `<summary><b>${icons[status]} ${title} (${changed.length})</b></summary>`,
    '',
    ...groupByDescribe(changed).flatMap(([group, groupRows]) => [
      '<details>',
      `<summary>${group} — ${[...new Set(groupRows.map((row) => shortName(row.pr.name)))].join(', ')}</summary>`,
      '',
      ...(status === 'failed'
        ? groupRows.map((row) => `- ${row.pr.name}`)
        : status === 'new'
          ? [
              '| Benchmark | PR |',
              '|:---|---:|',
              ...groupRows.map(
                (row) =>
                  `| ${row.pr.name}<br><sub>⬇️ lower is better</sub> | ${formatTime(row.pr.mean)} |`,
              ),
            ]
          : [
              '| Benchmark | Master | PR | Δ |',
              '|:---|---:|---:|---:|',
              ...groupRows.map(
                (row) =>
                  `| ${row.pr.name}<br><sub>⬇️ lower is better</sub> | ${formatTime(row.base.mean)} | ${formatTime(row.pr.mean)} | **${formatDelta(row)}** |`,
              ),
            ]),
      '',
      '</details>',
      '',
    ]),
    '</details>',
    '',
  ];
}

function compareAll({ pr, base }) {
  return [...pr.entries()].map(([key, prResult]) => {
    const baseResult = base?.get(key);
    return { pr: prResult, base: baseResult, ...compare(prResult, baseResult) };
  });
}

function formatReport({ rows, hasBase, baseSha, runUrl }) {
  const count = (status) => rows.filter((row) => row.status === status).length;
  const changes = [
    ...formatChanges({ rows, status: 'worse', title: 'Regressions' }),
    ...formatChanges({ rows, status: 'better', title: 'Improvements' }),
    ...formatChanges({ rows, status: 'new', title: 'New benchmarks' }),
    ...formatChanges({ rows, status: 'failed', title: 'Failed benchmarks' }),
  ];

  return [
    marker,
    '## ⏱️ Benchmark report',
    '',
    `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
    '|:---:|:---:|:---:|',
    `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
    '',
    `Mean time per operation of ${rows.length} benchmarks of the bridge's pure functions, run on master at \`${baseSha.slice(0, 7)}\` and on this PR on the same runner. Changes count when they exceed both ${minRatio * 100}% and the combined margin of error of the two runs.`,
    '',
    ...(hasBase ? [] : ["⚠️ The benchmarks couldn't run on master, see the workflow run.", '']),
    ...(changes.length > 0 ? ['---', '', ...changes] : []),
    '---',
    '',
    `📄 Raw results are attached to the [workflow run](${runUrl}).`,
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const pr = readBenchmarks(resultsFile);

  if (!pr || pr.size === 0) {
    throw new Error('Missing benchmark results for the PR.');
  }

  const pullRequest = context.payload.pull_request;
  // Missing when the benchmarks couldn't run on master, then every benchmark is new
  const base = readBenchmarks(baselineFile);
  const rows = compareAll({ pr, base });
  const body = formatReport({
    rows,
    hasBase: base !== undefined,
    baseSha: pullRequest.base.sha,
    runUrl: `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`,
  });

  await core.summary.addRaw(body).write();

  const failed = rows.filter((row) => row.status === 'failed');
  if (failed.length > 0) {
    core.setFailed(`Benchmarks failed: ${failed.map((row) => row.pr.name).join(', ')}`);
  }

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
