// Summarizes the render profile, .github/render-profile/report.js compares the summary of a PR
// with master's
import { groupBy } from 'lodash-es';

import type { SwrKeyStats } from './renderProfileSwr';
import type { Commit, Render, RenderKind } from './renderProfiler';

export type ProfiledInteraction = {
  name: string;
  commits: Commit[];
  swr: SwrKeyStats;
  requests: number;
};

const avoidableKinds: RenderKind[] = ['unstable-reference', 'parent'];

function isAvoidable(render: Render) {
  return avoidableKinds.includes(render.kind);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
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
      // The most frequent reasons of the avoidable renders, a parent render has none
      causes: countBy(avoidable.flatMap(({ causes }) => causes))
        .slice(0, 3)
        .map(([cause, times]) => `${cause} ×${times}`),
    };
  });
}

function summarizeInteraction({ name, commits, swr, requests }: ProfiledInteraction) {
  const renders = commits.flatMap((commit) => commit.renders);
  const avoidable = renders.filter(isAvoidable);
  return {
    name,
    commits: commits.length,
    renders: renders.length,
    avoidableRenders: avoidable.length,
    duration: sum(commits.map(({ duration }) => duration)),
    requests,
    swrKeyLength: sum(Object.values(swr.serializedByKey)),
    swrKeys: Object.entries(swr.serializedByKey)
      .map(([key, length]) => ({ key, length }))
      .sort((a, b) => b.length - a.length),
    swrCacheEntries: swr.cacheEntries,
    swrCacheKeyLength: swr.cacheKeyLength,
    components: summarizeComponents(renders),
  };
}

export function summarizeRenderProfile(interactions: ProfiledInteraction[]) {
  return interactions.map(summarizeInteraction);
}
