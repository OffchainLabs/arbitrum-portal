// Compares the render profile of the PR with the same profile run on master, and posts the result
// as a PR comment. The profile is packages/arb-token-bridge-ui/src/components/MainContent/
// MainContent.profile.tsx. To read profiles locally, run:
// node .github/render-profile/report.js <PR profile or directory> [<master profile or directory>]
const fs = require('fs');
const path = require('path');

const marker = '<!-- render-profile-report -->';
// One directory per run, e.g. render-profile/pr/1/render-profile.json
const resultsDirectory = 'render-profile/pr';
const baselineDirectory = 'render-profile/master';
const rowsPerTable = 10;
// GitHub rejects comments longer than 65,536 characters
const maxLength = 60_000;
// Time changes smaller than this ratio, or than the spread of the runs, are noise
const minTimeRatio = 0.1;

const icons = { better: '🟢', same: '⚪', worse: '🔴' };

function formatCount(value) {
  return value.toLocaleString('en-US');
}

function formatTime(milliseconds) {
  return `${formatCount(Math.round(milliseconds))} ms`;
}

// Keys are ASCII, a character is a byte
function formatSize(characters) {
  const [value, unit] =
    characters >= 1e9
      ? [characters / 1e9, 'GB']
      : characters >= 1e6
        ? [characters / 1e6, 'MB']
        : [characters / 1e3, 'KB'];
  return `${value.toFixed(1)} ${unit}`;
}

// Lower is better for all of them. Counts are the same on every run, so any change comes from the
// code. Times are the median of the runs and change with the load of the runner.
const metrics = [
  { key: 'duration', label: 'Render time', format: formatTime, isTime: true },
  { key: 'avoidableDuration', label: 'Avoidable time', format: formatTime, isTime: true },
  { key: 'renders', label: 'Renders', format: formatCount },
  { key: 'avoidableRenders', label: 'Avoidable renders', format: formatCount },
  { key: 'commits', label: 'Commits', format: formatCount },
  { key: 'requests', label: 'Requests', format: formatCount },
  { key: 'swrKeyLength', label: 'SWR keys hashed', format: formatSize },
  { key: 'swrCacheKeyLength', label: 'SWR cache keys', format: formatSize },
];

function findProfiles(target) {
  if (!fs.existsSync(target)) {
    return [];
  }
  if (fs.statSync(target).isFile()) {
    return [target];
  }
  return fs
    .readdirSync(target, { recursive: true })
    .filter((file) => path.basename(file) === 'render-profile.json')
    .sort()
    .map((file) => path.join(target, file));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Range of the runs relative to their median
function spread(values) {
  const middle = median(values);
  return middle === 0 ? 0 : (Math.max(...values) - Math.min(...values)) / middle;
}

function withoutTimes(profile) {
  return JSON.stringify(
    profile.interactions.map(({ duration, avoidableDuration, components, ...interaction }) => ({
      ...interaction,
      components: components.map(({ selfDuration, avoidableDuration, ...component }) => component),
    })),
  );
}

// Counts come from the first run, times are the median of all runs
function readRuns(target) {
  const runs = findProfiles(target).map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  const [first] = runs;
  if (!first) {
    return undefined;
  }
  const interactions = first.interactions.map((interaction, index) => {
    const samples = runs.map((run) => run.interactions[index]);
    const componentTimes = (component, key) =>
      median(
        samples.map(
          (sample) => sample.components.find((c) => c.component === component)?.[key] ?? 0,
        ),
      );
    return {
      ...interaction,
      duration: median(samples.map((sample) => sample.duration)),
      durationSpread: spread(samples.map((sample) => sample.duration)),
      avoidableDuration: median(samples.map((sample) => sample.avoidableDuration)),
      avoidableDurationSpread: spread(samples.map((sample) => sample.avoidableDuration)),
      components: interaction.components.map((component) => ({
        ...component,
        selfDuration: componentTimes(component.component, 'selfDuration'),
        avoidableDuration: componentTimes(component.component, 'avoidableDuration'),
      })),
    };
  });
  return {
    ...first,
    interactions,
    runs: runs.length,
    isRepeatable: runs.every((run) => withoutTimes(run) === withoutTimes(first)),
  };
}

function getStatus({ pr, base, threshold = 0 }) {
  if (base === undefined || Math.abs(pr - base) <= threshold * base) {
    return 'same';
  }
  return pr < base ? 'better' : 'worse';
}

function compareMetric({ metric, interaction, base }) {
  const pr = interaction[metric.key];
  const baseValue = base?.[metric.key];
  const threshold = metric.isTime
    ? Math.max(
        minTimeRatio,
        interaction[`${metric.key}Spread`] ?? 0,
        base?.[`${metric.key}Spread`] ?? 0,
      )
    : 0;
  return { pr, base: baseValue, status: getStatus({ pr, base: baseValue, threshold }) };
}

function formatDelta(difference, format) {
  return `${difference > 0 ? '+' : '−'}${format(Math.abs(difference))}`;
}

function formatPercent(pr, base) {
  const percent = Math.round((pr / base - 1) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

function formatCell({ pr, base, status }, metric) {
  if (base === undefined) {
    return metric.format(pr);
  }
  const delta = metric.isTime ? formatPercent(pr, base) : formatDelta(pr - base, metric.format);
  return status === 'same' && !metric.isTime
    ? `${metric.format(pr)}<br><sub>${icons.same}</sub>`
    : `${metric.format(pr)}<br><sub>${icons[status]} ${delta}</sub>`;
}

function formatSummaryTable({ interactions, baseByName }) {
  return [
    `| Interaction | ${metrics.map(({ label }) => label).join(' | ')} |`,
    `|:---|${metrics.map(() => '---:|').join('')}`,
    ...interactions.map((interaction) => {
      const base = baseByName.get(interaction.name);
      const cells = metrics.map((metric) =>
        formatCell(compareMetric({ metric, interaction, base }), metric),
      );
      return `| ${interaction.name} | ${cells.join(' | ')} |`;
    }),
  ];
}

function details(summary, lines) {
  return lines.length === 0
    ? []
    : ['<details>', `<summary>${summary}</summary>`, '', ...lines, '', '</details>', ''];
}

// One collapsible section, with a table per interaction
function formatSection({ title, interactions, formatTable }) {
  const tables = interactions.flatMap((interaction) => {
    const table = formatTable(interaction);
    return table.length === 0 ? [] : [`**${interaction.name}**`, '', ...table, ''];
  });
  return details(`<b>${title}</b>`, tables);
}

// Components whose render count changed, the largest time difference first
function formatChangedComponents(interaction, base) {
  if (!base) {
    return [];
  }
  const baseComponents = new Map(base.components.map((c) => [c.component, c]));
  const prComponents = new Map(interaction.components.map((c) => [c.component, c]));
  const changed = [...new Set([...baseComponents.keys(), ...prComponents.keys()])]
    .map((component) => ({
      component,
      base: baseComponents.get(component) ?? { renders: 0, selfDuration: 0 },
      pr: prComponents.get(component) ?? { renders: 0, selfDuration: 0 },
    }))
    .filter(({ base, pr }) => base.renders !== pr.renders)
    .sort(
      (a, b) =>
        Math.abs(b.pr.selfDuration - b.base.selfDuration) -
        Math.abs(a.pr.selfDuration - a.base.selfDuration),
    );
  if (changed.length === 0) {
    return [];
  }
  return [
    '| Component | Renders on master | Renders on PR | Time on master | Time on PR |',
    '|:---|---:|---:|---:|---:|',
    ...changed
      .slice(0, rowsPerTable)
      .map(
        ({ component, base, pr }) =>
          `| \`${component}\` | ${formatCount(base.renders)} | ${formatCount(pr.renders)} ${icons[getStatus({ pr: pr.renders, base: base.renders })]} | ${formatTime(base.selfDuration)} | ${formatTime(pr.selfDuration)} |`,
      ),
    ...(changed.length > rowsPerTable
      ? [`| … ${changed.length - rowsPerTable} more | | | | |`]
      : []),
  ];
}

// 10 avoidable renders of 100 ms cost more than 100 of 1 ms, so components are sorted by time
function formatAvoidableComponents(interaction) {
  const components = interaction.components
    .map((component) => ({
      ...component,
      avoidable: component.unstableReference + component.parent,
    }))
    .filter(({ avoidable }) => avoidable > 0)
    .sort((a, b) => b.avoidableDuration - a.avoidableDuration)
    .slice(0, rowsPerTable);
  if (components.length === 0) {
    return [];
  }
  return [
    '| Component | Avoidable time | Avoidable renders | Time per render | 🔁 | ⬆️ | Main avoidable causes |',
    '|:---|---:|---:|---:|---:|---:|:---|',
    ...components.map(
      (c) =>
        `| \`${c.component}\` | ${formatTime(c.avoidableDuration)} | ${c.avoidable} of ${c.renders} | ${(c.avoidableDuration / c.avoidable).toFixed(1)} ms | ${c.unstableReference} | ${c.parent} | ${c.causes.join('<br>')} |`,
    ),
  ];
}

// Compares two { name: value } objects, rows of both, the largest PR values first
function formatBreakdown({ pr, base, label, format }) {
  const names = [...new Set([...Object.keys(pr), ...Object.keys(base ?? {})])].sort(
    (a, b) => (pr[b] ?? 0) - (pr[a] ?? 0),
  );
  if (names.length === 0) {
    return [];
  }
  if (!base) {
    return [
      `| ${label} | PR |`,
      '|:---|---:|',
      ...names.slice(0, rowsPerTable).map((name) => `| \`${name}\` | ${format(pr[name])} |`),
    ];
  }
  const metric = { format };
  return [
    `| ${label} | Master | PR |`,
    '|:---|---:|---:|',
    ...names.slice(0, rowsPerTable).map((name) => {
      const comparison = { pr: pr[name] ?? 0, base: base[name] ?? 0 };
      const cell = formatCell({ ...comparison, status: getStatus(comparison) }, metric);
      return `| \`${name}\` | ${format(comparison.base)} | ${cell} |`;
    }),
  ];
}

const toObject = (entries) => Object.fromEntries(entries.map(({ key, length }) => [key, length]));

function formatWarnings({ pr, base }) {
  const warnings = [
    ...[
      ['this PR', pr],
      ['master', base],
    ]
      .filter(([, profile]) => profile && !profile.isRepeatable)
      .map(
        ([side]) =>
          `⚠️ The counts differed between the runs of ${side}, something in the profile depends on timing. The report uses the first run.`,
      ),
    ...(pr.unhandledRequests.length > 0
      ? [
          `⚠️ These requests have no generated response and failed like a network error. Add them to \`renderProfileNetwork.ts\`: ${pr.unhandledRequests.map((r) => `\`${r}\``).join(', ')}`,
        ]
      : []),
  ];
  return warnings.flatMap((warning) => [warning, '']);
}

function formatReport({ pr, base, baseSha, runUrl }) {
  const baseByName = new Map((base?.interactions ?? []).map((i) => [i.name, i]));
  const statuses = pr.interactions.flatMap((interaction) =>
    metrics.map(
      (metric) =>
        compareMetric({ metric, interaction, base: baseByName.get(interaction.name) }).status,
    ),
  );
  const count = (status) => statuses.filter((s) => s === status).length;

  const sections = [
    ...formatSection({
      title: 'Components with the most avoidable render time',
      interactions: pr.interactions,
      formatTable: formatAvoidableComponents,
    }),
    ...formatSection({
      title: 'Components whose renders changed',
      interactions: pr.interactions,
      formatTable: (interaction) =>
        formatChangedComponents(interaction, baseByName.get(interaction.name)),
    }),
    ...formatSection({
      title: 'SWR keys hashed on render, by hook',
      interactions: pr.interactions,
      formatTable: (interaction) =>
        formatBreakdown({
          pr: toObject(interaction.swrKeys),
          base: baseByName.has(interaction.name)
            ? toObject(baseByName.get(interaction.name).swrKeys)
            : undefined,
          label: 'Key',
          format: formatSize,
        }),
    }),
    ...formatSection({
      title: 'Requests by endpoint',
      interactions: pr.interactions,
      formatTable: (interaction) =>
        formatBreakdown({
          pr: interaction.requestsByEndpoint,
          base: baseByName.get(interaction.name)?.requestsByEndpoint,
          label: 'Endpoint',
          format: formatCount,
        }),
    }),
  ];

  const report = [
    marker,
    '## ⚛️ Render profile',
    '',
    ...(base
      ? [
          `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
          '|:---:|:---:|:---:|',
          `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
          '',
          `Renders of the bridge flow in the React development build, on master at \`${baseSha.slice(0, 7)}\` and on this PR, ${pr.runs} runs each, alternating. API responses are generated and timers follow a fake clock, so the counts are the same on every run and any change comes from the code. Times are the median of the runs, and a time change counts when it's over ${minTimeRatio * 100}% and over the spread of the runs.`,
        ]
      : [
          `Renders of the bridge flow in the React development build, median of ${pr.runs} runs. The profile couldn't run on master, so there's nothing to compare with, see the workflow run.`,
        ]),
    '',
    ...formatWarnings({ pr, base }),
    ...formatSummaryTable({ interactions: pr.interactions, baseByName }),
    '',
    '- **Render time** is the time React spent rendering, from its profiling timers. The development build is slower than production, so compare it with master, not with Lighthouse.',
    "- **Avoidable time** is the time components spent in avoidable renders, without their children's. A render is avoidable when only references changed (🔁, e.g. a missing `useMemo` or a selector returning a new object), or when nothing changed and the parent rendered (⬆️, `React.memo` would skip it).",
    '- **SWR keys hashed** is the size of the SWR keys serialized on render. SWR hashes the key of every hook on every render, so a key holding a token list costs as much as the list each time.',
    '- **SWR cache keys** is the size of the keys in the SWR cache at the end of the interaction. SWR never removes them, so a key that changes on every refresh keeps growing memory.',
    '',
    ...(sections.length > 0 ? ['---', '', ...sections] : []),
    '---',
    '',
    `📄 The full profiles are attached to the [workflow run](${runUrl}).`,
  ].join('\n');

  return report.length > maxLength
    ? `${report.slice(0, maxLength)}\n\n…truncated, see the [workflow run](${runUrl}).`
    : report;
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const pr = readRuns(resultsDirectory);
  if (!pr) {
    throw new Error('Missing render profile for the PR.');
  }

  const pullRequest = context.payload.pull_request;
  const body = formatReport({
    pr,
    // Missing when the profile couldn't run on master
    base: readRuns(baselineDirectory),
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

if (require.main === module) {
  const [prPath, basePath] = process.argv.slice(2);
  const pr = readRuns(prPath ?? 'packages/arb-token-bridge-ui/render-profile');
  if (!pr) {
    throw new Error(`No render-profile.json in ${prPath}.`);
  }
  console.log(
    formatReport({
      pr,
      base: basePath ? readRuns(basePath) : undefined,
      baseSha: 'master',
      runUrl: 'https://github.com',
    }),
  );
}
