// Compares the browser benchmark of the PR with master and posts the result as a PR comment, see
// packages/arb-token-bridge-ui/tests/browser-bench/README.md. To print the report locally, run:
// node .github/browser-bench/report.js <results directory>
// The directory holds production.json and profiling.json, written by browserBench.run.ts, or
// production-<shard>.json and profiling-<shard>.json when CI splits the rounds between runners.
const fs = require('fs');
const path = require('path');

const marker = '<!-- browser-bench-report -->';
const resultsDirectory = 'browser-bench-results';

// A change counts when the median of the differences between the PR and master in each round is
// over both thresholds. They're starting points until the normal variation on CI is known, and
// timing changes never fail the job.
const thresholds = {
  absoluteMs: Number(process.env.BENCH_WARN_ABSOLUTE_MS ?? 20),
  relative: Number(process.env.BENCH_WARN_RELATIVE ?? 0.1),
};

const icons = { better: '🟢', same: '⚪', worse: '🔴', new: '🆕' };

const timingMetrics = [
  {
    key: 'duration',
    label: 'Completion',
    description: 'input to the first frame with the result',
  },
  {
    key: 'interactionLatency',
    label: 'Event Timing latency',
    description: 'longest event of the scripted interaction, input to next paint, not field INP',
  },
  { key: 'longTaskDuration', label: 'Long tasks', description: 'total during the interaction' },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const formatMs = (value) => `${value.toFixed(1)} ms`;
const formatPercent = (value) => `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;
const formatShare = (value) => `${Math.round(value * 100)}%`;

function readResults(directory, build) {
  const parts = fs
    .readdirSync(directory)
    .filter((file) => file === `${build}.json` || /^[a-z]+-\w+\.json$/.test(file))
    .filter((file) => file.split(/[-.]/)[0] === build)
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
  if (parts.length === 0) {
    return undefined;
  }
  return {
    meta: {
      ...parts[0].meta,
      samples: parts.reduce((total, part) => total + part.meta.samples, 0),
    },
    samples: parts.flatMap((part) => part.samples),
    unhandledRequests: [...new Set(parts.flatMap((part) => part.unhandledRequests))].sort(),
    errors: parts.flatMap((part) => part.errors),
  };
}

// Values of a metric for each target, by round
function collect(results, scenario, read) {
  const values = { pr: new Map(), master: new Map() };
  for (const sample of results.samples.filter((s) => s.scenario === scenario)) {
    const value = read(sample);
    if (value !== undefined && values[sample.target]) {
      values[sample.target].set(sample.round, value);
    }
  }
  return values;
}

function compare({ pr, master }) {
  const prMedian = median([...pr.values()]);
  if (master.size === 0) {
    return { pr: prMedian, status: 'new' };
  }
  const masterMedian = median([...master.values()]);
  const differences = [...pr.keys()]
    .filter((round) => master.has(round))
    .map((round) => pr.get(round) - master.get(round));
  const difference = median(differences);
  const relative = masterMedian === 0 ? Infinity : difference / masterMedian;
  const isChange =
    Math.abs(difference) >= thresholds.absoluteMs && Math.abs(relative) >= thresholds.relative;
  return {
    pr: prMedian,
    master: masterMedian,
    difference,
    relative,
    status: !isChange ? 'same' : difference > 0 ? 'worse' : 'better',
  };
}

// One section per scenario, with the production timings and the React render time of each
// <Profiler> subtree in the profiling build
function compareScenarios({ production, profiling }) {
  return production.meta.scenarios.map((scenario) => {
    // Event Timing only reports events of 16 ms or more, so a missing latency counts as 0
    const rows = timingMetrics.map(({ key, label, description }) => ({
      label,
      description,
      ...compare(collect(production, scenario, (sample) => sample[key] ?? 0)),
    }));
    if (profiling) {
      const ids = [
        ...new Set(
          profiling.samples
            .filter((s) => s.scenario === scenario)
            .flatMap((s) => Object.keys(s.profiler)),
        ),
      ].sort();
      for (const id of ids) {
        const commits = collect(profiling, scenario, (s) => s.profiler[id]?.commits);
        rows.push({
          label: `\`${id}\` render time`,
          description: `React profiling build, ${median([...commits.pr.values()])} commits in the PR`,
          ...compare(collect(profiling, scenario, (s) => s.profiler[id]?.actualTotal)),
        });
      }
    }
    return { scenario, rows };
  });
}

function formatDelta({ difference, relative }) {
  const delta = `${difference > 0 ? '+' : '−'}${formatMs(Math.abs(difference))}`;
  return Number.isFinite(relative) ? `${delta} (${formatPercent(relative)})` : delta;
}

// One collapsible section per status, with a nested one for each scenario that changed
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
    ...groups.flatMap(({ scenario, rows }) => [
      '<details>',
      `<summary>${scenario} — ${rows.map(({ label }) => label).join(', ')}</summary>`,
      '',
      '| Metric | Master | PR | Δ |',
      '|:---|---:|---:|---:|',
      ...rows.map((row) => {
        const name = `${row.label}<br><sub>${row.description}</sub>`;
        return status === 'new'
          ? `| ${name} | — | ${formatMs(row.pr)} | — |`
          : `| ${name} | ${formatMs(row.master)} | ${formatMs(row.pr)} | **${formatDelta(row)}** |`;
      }),
      '',
      '</details>',
      '',
    ]),
    '</details>',
    '',
  ];
}

function formatReport({ production, profiling, runUrl }) {
  if (!production) {
    throw new Error('Missing the results of the production build.');
  }
  const sections = compareScenarios({ production, profiling });
  const rows = sections.flatMap((section) => section.rows);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const changes = [
    ...formatChanges({ sections, status: 'worse', title: 'Regressions' }),
    ...formatChanges({ sections, status: 'better', title: 'Improvements' }),
    ...formatChanges({ sections, status: 'new', title: 'Not measured on master' }),
  ];
  const master = production.meta.targets.find(({ name }) => name === 'master');
  const regressions = sections.flatMap(({ scenario, rows: scenarioRows }) =>
    scenarioRows.filter((row) => row.status === 'worse').map((row) => `${scenario} · ${row.label}`),
  );
  const warnings = [
    ...production.errors,
    ...(profiling?.errors ?? []),
    ...(production.unhandledRequests.length > 0
      ? [
          `These requests have no generated response and failed like a network error: ${production.unhandledRequests.map((r) => `\`${r}\``).join(', ')}`,
        ]
      : []),
  ];

  return {
    regressions,
    body: [
      marker,
      '## ⏱️ Browser benchmark',
      '',
      `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
      '|:---:|:---:|:---:|',
      `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
      '',
      `${production.meta.samples} rounds in ${production.meta.browser}, compared with master${master ? ` at \`${master.revision.slice(0, 7)}\`` : ''}, each runner measuring both. A change counts when the median of the differences between rounds is over ${thresholds.absoluteMs} ms and ${formatShare(thresholds.relative)}. Timing changes don't fail the job until the normal variation on CI is known.`,
      '',
      ...warnings.flatMap((warning) => [`⚠️ ${warning}`, '']),
      ...(changes.length > 0 ? ['---', '', ...changes] : []),
      '---',
      '',
      `📄 Samples, browser traces and the report are attached to the [workflow run](${runUrl}).`,
    ].join('\n'),
  };
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  const { body, regressions } = formatReport({
    production: readResults(resultsDirectory, 'production'),
    profiling: readResults(resultsDirectory, 'profiling'),
    runUrl,
  });
  fs.writeFileSync(path.join(resultsDirectory, 'report.md'), body);
  await core.summary.addRaw(body).write();
  regressions.forEach((regression) => core.warning(`${regression} is slower than on master`));

  const pullRequest = context.payload.pull_request;
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

if (require.main === module) {
  const [directory = resultsDirectory] = process.argv.slice(2);
  const { body } = formatReport({
    production: readResults(directory, 'production'),
    profiling: readResults(directory, 'profiling'),
    runUrl: 'https://github.com',
  });
  fs.writeFileSync(path.join(directory, 'report.md'), body);
  console.log(body);
}
