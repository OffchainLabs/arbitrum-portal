// Compares the render profile of the PR with the same profile run on master, and posts the result
// as a PR comment. The profile is packages/arb-token-bridge-ui/src/components/MainContent/
// MainContent.profile.tsx. To read a profile locally, run:
// node .github/render-profile/report.js <render-profile.json> [<master render-profile.json>]
const fs = require('fs');

const marker = '<!-- render-profile-report -->';
const resultsFile = 'render-profile/pr/render-profile.json';
const baselineFile = 'render-profile/master/render-profile.json';
const rowsPerTable = 10;
// GitHub rejects comments longer than 65,536 characters
const maxLength = 60_000;

const icons = { better: '🟢', same: '⚪', worse: '🔴' };

function formatCount(value) {
  return value.toLocaleString('en-US');
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

// Lower is better for all of them. The profile renders the same way on every run, so any change
// comes from the code.
const metrics = [
  { key: 'renders', label: 'Renders', format: formatCount },
  { key: 'avoidableRenders', label: 'Avoidable renders', format: formatCount },
  { key: 'commits', label: 'Commits', format: formatCount },
  { key: 'requests', label: 'Requests', format: formatCount },
  { key: 'swrKeyLength', label: 'SWR keys hashed', format: formatSize },
  { key: 'swrCacheKeyLength', label: 'SWR cache keys', format: formatSize },
];

function readProfile(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
}

function getStatus(pr, base) {
  if (base === undefined || pr === base) {
    return 'same';
  }
  return pr < base ? 'better' : 'worse';
}

function formatDelta(difference, format) {
  return `${difference > 0 ? '+' : '−'}${format(Math.abs(difference))}`;
}

function formatPercent(pr, base) {
  const percent = Math.round((pr / base - 1) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

function formatCell({ pr, base, format }) {
  const status = getStatus(pr, base);
  if (base === undefined) {
    return format(pr);
  }
  if (status === 'same') {
    return `${format(pr)}<br><sub>${icons.same}</sub>`;
  }
  return `${format(pr)}<br><sub>${icons[status]} ${formatDelta(pr - base, format)}</sub>`;
}

// Render times vary by a few percent between runs, they're shown without a verdict
function formatDuration({ pr, base }) {
  const duration = `${formatCount(Math.round(pr))} ms`;
  return base === undefined ? duration : `${duration}<br><sub>${formatPercent(pr, base)}</sub>`;
}

function formatSummaryTable({ interactions, baseByName }) {
  return [
    `| Interaction | ${metrics.map(({ label }) => label).join(' | ')} | Render time |`,
    `|:---|${metrics.map(() => '---:|').join('')}---:|`,
    ...interactions.map((interaction) => {
      const base = baseByName.get(interaction.name);
      const cells = metrics.map(({ key, format }) =>
        formatCell({ pr: interaction[key], base: base?.[key], format }),
      );
      const duration = formatDuration({ pr: interaction.duration, base: base?.duration });
      return `| ${interaction.name} | ${cells.join(' | ')} | ${duration} |`;
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

function formatChangedComponents(interaction, base) {
  if (!base) {
    return [];
  }
  const baseRenders = new Map(base.components.map((c) => [c.component, c.renders]));
  const prRenders = new Map(interaction.components.map((c) => [c.component, c.renders]));
  const changed = [...new Set([...baseRenders.keys(), ...prRenders.keys()])]
    .map((component) => ({
      component,
      base: baseRenders.get(component) ?? 0,
      pr: prRenders.get(component) ?? 0,
    }))
    .filter(({ base, pr }) => base !== pr)
    .sort((a, b) => Math.abs(b.pr - b.base) - Math.abs(a.pr - a.base));
  if (changed.length === 0) {
    return [];
  }
  return [
    '| Component | Master | PR | Δ |',
    '|:---|---:|---:|---:|',
    ...changed
      .slice(0, rowsPerTable)
      .map(
        ({ component, base, pr }) =>
          `| \`${component}\` | ${formatCount(base)} | ${formatCount(pr)} | ${icons[getStatus(pr, base)]} ${formatDelta(pr - base, formatCount)} |`,
      ),
    ...(changed.length > rowsPerTable ? [`| … ${changed.length - rowsPerTable} more | | | |`] : []),
  ];
}

function formatAvoidableComponents(interaction) {
  const components = interaction.components
    .map((component) => ({
      ...component,
      avoidable: component.unstableReference + component.parent,
    }))
    .filter(({ avoidable }) => avoidable > 0)
    .sort((a, b) => b.avoidable - a.avoidable)
    .slice(0, rowsPerTable);
  if (components.length === 0) {
    return [];
  }
  return [
    '| Component | Renders | 🆕 | ✅ | 🔁 | ⬆️ | Main avoidable causes |',
    '|:---|---:|---:|---:|---:|---:|:---|',
    ...components.map(
      (c) =>
        `| \`${c.component}\` | ${c.renders} | ${c.mount} | ${c.needed} | ${c.unstableReference} | ${c.parent} | ${c.causes.join('<br>')} |`,
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
  return [
    `| ${label} | Master | PR |`,
    '|:---|---:|---:|',
    ...names
      .slice(0, rowsPerTable)
      .map(
        (name) =>
          `| \`${name}\` | ${format(base[name] ?? 0)} | ${formatCell({ pr: pr[name] ?? 0, base: base[name] ?? 0, format })} |`,
      ),
  ];
}

const toObject = (entries) => Object.fromEntries(entries.map(({ key, length }) => [key, length]));

function formatReport({ pr, base, baseSha, runUrl }) {
  const baseByName = new Map((base?.interactions ?? []).map((i) => [i.name, i]));
  const statuses = pr.interactions.flatMap((interaction) =>
    metrics.map(({ key }) => getStatus(interaction[key], baseByName.get(interaction.name)?.[key])),
  );
  const count = (status) => statuses.filter((s) => s === status).length;

  const sections = [
    ...formatSection({
      title: 'Components whose renders changed',
      interactions: pr.interactions,
      formatTable: (interaction) =>
        formatChangedComponents(interaction, baseByName.get(interaction.name)),
    }),
    ...formatSection({
      title: 'Components with the most avoidable renders',
      interactions: pr.interactions,
      formatTable: formatAvoidableComponents,
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
          `Renders of the bridge flow in the React development build, on master at \`${baseSha.slice(0, 7)}\` and on this PR. API responses are generated and timers follow a fake clock, so the counts are the same on every run and any change comes from the code. Render times vary by a few percent and are shown for information.`,
        ]
      : [
          "Renders of the bridge flow in the React development build. The profile couldn't run on master, so there's nothing to compare with yet, see the workflow run.",
        ]),
    '',
    ...(pr.unhandledRequests.length > 0
      ? [
          `⚠️ These requests have no generated response and failed like a network error. Add them to \`renderProfileNetwork.ts\`: ${pr.unhandledRequests.map((r) => `\`${r}\``).join(', ')}`,
          '',
        ]
      : []),
    ...formatSummaryTable({ interactions: pr.interactions, baseByName }),
    '',
    '- **Avoidable renders** are renders where only references changed (🔁, e.g. a missing `useMemo` or a selector returning a new object) or where nothing changed and the parent rendered (⬆️, `React.memo` would skip them). The others are mounts (🆕) and renders where a value changed (✅).',
    '- **SWR keys hashed** is the size of the SWR keys serialized on render. SWR hashes the key of every hook on every render, so a key holding a token list costs as much as the list each time.',
    '- **SWR cache keys** is the size of the keys in the SWR cache at the end of the interaction. SWR never removes them, so a key that changes on every refresh keeps growing memory.',
    '',
    ...(sections.length > 0 ? ['---', '', ...sections] : []),
    '---',
    '',
    `📄 The full profile is attached to the [workflow run](${runUrl}).`,
  ].join('\n');

  return report.length > maxLength
    ? `${report.slice(0, maxLength)}\n\n…truncated, see the [workflow run](${runUrl}).`
    : report;
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const pr = readProfile(resultsFile);
  if (!pr) {
    throw new Error('Missing render profile for the PR.');
  }

  const pullRequest = context.payload.pull_request;
  const body = formatReport({
    pr,
    // Missing when the profile couldn't run on master, e.g. before it existed
    base: readProfile(baselineFile),
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
  const [prFile, baseFile] = process.argv.slice(2);
  console.log(
    formatReport({
      pr: readProfile(prFile ?? 'packages/arb-token-bridge-ui/render-profile/render-profile.json'),
      base: baseFile ? readProfile(baseFile) : undefined,
      baseSha: 'master',
      runUrl: 'https://github.com',
    }),
  );
}
