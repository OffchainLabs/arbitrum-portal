// Wraps the subtrees measured by the browser benchmark in React's <Profiler>, see
// tests/browser-bench. BENCH_PROFILER is set by next.config.js at build time, so in the normal
// production build this returns the subtree unchanged and the minifier drops the rest. Only the
// profiling build of the benchmark sets it, together with `next build --profile`, without which
// React never calls onRender.
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

export type BenchProfilerSample = {
  scenario: string;
  sample: number;
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
};

declare global {
  interface Window {
    // Created and read by the benchmark. Samples are only kept while `active` is set, ids of
    // every subtree that rendered on the page are kept at all times.
    __BENCH_PROFILER__?: {
      active: { scenario: string; sample: number } | null;
      samples: BenchProfilerSample[];
      ids: string[];
    };
  }
}

// Runs inside React's commit, so it only copies the values, without logging or network writes
const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  const store = window.__BENCH_PROFILER__;
  if (!store) {
    return;
  }
  if (!store.ids.includes(id)) {
    store.ids.push(id);
  }
  if (!store.active) {
    return;
  }
  store.samples.push({
    ...store.active,
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  });
};

// A function rather than a component, so the normal build and the render profile see the same
// component tree as before
export function benchProfiler(id: string, subtree: ReactNode) {
  if (process.env.BENCH_PROFILER !== 'true') {
    return subtree;
  }
  return (
    <Profiler id={id} onRender={onRender}>
      {subtree}
    </Profiler>
  );
}
