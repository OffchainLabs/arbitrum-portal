// Records every React render during an interaction, with its duration and the reason it happened.
// It registers as React DevTools, so it must be installed before react-dom is imported, see
// vitest.profile.setup.ts. Durations come from the profiling timers of the React development build.
// Only import modules that don't load react-dom here.
import { isEqualWith } from 'lodash-es';
import { act, isValidElement } from 'react';

export type RenderKind =
  // First render of the component
  | 'mount'
  // A prop, state or context value changed
  | 'needed'
  // Only references changed, the values are equal: a missing useMemo, useCallback or stable selector
  | 'unstable-reference'
  // Nothing changed, the parent rendered: React.memo would skip it
  | 'parent'
  // None of the above, e.g. a forced update
  | 'unknown';

export type Render = {
  component: string;
  kind: RenderKind;
  // Time spent in the component itself, excluding its children
  selfDuration: number;
  causes: string[];
};

export type Commit = {
  // Time spent rendering the whole tree
  duration: number;
  renders: Render[];
};

type Fiber = {
  tag: number;
  type: unknown;
  flags: number;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  alternate: Fiber | null;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
  dependencies: { firstContext: ContextDependency | null } | null;
  actualDuration?: number;
  _debugHookTypes?: string[] | null;
};

type ContextDependency = {
  context: { displayName?: string };
  memoizedValue: unknown;
  next: ContextDependency | null;
};

type Hook = {
  memoizedState: unknown;
  queue: unknown;
  next: Hook | null;
};

// Fiber tags and flags of React 19, see ReactWorkTags.js and ReactFiberFlags.js
const FunctionComponent = 0;
const ClassComponent = 1;
const ForwardRef = 11;
const MemoComponent = 14;
const SimpleMemoComponent = 15;
const PerformedWork = 1;

// The number of entries each hook adds to the fiber's hook list, 1 if not listed
const hookEntries: Record<string, number> = {
  useContext: 0,
  useDebugValue: 0,
  // The store value and the subscription effect
  useSyncExternalStore: 2,
  // The pending state and the start function
  useTransition: 2,
  useActionState: 3,
  useFormState: 3,
};

let commits: Commit[] | undefined;
let lastCommitTime = 0;

function isComponent(fiber: Fiber) {
  return [FunctionComponent, ClassComponent, ForwardRef, SimpleMemoComponent].includes(fiber.tag);
}

function isMemo(fiber: Fiber) {
  return fiber.tag === SimpleMemoComponent || fiber.return?.tag === MemoComponent;
}

function getName(type: unknown): string | undefined {
  if (typeof type === 'function') {
    const component = type as { displayName?: string; name?: string };
    return component.displayName || component.name || undefined;
  }
  if (type && typeof type === 'object') {
    const wrapper = type as { displayName?: string; render?: unknown; type?: unknown };
    return wrapper.displayName || getName(wrapper.render) || getName(wrapper.type);
  }
  return undefined;
}

function getComponentName(fiber: Fiber) {
  const memoName = fiber.return?.tag === MemoComponent ? getName(fiber.return.type) : undefined;
  return memoName ?? getName(fiber.type) ?? 'Anonymous';
}

// Functions and elements are compared by what they are, not by reference, so a new callback or
// element with the same props counts as an unstable reference
function isEquivalent(previous: unknown, next: unknown): boolean {
  return isEqualWith(previous, next, (a: unknown, b: unknown) => {
    if (typeof a === 'function' && typeof b === 'function') {
      return true;
    }
    if (isValidElement(a) && isValidElement(b)) {
      return a.type === b.type && a.key === b.key && isEquivalent(a.props, b.props);
    }
    return undefined;
  });
}

function describeReference(value: unknown) {
  if (typeof value === 'function') {
    return 'new function';
  }
  if (isValidElement(value)) {
    return 'new element';
  }
  if (Array.isArray(value)) {
    return `new array of ${value.length}`;
  }
  // The keys tell which store or hook the object comes from
  const keys = Object.keys(value ?? {});
  const preview = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '');
  return `new object {${preview}}`;
}

type Change = { cause: string; isValueChange: boolean };

function compare(cause: string, previous: unknown, next: unknown): Change | undefined {
  if (Object.is(previous, next)) {
    return undefined;
  }
  if (isEquivalent(previous, next)) {
    return { cause: `${cause} (${describeReference(next)}, same value)`, isValueChange: false };
  }
  return { cause, isValueChange: true };
}

function getPropChanges(fiber: Fiber, previous: Fiber) {
  const nextProps = fiber.memoizedProps ?? {};
  const previousProps = previous.memoizedProps ?? {};
  const keys = new Set([...Object.keys(previousProps), ...Object.keys(nextProps)]);
  return [...keys].flatMap(
    (key) => compare(`props.${key}`, previousProps[key], nextProps[key]) ?? [],
  );
}

function getHookNames(fiber: Fiber) {
  const counts = new Map<string, number>();
  return (fiber._debugHookTypes ?? []).flatMap((type) => {
    const count = (counts.get(type) ?? 0) + 1;
    counts.set(type, count);
    return Array<string>(hookEntries[type] ?? 1).fill(`${type} #${count}`);
  });
}

function getStateChanges(fiber: Fiber, previous: Fiber) {
  if (fiber.tag === ClassComponent) {
    return [compare('state', previous.memoizedState, fiber.memoizedState) ?? []].flat();
  }

  // The hook of each entry of the list, numbered by type in call order, e.g. the second useState
  const hookNames = getHookNames(fiber);
  const changes: Change[] = [];
  let hook = fiber.memoizedState as Hook | null;
  let previousHook = previous.memoizedState as Hook | null;
  // Hooks with a queue hold state: useState, useReducer, useSyncExternalStore and the like
  for (let index = 0; hook && previousHook; index += 1) {
    if (hook.queue) {
      const name = hookNames[index] ?? 'hook';
      const change = compare(name, previousHook.memoizedState, hook.memoizedState);
      if (change) {
        changes.push(change);
      }
    }
    hook = hook.next;
    previousHook = previousHook.next;
  }
  return changes;
}

function getContextChanges(fiber: Fiber, previous: Fiber) {
  const changes: Change[] = [];
  let dependency = fiber.dependencies?.firstContext ?? null;
  let previousDependency = previous.dependencies?.firstContext ?? null;
  while (dependency && previousDependency) {
    const name = `context ${dependency.context.displayName ?? 'Context'}`;
    const change = compare(name, previousDependency.memoizedValue, dependency.memoizedValue);
    if (change) {
      changes.push(change);
    }
    dependency = dependency.next;
    previousDependency = previousDependency.next;
  }
  return changes;
}

function classify(fiber: Fiber, previous: Fiber): Pick<Render, 'kind' | 'causes'> {
  const changes = [
    ...getPropChanges(fiber, previous),
    ...getStateChanges(fiber, previous),
    ...getContextChanges(fiber, previous),
  ];
  const causes = changes.map(({ cause }) => cause);

  if (changes.some(({ isValueChange }) => isValueChange)) {
    return { kind: 'needed', causes };
  }
  if (changes.length > 0) {
    return {
      kind: 'unstable-reference',
      causes: isMemo(fiber) ? [...causes, 'memo bypassed'] : causes,
    };
  }
  if (fiber.memoizedProps !== previous.memoizedProps) {
    return { kind: 'parent', causes: [] };
  }
  return { kind: 'unknown', causes: [] };
}

// The time spent in the component, without the time spent in the children that also rendered
function getSelfDuration(fiber: Fiber) {
  let duration = fiber.actualDuration ?? 0;
  for (let child = fiber.child; child; child = child.sibling) {
    duration -= child.actualDuration ?? 0;
  }
  return Math.max(duration, 0);
}

function collectMounts(fiber: Fiber, renders: Render[]) {
  if (isComponent(fiber)) {
    renders.push({
      component: getComponentName(fiber),
      kind: 'mount',
      selfDuration: getSelfDuration(fiber),
      causes: [],
    });
  }
  for (let child = fiber.child; child; child = child.sibling) {
    collectMounts(child, renders);
  }
}

// Only visits the subtrees that rendered: a subtree that bailed out keeps the children of its
// previous version
function collectRenders(fiber: Fiber, renders: Render[]) {
  const previous = fiber.alternate;
  if (!previous) {
    collectMounts(fiber, renders);
    return;
  }
  if (isComponent(fiber) && (fiber.flags & PerformedWork) === PerformedWork) {
    renders.push({
      component: getComponentName(fiber),
      selfDuration: getSelfDuration(fiber),
      ...classify(fiber, previous),
    });
  }
  if (fiber.child !== previous.child) {
    for (let child = fiber.child; child; child = child.sibling) {
      collectRenders(child, renders);
    }
  }
}

export function installRenderProfiler() {
  let rendererId = 0;
  Object.assign(globalThis, {
    __REACT_DEVTOOLS_GLOBAL_HOOK__: {
      supportsFiber: true,
      renderers: new Map(),
      inject(renderer: unknown) {
        rendererId += 1;
        this.renderers.set(rendererId, renderer);
        return rendererId;
      },
      onCommitFiberRoot(_rendererId: number, root: { current: Fiber }) {
        lastCommitTime = performance.now();
        if (!commits) {
          return;
        }
        const renders: Render[] = [];
        for (let child = root.current.child; child; child = child.sibling) {
          collectRenders(child, renders);
        }
        commits.push({ duration: root.current.actualDuration ?? 0, renders });
      },
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      onScheduleFiberRoot() {},
      checkDCE() {},
    },
  });
}

// Resolves once nothing was committed for quietPeriod, so an interaction includes the renders of
// the updates and requests it triggers. Polling can keep committing, hence the timeout.
export async function waitForCommitsToSettle({
  quietPeriod = 1_000,
  timeout = 15_000,
}: { quietPeriod?: number; timeout?: number } = {}) {
  const start = performance.now();
  const isSettled = () => performance.now() - Math.max(lastCommitTime, start) >= quietPeriod;
  while (!isSettled() && performance.now() - start < timeout) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
  }
}

export async function recordCommits(interaction: () => Promise<void>) {
  if (!('__REACT_DEVTOOLS_GLOBAL_HOOK__' in globalThis)) {
    throw new Error('The render profiler must be installed before react-dom is imported.');
  }
  commits = [];
  try {
    await interaction();
    return commits;
  } finally {
    commits = undefined;
  }
}
