// Compares the render profile of the PR with the same profile run on master, and posts the result
// as a PR comment. The profile is packages/arb-token-bridge-ui/src/components/MainContent/
// MainContent.profile.tsx. To compare profiles locally, run:
// node .github/render-profile/report.js <PR profile or directory> <master profile or directory>
const fs = require('fs');
const path = require('path');

const marker = '<!-- render-profile-report -->';
// One directory per run, e.g. render-profile/pr/1/render-profile.json
const resultsDirectory = 'render-profile/pr';
const baselineDirectory = 'render-profile/master';
const componentsPerInteraction = 5;

const icons = { better: '🟢', same: '⚪', worse: '🔴', new: '🆕' };

// Keys are ASCII, a character is a byte
function formatSize(characters) {
  const [value, unit] =
    Math.abs(characters) >= 1e9
      ? [characters / 1e9, 'GB']
      : Math.abs(characters) >= 1e6
        ? [characters / 1e6, 'MB']
        : [characters / 1e3, 'KB'];
  return `${value.toFixed(1)} ${unit}`;
}

function formatCount(value) {
  return Math.round(value).toLocaleString('en-US');
}

function formatTime(milliseconds) {
  return `${formatCount(milliseconds)} ms`;
}

// Counts are the same on every run, so any change comes from the code. Times change with the load
// of the runner, so they're the median of the runs and need a larger change to count.
const metrics = {
  speed: {
    label: 'Time of all components',
    format: (value) => `${Math.round(value * 100)}%`,
    minRatio: 0.1,
    description: "median across components, compared with master's",
  },
  duration: { label: 'Render time', format: formatTime, minRatio: 0.1 },
  renders: { label: 'Renders', format: formatCount },
  avoidableRenders: {
    label: 'Avoidable renders',
    format: formatCount,
    description: 'only references changed, or nothing changed and the parent rendered',
  },
  commits: { label: 'Commits', format: formatCount },
  requests: { label: 'Requests', format: formatCount },
  swrKeyLength: {
    label: 'SWR keys hashed',
    format: formatSize,
    description: 'SWR serializes and hashes the key of every hook on every render',
  },
  swrCacheKeyLength: {
    label: 'SWR cache keys',
    format: formatSize,
    description: 'SWR never removes them from its cache',
  },
};

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
    .map((file) => path.join(target, file));
}

function withoutTimes(profile) {
  return JSON.stringify(
    profile.interactions.map(({ duration, components, ...interaction }) => ({
      ...interaction,
      components: components.map(({ selfDuration, ...component }) => component),
    })),
  );
}

function loadRuns(target) {
  return findProfiles(target).map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
}

// Shorter components are too noisy to tell how fast a run was
const minReferenceTime = 2;

// A whole run is often faster or slower than the others, e.g. depending on garbage collection, and
// every component in it by about the same factor. The factor of a run is the median ratio between
// the time of its components and their median time across all runs of master and the PR.
function getSpeedFactors(runs) {
  const times = new Map();
  runs.forEach((run) =>
    run.interactions.forEach(({ name, components }) =>
      components.forEach(({ component, selfDuration }) => {
        const key = `${name} › ${component}`;
        times.set(key, [...(times.get(key) ?? []), selfDuration]);
      }),
    ),
  );
  const reference = new Map([...times].map(([key, values]) => [key, median(values)]));
  return runs.map((run) =>
    median(
      run.interactions.flatMap(({ name, components }) =>
        components
          .filter(({ component }) => reference.get(`${name} › ${component}`) >= minReferenceTime)
          .map(
            ({ component, selfDuration }) => selfDuration / reference.get(`${name} › ${component}`),
          ),
      ),
    ),
  );
}

// Counts come from the first run. Times are divided by the speed factor of their run, then the
// median of the runs is taken.
function summarize(runs, factors) {
  const [first] = runs;
  const interactions = first.interactions.map((interaction, index) => {
    const samples = runs.map((run, runIndex) => ({
      ...run.interactions[index],
      factor: factors[runIndex],
    }));
    const durations = samples.map(({ duration, factor }) => duration / factor);
    return {
      ...interaction,
      duration: median(durations),
      durationSpread: deviation(durations),
      components: interaction.components.map((component) => ({
        ...component,
        selfDuration: median(
          samples.map(
            ({ components, factor }) =>
              (components.find((c) => c.component === component.component)?.selfDuration ?? 0) /
              factor,
          ),
        ),
      })),
    };
  });
  return {
    ...first,
    interactions,
    runs: runs.length,
    speed: median(factors),
    speedSpread: deviation(factors),
    isRepeatable: runs.every((run) => withoutTimes(run) === withoutTimes(first)),
  };
}

function readProfiles({ prTarget, baseTarget }) {
  const prRuns = loadRuns(prTarget);
  const baseRuns = baseTarget ? loadRuns(baseTarget) : [];
  if (prRuns.length === 0) {
    throw new Error(`Missing render profile for the PR in ${prTarget}.`);
  }
  const factors = getSpeedFactors([...prRuns, ...baseRuns]);
  const base = baseRuns.length > 0 ? summarize(baseRuns, factors.slice(prRuns.length)) : undefined;
  const pr = summarize(prRuns, factors.slice(0, prRuns.length));
  // Machine noise affects both the same way, so a different factor means most components changed
  if (base) {
    pr.speed /= base.speed;
    pr.speedSpread /= base.speed;
    base.speedSpread /= base.speed;
    base.speed = 1;
  }
  return { pr, base };
}

function compare({ id, pr, base }) {
  const difference = pr[id] - base[id];
  const { minRatio = 0 } = metrics[id];
  // Some runs on a shared runner are much slower than others, so time changes also need to
  // exceed three times the spread of the runs to count, like in the Lighthouse report
  const threshold = Math.max(
    minRatio * base[id],
    3 * Math.max(pr[`${id}Spread`] ?? 0, base[`${id}Spread`] ?? 0),
  );
  if (difference === 0 || Math.abs(difference) <= threshold) {
    return { difference, status: 'same' };
  }
  return { difference, status: difference < 0 ? 'better' : 'worse' };
}

function formatDelta({ id, difference, base }) {
  const { format } = metrics[id];
  const delta = `${difference > 0 ? '+' : '−'}${format(Math.abs(difference))}`;
  if (base === 0 || id === 'speed') {
    return delta;
  }
  const percent = Math.round((difference / base) * 100);
  return `${delta} (${percent > 0 ? '+' : ''}${percent}%)`;
}

// The components whose render time changed the most, to tell where a change comes from
function formatComponents({ pr, base }) {
  const baseComponents = new Map(base.components.map((c) => [c.component, c]));
  const prComponents = new Map(pr.components.map((c) => [c.component, c]));
  const empty = { renders: 0, selfDuration: 0 };
  const components = [...new Set([...baseComponents.keys(), ...prComponents.keys()])]
    .map((component) => ({
      component,
      base: baseComponents.get(component) ?? empty,
      pr: prComponents.get(component) ?? empty,
    }))
    .map((row) => ({ ...row, difference: row.pr.selfDuration - row.base.selfDuration }))
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, componentsPerInteraction);
  return [
    '',
    `Components whose render time changed the most, without their children:`,
    '',
    '| Component | Renders | Master | PR | Δ |',
    '|:---|---:|---:|---:|---:|',
    ...components.map(
      ({ component, base: b, pr: p, difference }) =>
        `| \`${component}\` | ${b.renders === p.renders ? formatCount(p.renders) : `${formatCount(b.renders)} → ${formatCount(p.renders)}`} | ${formatTime(b.selfDuration)} | ${formatTime(p.selfDuration)} | ${difference > 0 ? '+' : '−'}${formatTime(Math.abs(difference))} |`,
    ),
  ];
}

// One collapsible section per status, with a nested one for each interaction that changed
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
    ...groups.flatMap(({ name, rows, pr, base }) => [
      '<details>',
      `<summary>${name} — ${rows.map(({ id }) => metrics[id].label).join(', ')}</summary>`,
      '',
      '| Metric | Master | PR | Δ |',
      '|:---|---:|---:|---:|',
      ...rows.map(({ id, ...row }) => {
        const { label, format, description } = metrics[id];
        const note = description ? `<br><sub>${description}</sub>` : '';
        return status === 'new'
          ? `| ${label}${note} | — | ${format(row.pr)} | — |`
          : `| ${label}${note} | ${format(row.base)} | ${format(row.pr)} | **${formatDelta({ id, ...row })}** |`;
      }),
      ...(base && rows.some(({ id }) => id === 'duration' || id === 'renders')
        ? formatComponents({ pr, base })
        : []),
      '',
      '</details>',
      '',
    ]),
    '</details>',
    '',
  ];
}

function formatWarnings({ pr, base }) {
  return [
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
          `⚠️ These requests have no generated response and failed like a network error, add them to \`renderProfileNetwork.ts\`: ${pr.unhandledRequests.map((r) => `\`${r}\``).join(', ')}`,
        ]
      : []),
  ].flatMap((warning) => [warning, '']);
}

function formatReport({ pr, base, baseSha, runUrl }) {
  // Interactions are matched by name, so interactions added by the PR are new
  const sections = pr.interactions.map((interaction) => {
    const baseInteraction = base?.interactions.find(({ name }) => name === interaction.name);
    return {
      name: interaction.name,
      pr: interaction,
      base: baseInteraction,
      rows: Object.keys(metrics)
        .filter((id) => id !== 'speed')
        .map((id) =>
          baseInteraction
            ? {
                id,
                pr: interaction[id],
                base: baseInteraction[id],
                ...compare({ id, pr: interaction, base: baseInteraction }),
              }
            : { id, pr: interaction[id], status: 'new' },
        ),
    };
  });

  if (base) {
    sections.unshift({
      name: 'All interactions',
      rows: [
        { id: 'speed', pr: pr.speed, base: base.speed, ...compare({ id: 'speed', pr, base }) },
      ],
    });
  }
  const rows = sections.flatMap((section) => section.rows);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const changes = [
    ...formatChanges({ sections, status: 'worse', title: 'Regressions' }),
    ...formatChanges({ sections, status: 'better', title: 'Improvements' }),
    ...formatChanges({ sections, status: 'new', title: 'Not measured on master' }),
  ];

  return [
    marker,
    '## ⚛️ Render profile',
    '',
    `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
    '|:---:|:---:|:---:|',
    `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
    '',
    `React renders of the bridge flow in Vitest, ${pr.runs} runs alternating master at \`${baseSha.slice(0, 7)}\` and this PR. API responses are generated and timers follow a fake clock, so counts are the same on every run. Render time is in the React development build: each run is scaled by how fast it was as a whole, then the median is taken.`,
    '',
    ...formatWarnings({ pr, base }),
    ...(changes.length > 0 ? ['---', '', ...changes] : []),
    '---',
    '',
    `📄 Full profiles are attached to the [workflow run](${runUrl}).`,
  ].join('\n');
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const { pr, base } = readProfiles({
    prTarget: resultsDirectory,
    // Missing when the profile couldn't run on master, then every value is new
    baseTarget: baselineDirectory,
  });

  const pullRequest = context.payload.pull_request;
  const body = formatReport({
    pr,
    base,
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
  const [prTarget = 'packages/arb-token-bridge-ui/render-profile', baseTarget] =
    process.argv.slice(2);
  const { pr, base } = readProfiles({ prTarget, baseTarget });
  console.log(formatReport({ pr, base, baseSha: 'master', runUrl: 'https://github.com' }));
}
