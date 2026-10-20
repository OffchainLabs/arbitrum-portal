// Compares the render profile of the PR with the same profile run on master, and posts the result
// as a PR comment. The profile is packages/arb-token-bridge-ui/src/components/MainContent/
// MainContent.profile.tsx. To compare profiles locally, run:
// node .github/render-profile/report.js <PR runs directory> <master runs directory>
// Each directory holds one subdirectory per run with a render-profile.json. Counts come from the
// run of the development build, times from the runs of the profiling build. Profiling runs with
// the same subdirectory name on both sides are compared with each other.
const fs = require('fs');
const path = require('path');

const marker = '<!-- render-profile-report -->';
const resultsDirectory = 'render-profile/pr';
const baselineDirectory = 'render-profile/master';
const componentsPerInteraction = 5;
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
  renders: { label: 'Renders', format: formatCount },
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
};

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
    .map((run) => ({
      run,
      ...JSON.parse(fs.readFileSync(path.join(directory, run, 'render-profile.json'), 'utf8')),
    }));
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
// factor of their run
function summarize(runs) {
  const countsRun = runs.find(({ build }) => build === 'development') ?? runs[0];
  const timedRuns = runs.filter(({ build }) => build === 'profiling');
  const samples = timedRuns.length > 0 ? timedRuns : runs;
  const time = (run, value) => value / run.speed;
  return {
    ...countsRun,
    runs: samples.length,
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

function compareRow({ id, pr, base, name }) {
  if (!metrics[id].isTime) {
    const difference = findInteraction(pr, name)[id] - findInteraction(base, name)[id];
    return { difference, status: difference === 0 ? 'same' : difference < 0 ? 'better' : 'worse' };
  }
  const read =
    id === 'speed' ? (run) => run.speed : (run) => findInteraction(run, name).duration / run.speed;
  return compareTime({ ratios: getRoundRatios({ pr, base, read }) });
}

function formatDelta({ id, difference, interval, base }) {
  if (interval) {
    return `${formatPercent(interval.mean)}<br><sub>99% CI ${formatPercent(interval.low)} to ${formatPercent(interval.high)}</sub>`;
  }
  const { format } = metrics[id];
  const delta = `${difference > 0 ? '+' : '−'}${format(Math.abs(difference))}`;
  return base === 0 ? delta : `${delta} (${formatPercent(difference / base)})`;
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
    'Components whose render time changed the most, without their children:',
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
      ...(pr && base && rows.some(({ id }) => id === 'duration' || id === 'renders')
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
          `⚠️ The counts differed between the runs of ${side}, something in the profile depends on timing. The report uses the run of the development build.`,
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
    const baseInteraction = base && findInteraction(base, interaction.name);
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
                ...compareRow({ id, pr, base, name: interaction.name }),
              }
            : { id, pr: interaction[id], status: 'new' },
        ),
    };
  });
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
    `React renders of the bridge flow in Vitest, on master at \`${baseSha.slice(0, 7)}\` and on this PR. API responses are generated and timers follow a fake clock, so counts are the same on every run. Render times come from React's profiling build, in ${pr.runs} rounds that run master and this PR in random order. A time change counts when its 99% confidence interval is entirely past ${minTimeChange * 100}%.`,
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
    prDirectory: resultsDirectory,
    // Missing when the profile couldn't run on master, then every value is new
    baseDirectory: baselineDirectory,
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
  const [prDirectory = 'render-profile/pr', baseDirectory] = process.argv.slice(2);
  const { pr, base } = readProfiles({ prDirectory, baseDirectory });
  console.log(formatReport({ pr, base, baseSha: 'master', runUrl: 'https://github.com' }));
}
