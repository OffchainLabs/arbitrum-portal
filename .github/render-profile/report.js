// Compares the render profile of the PR with the same profile run on master, and posts the result
// as a PR comment. The profile is packages/arb-token-bridge-ui/src/components/MainContent/
// MainContent.profile.tsx. To compare profiles locally, run:
// node .github/render-profile/report.js <PR runs directory> <master runs directory>
// Each directory holds one subdirectory per run with a render-profile.json, and a costs.json from
// hooks measured on their own like TokenSearchUtils.profile.tsx. Counts come from the
// run of the development build, times from the runs of the profiling build. Profiling runs with
// the same subdirectory name on both sides are compared with each other.
// The check fails when an interaction renders more than on master, or a hook measured on its own
// builds more SWR key text or keeps more memory, values that are the same on every run. Times
// only show the impact.
const fs = require('fs');
const path = require('path');

const marker = '<!-- render-profile-report -->';
const resultsDirectory = 'render-profile/pr';
const baselineDirectory = 'render-profile/master';
const componentsPerInteraction = 5;
const maxComponentsWithNewRenders = 10;
// A time change counts when its whole 99% confidence interval is past 5%
const minTimeChange = 0.05;
// Two-sided 99% quantiles of Student's t distribution, by degrees of freedom
const tQuantiles = [
  63.657, 9.925, 5.841, 4.604, 4.032, 3.707, 3.499, 3.355, 3.25, 3.169, 3.106, 3.055, 3.012, 2.977,
  2.947, 2.921, 2.898, 2.878, 2.861, 2.845,
];

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

function formatPreciseTime(milliseconds) {
  return `${milliseconds.toFixed(2)} ms`;
}

function formatTime(milliseconds) {
  return `${formatCount(milliseconds)} ms`;
}

function formatPercent(ratio) {
  const percent = Math.round(ratio * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

// Counts are the same on every run, so any change comes from the code. Times change with the load
// of the runner, so they're compared round by round.
const metrics = {
  speed: {
    label: 'Time of all components',
    format: (value) => `${Math.round(value * 100)}%`,
    isTime: true,
    description: "median across components, compared with master's",
  },
  duration: { label: 'Render time', format: formatTime, isTime: true },
  // Counts and sizes that are the same on every run fail the check when they go up
  renders: { label: 'Renders', format: formatCount, failsCheck: true },
  avoidableRenders: {
    label: 'Avoidable renders',
    format: formatCount,
    description: 'only references changed, or nothing changed and the parent rendered',
  },
  commits: { label: 'Commits', format: formatCount },
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
  // Cost of a render of a hook, from the *.profile.tsx files that write costs.json
  costTime: { label: 'Time per render', format: formatPreciseTime, isTime: true },
  costKeyLength: {
    label: 'SWR key text per render',
    format: formatSize,
    failsCheck: true,
    description: 'built and hashed on every render',
  },
  costRetained: {
    label: 'Heap retained',
    format: formatSize,
    description: 'after the renders, with the data the hook keeps',
    // Garbage collection moves it by a few KB between runs
    minChange: 0.05,
    failsCheck: true,
  },
};

const interactionMetrics = [
  'duration',
  'renders',
  'avoidableRenders',
  'commits',
  'swrKeyLength',
  'swrCacheKeyLength',
];
const costMetrics = ['costTime', 'costKeyLength', 'costRetained'];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Mean and 99% confidence interval of the relative changes of the rounds
function confidenceInterval(ratios) {
  const mean = ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length;
  if (ratios.length < 2) {
    return { mean, low: -Infinity, high: Infinity };
  }
  const variance =
    ratios.reduce((total, ratio) => total + (ratio - mean) ** 2, 0) / (ratios.length - 1);
  const t = tQuantiles[ratios.length - 2] ?? 2.576;
  const margin = t * Math.sqrt(variance / ratios.length);
  return { mean, low: mean - margin, high: mean + margin };
}

function loadRuns(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory)
    .filter((run) => fs.existsSync(path.join(directory, run, 'render-profile.json')))
    .sort()
    .map((run) => {
      const costsFile = path.join(directory, run, 'costs.json');
      return {
        run,
        ...JSON.parse(fs.readFileSync(path.join(directory, run, 'render-profile.json'), 'utf8')),
        costs: fs.existsSync(costsFile)
          ? JSON.parse(fs.readFileSync(costsFile, 'utf8')).filter(({ reference }) => !reference)
          : [],
      };
    });
}

// Shorter components are too noisy to tell how fast a run was
const minReferenceTime = 2;

// A whole run is often faster or slower than the others, e.g. depending on garbage collection, and
// every component in it by about the same factor. The factor of a run is the median ratio between
// the time of its components and their median time across all runs of master and the PR.
function setSpeedFactors(runs) {
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
  runs.forEach((run) => {
    run.speed = median(
      run.interactions.flatMap(({ name, components }) =>
        components
          .filter(({ component }) => reference.get(`${name} › ${component}`) >= minReferenceTime)
          .map(
            ({ component, selfDuration }) => selfDuration / reference.get(`${name} › ${component}`),
          ),
      ),
    );
  });
}

function withoutTimes(run) {
  return JSON.stringify(
    run.interactions.map(({ duration, components, ...interaction }) => ({
      ...interaction,
      components: components.map(({ selfDuration, ...component }) => component),
    })),
  );
}

// Counts come from the development build, times from the profiling build divided by the speed
// factor of their run. Hooks measured on their own aren't part of the components the factor
// comes from, so their times aren't divided.
function summarize(runs) {
  const countsRun = runs.find(({ build }) => build === 'development') ?? runs[0];
  const timedRuns = runs.filter(({ build }) => build === 'profiling');
  const samples = timedRuns.length > 0 ? timedRuns : runs;
  const time = (run, value) => value / run.speed;
  return {
    ...countsRun,
    // The builds differ a little, e.g. in the names of the hooks, so runs are compared by build
    isRepeatable: runs.every(
      (run) => withoutTimes(run) === withoutTimes(runs.find(({ build }) => build === run.build)),
    ),
    // Normalized samples by round, for the paired comparison
    rounds: new Map(samples.map((run) => [run.run, run])),
    speed: median(samples.map(({ speed }) => speed)),
    interactions: countsRun.interactions.map((interaction, index) => ({
      ...interaction,
      duration: median(samples.map((run) => time(run, run.interactions[index].duration))),
      components: interaction.components.map((component) => ({
        ...component,
        selfDuration: median(
          samples.map((run) =>
            time(
              run,
              run.interactions[index].components.find((c) => c.component === component.component)
                ?.selfDuration ?? 0,
            ),
          ),
        ),
      })),
    })),
    // Sizes come from the development run, times from the profiling runs
    costs: countsRun.costs.map((cost) => ({
      name: cost.name,
      costTime: median(samples.map((run) => findCost(run, cost.name)?.renderMs ?? 0)),
      costKeyLength: cost.keyLength,
      costRetained: cost.retainedBytes,
    })),
  };
}

function readProfiles({ prDirectory, baseDirectory }) {
  const prRuns = loadRuns(prDirectory);
  const baseRuns = baseDirectory ? loadRuns(baseDirectory) : [];
  if (prRuns.length === 0) {
    throw new Error(`Missing render profile for the PR in ${prDirectory}.`);
  }
  setSpeedFactors([...prRuns, ...baseRuns].filter(({ build }) => build === 'profiling'));
  return {
    pr: summarize(prRuns),
    base: baseRuns.length > 0 ? summarize(baseRuns) : undefined,
  };
}

// Relative change of a time in each round that ran on both sides
function getRoundRatios({ pr, base, read }) {
  return [...pr.rounds.keys()]
    .filter((round) => base.rounds.has(round))
    .map((round) => {
      const prRun = pr.rounds.get(round);
      const baseRun = base.rounds.get(round);
      return read(prRun) / read(baseRun) - 1;
    });
}

function compareTime({ ratios }) {
  const interval = confidenceInterval(ratios);
  if (interval.low > minTimeChange) {
    return { interval, status: 'worse' };
  }
  if (interval.high < -minTimeChange) {
    return { interval, status: 'better' };
  }
  return { interval, status: 'same' };
}

function findInteraction(profile, name) {
  return profile.interactions.find((interaction) => interaction.name === name);
}

function findCost(profile, name) {
  return profile.costs.find((cost) => cost.name === name);
}

const timeReaders = {
  speed: () => (run) => run.speed,
  duration: (name) => (run) => findInteraction(run, name).duration / run.speed,
  // Each round runs the PR and master one after the other, so the raw times are already paired
  costTime: (name) => (run) => findCost(run, name).renderMs,
};

// Counts and sizes are compared exactly, unless the metric allows a small relative change
function compareRow({ id, pr, base, name, find = findInteraction }) {
  if (!metrics[id].isTime) {
    const prValue = find(pr, name)[id];
    const baseValue = find(base, name)[id];
    const difference = prValue - baseValue;
    const isSame =
      Math.abs(difference) <= Math.abs(baseValue) * (metrics[id].minChange ?? 0) ||
      difference === 0;
    return { difference, status: isSame ? 'same' : difference < 0 ? 'better' : 'worse' };
  }
  return compareTime({ ratios: getRoundRatios({ pr, base, read: timeReaders[id](name) }) });
}

function formatDelta({ id, difference, interval, base, pr }) {
  if (interval) {
    // The time in ms tells the impact, the confidence interval whether it's more than noise
    const percent = formatPercent(interval.mean);
    const change =
      id === 'speed'
        ? percent
        : `${pr > base ? '+' : '−'}${metrics[id].format(Math.abs(pr - base))} (${percent})`;
    return `${change}<br><sub>99% CI ${formatPercent(interval.low)} to ${formatPercent(interval.high)}</sub>`;
  }
  const { format } = metrics[id];
  const delta = `${difference > 0 ? '+' : '−'}${format(Math.abs(difference))}`;
  return base === 0 ? delta : `${delta} (${formatPercent(difference / base)})`;
}

// The components whose renders changed, then those whose render time changed the most, to tell
// where a change comes from and what it costs
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
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  const withNewRenders = components.filter(({ base: b, pr: p }) => b.renders !== p.renders);
  const shown =
    withNewRenders.length > 0
      ? withNewRenders.slice(0, maxComponentsWithNewRenders)
      : components.slice(0, componentsPerInteraction);
  const hidden = withNewRenders.length - shown.length;
  return [
    '',
    withNewRenders.length > 0
      ? 'Components whose renders changed, by change of render time without their children:'
      : 'Components whose render time changed the most, without their children:',
    '',
    '| Component | Renders | Master | PR | Δ |',
    '|:---|---:|---:|---:|---:|',
    ...shown.map(
      ({ component, base: b, pr: p, difference }) =>
        `| \`${component}\` | ${b.renders === p.renders ? formatCount(p.renders) : `${formatCount(b.renders)} → ${formatCount(p.renders)}`} | ${formatTime(b.selfDuration)} | ${formatTime(p.selfDuration)} | ${difference > 0 ? '+' : '−'}${formatTime(Math.abs(difference))} |`,
    ),
    ...(hidden > 0 ? ['', `${hidden} more components changed renders.`] : []),
  ];
}

// One collapsible section per status, with a nested one for each interaction that changed
// A change of renders comes with the render time of the interaction, to show its impact
function formatChanges({ sections, status, title }) {
  const groups = sections
    .map((section) => ({ ...section, rows: section.rows.filter((row) => row.status === status) }))
    .filter(({ rows }) => rows.length > 0);
  const count = groups.reduce((total, { rows }) => total + rows.length, 0);
  const withRenderTime = (group) => {
    const ids = group.rows.map(({ id }) => id);
    const duration = sections
      .find(({ name }) => name === group.name)
      .rows.find(({ id }) => id === 'duration');
    return ids.includes('renders') && !ids.includes('duration') && duration
      ? [...group.rows, duration]
      : group.rows;
  };
  if (count === 0) {
    return [];
  }

  return [
    '<details>',
    `<summary><b>${icons[status]} ${title} (${count})</b></summary>`,
    '',
    ...groups.flatMap((group) => [
      '<details>',
      `<summary>${group.name} — ${group.rows.map(({ id }) => metrics[id].label).join(', ')}</summary>`,
      '',
      '| Metric | Master | PR | Δ |',
      '|:---|---:|---:|---:|',
      ...withRenderTime(group).map(({ id, ...row }) => {
        const { label, format, description } = metrics[id];
        const note = description ? `<br><sub>${description}</sub>` : '';
        const delta = formatDelta({ id, ...row });
        return status === 'new'
          ? `| ${label}${note} | — | ${format(row.pr)} | — |`
          : `| ${label}${note} | ${format(row.base)} | ${format(row.pr)} | ${row.status === status ? `**${delta}**` : delta} |`;
      }),
      ...(group.pr &&
      group.base &&
      group.rows.some(({ id }) => id === 'duration' || id === 'renders')
        ? formatComponents({ pr: group.pr, base: group.base })
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
          `⚠️ The counts differed between the runs of ${side}, something in the profile depends on timing. The report uses the run of the development build.`,
      ),
    ...(pr.unhandledRequests.length > 0
      ? [
          `⚠️ These requests have no generated response and failed like a network error, add them to \`renderProfileNetwork.ts\`: ${pr.unhandledRequests.map((r) => `\`${r}\``).join(', ')}`,
        ]
      : []),
  ].flatMap((warning) => [warning, '']);
}

// Values that went up and fail the check: renders of an interaction, and the SWR key text and
// memory of a measured hook. Times vary between runs, so they never fail it.
function getFailures(sections) {
  return sections.flatMap(({ name, rows }) =>
    rows
      .filter(({ id, status }) => metrics[id].failsCheck && status === 'worse')
      .map(({ id, difference }) => ({ name, id, difference })),
  );
}

function formatFailures(failures) {
  return failures
    .map(
      ({ name, id, difference }) =>
        `${name} · ${metrics[id].label} +${metrics[id].format(difference)}`,
    )
    .join(', ');
}

function formatReport({ pr, base, baseSha, runUrl }) {
  // Interactions are matched by name, so interactions added by the PR are new
  const sections = pr.interactions.map((interaction) => {
    const baseInteraction = base && findInteraction(base, interaction.name);
    return {
      name: interaction.name,
      pr: interaction,
      base: baseInteraction,
      rows: interactionMetrics.map((id) =>
        baseInteraction
          ? {
              id,
              pr: interaction[id],
              base: baseInteraction[id],
              ...compareRow({ id, pr, base, name: interaction.name }),
            }
          : { id, pr: interaction[id], status: 'new' },
      ),
    };
  });
  // Hooks measured on their own, matched by name like the interactions
  sections.push(
    ...pr.costs.map((cost) => {
      const baseCost = base && findCost(base, cost.name);
      return {
        name: cost.name,
        rows: costMetrics.map((id) =>
          baseCost
            ? {
                id,
                pr: cost[id],
                base: baseCost[id],
                ...compareRow({ id, pr, base, name: cost.name, find: findCost }),
              }
            : { id, pr: cost[id], status: 'new' },
        ),
      };
    }),
  );
  if (base) {
    sections.unshift({
      name: 'All interactions',
      rows: [
        {
          id: 'speed',
          pr: pr.speed / base.speed,
          base: 1,
          ...compareRow({ id: 'speed', pr, base }),
        },
      ],
    });
  }

  const rows = sections.flatMap((section) => section.rows);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const failures = getFailures(sections);
  const changes = [
    ...formatChanges({ sections, status: 'worse', title: 'Regressions' }),
    ...formatChanges({ sections, status: 'better', title: 'Improvements' }),
    ...formatChanges({ sections, status: 'new', title: 'Not measured on master' }),
  ];

  const body = [
    marker,
    '## ⚛️ Render profile',
    '',
    `| ${icons.worse} Regressions | ${icons.better} Improvements | ${icons.same} Unchanged |`,
    '|:---:|:---:|:---:|',
    `| ${count('worse')} | ${count('better')} | ${count('same')} |`,
    '',
    failures.length > 0
      ? `❌ ${formatFailures(failures)}. The check fails when an interaction renders more than on master, or a measured hook builds more SWR key text or keeps more memory.`
      : '✅ No interaction renders more than on master, and no measured hook builds more SWR key text or keeps more memory.',
    '',
    `Compared with master at \`${baseSha.slice(0, 7)}\`.`,
    '',
    ...formatWarnings({ pr, base }),
    ...(changes.length > 0 ? ['---', '', ...changes] : []),
    '---',
    '',
    `📄 Full profiles are attached to the [workflow run](${runUrl}).`,
  ].join('\n');
  return { body, failures };
}

function formatFailure(failures) {
  return `Higher than on master: ${formatFailures(failures)}.`;
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const { pr, base } = readProfiles({
    prDirectory: resultsDirectory,
    // Missing when the profile couldn't run on master, then every value is new
    baseDirectory: baselineDirectory,
  });

  const pullRequest = context.payload.pull_request;
  const { body, failures } = formatReport({
    pr,
    base,
    baseSha: pullRequest.base.sha,
    runUrl: `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`,
  });

  await core.summary.addRaw(body).write();
  if (failures.length > 0) {
    core.setFailed(formatFailure(failures));
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

if (require.main === module) {
  const [prDirectory = 'render-profile/pr', baseDirectory] = process.argv.slice(2);
  const { pr, base } = readProfiles({ prDirectory, baseDirectory });
  const { body, failures } = formatReport({
    pr,
    base,
    baseSha: 'master',
    runUrl: 'https://github.com',
  });
  console.log(body);
  if (failures.length > 0) {
    console.error(formatFailure(failures));
    process.exitCode = 1;
  }
}
