import { groupBy } from 'lodash-es';

import type { Commit, Render, RenderKind } from './renderProfiler';

export type ProfiledInteraction = { name: string; commits: Commit[] };

const avoidableKinds: RenderKind[] = ['unstable-reference', 'parent'];
const componentsPerInteraction = 20;

function isAvoidable(render: Render) {
  return avoidableKinds.includes(render.kind);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatDuration(milliseconds: number) {
  return `${milliseconds.toFixed(1)} ms`;
}

function formatShare(part: number, total: number) {
  return total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;
}

function countBy<T>(values: T[]) {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort(([, a], [, b]) => b - a);
}

function summarizeComponents(renders: Render[]) {
  return Object.entries(groupBy(renders, 'component')).map(([component, componentRenders]) => {
    const avoidable = componentRenders.filter(isAvoidable);
    const count = (kind: RenderKind) => componentRenders.filter((r) => r.kind === kind).length;
    return {
      component,
      renders: componentRenders.length,
      mount: count('mount'),
      needed: count('needed'),
      unstableReference: count('unstable-reference'),
      parent: count('parent'),
      selfDuration: sum(componentRenders.map(({ selfDuration }) => selfDuration)),
      avoidableDuration: sum(avoidable.map(({ selfDuration }) => selfDuration)),
      // The most frequent reasons of the avoidable renders, a parent render has none
      causes: countBy(avoidable.flatMap(({ causes }) => causes))
        .slice(0, 3)
        .map(([cause, times]) => `${cause} ×${times}`),
    };
  });
}

function summarizeInteraction({ name, commits }: ProfiledInteraction) {
  const renders = commits.flatMap((commit) => commit.renders);
  const avoidable = renders.filter(isAvoidable);
  return {
    name,
    commits: commits.length,
    renders: renders.length,
    avoidableRenders: avoidable.length,
    duration: sum(commits.map(({ duration }) => duration)),
    avoidableDuration: sum(avoidable.map(({ selfDuration }) => selfDuration)),
    components: summarizeComponents(renders),
  };
}

export function summarizeRenderProfile(interactions: ProfiledInteraction[]) {
  return interactions.map(summarizeInteraction);
}

export function formatRenderProfile(interactions: ProfiledInteraction[]) {
  const summaries = summarizeRenderProfile(interactions);

  return [
    '## ⚛️ Render profile',
    '',
    '| Interaction | Commits | Renders | Render time | Avoidable renders | Avoidable time |',
    '|:---|---:|---:|---:|---:|---:|',
    ...summaries.map(
      (summary) =>
        `| ${summary.name} | ${summary.commits} | ${summary.renders} | ${formatDuration(summary.duration)} | ${summary.avoidableRenders} (${formatShare(summary.avoidableRenders, summary.renders)}) | ${formatDuration(summary.avoidableDuration)} (${formatShare(summary.avoidableDuration, summary.duration)}) |`,
    ),
    '',
    'Renders of the bridge integration scenario in the React development build, which is slower than production: compare the durations with each other, not with Lighthouse. Each render is one of:',
    '',
    '- 🆕 **Mount**: the first render of the component.',
    '- ✅ **Needed**: a prop, state or context value changed.',
    '- 🔁 **Unstable reference**: only references changed and the values are equal, e.g. a missing `useMemo` or `useCallback`, or a store selector returning a new object.',
    '- ⬆️ **Parent**: nothing changed and the parent rendered, `React.memo` would skip it.',
    '',
    'Avoidable renders are the unstable reference and parent ones, and the time is the time spent in the component itself, without its children.',
    '',
    ...summaries.flatMap((summary) => {
      const components = summary.components
        .filter(({ avoidableDuration }) => avoidableDuration > 0)
        .sort((a, b) => b.avoidableDuration - a.avoidableDuration)
        .slice(0, componentsPerInteraction);
      if (components.length === 0) {
        return [];
      }
      return [
        '<details>',
        `<summary><b>${summary.name}</b>: components with the most avoidable render time</summary>`,
        '',
        '| Component | Renders | 🆕 | ✅ | 🔁 | ⬆️ | Self time | Avoidable time | Main avoidable causes |',
        '|:---|---:|---:|---:|---:|---:|---:|---:|:---|',
        ...components.map(
          (component) =>
            `| \`${component.component}\` | ${component.renders} | ${component.mount} | ${component.needed} | ${component.unstableReference} | ${component.parent} | ${formatDuration(component.selfDuration)} | ${formatDuration(component.avoidableDuration)} | ${component.causes.join('<br>')} |`,
        ),
        '',
        '</details>',
        '',
      ];
    }),
  ].join('\n');
}
