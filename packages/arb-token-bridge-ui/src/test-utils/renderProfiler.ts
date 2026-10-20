// Records every React render during an interaction, with its duration and the reason it happened.
// It registers as React DevTools, so it must be installed before react-dom is imported, see
// vitest.profile.setup.ts. Durations come from React's profiling timers, which the development and
// profiling builds have. Only import modules that don't load React here, the setup picks its build.
import { isEqualWith } from 'lodash-es';
import { vi } from 'vitest';

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

type FiberRoot = {
  current: Fiber;
  // Set while React has work scheduled for the root
  callbackNode: unknown;
};

// Same check as React's isValidElement, without importing React
type Element = { $$typeof: symbol; type: unknown; key: string | null; props: unknown };

function isValidElement(value: unknown): value is Element {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $$typeof?: symbol }).$$typeof === Symbol.for('react.transitional.element')
  );
}

type Fiber = {
  tag: number;
  type: unknown;
  elementType: unknown;
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
let commitCount = 0;
const roots = new Set<FiberRoot>();

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

// A displayName set on a memo() component is on its elementType, the production build doesn't copy
// it to the inner function
function getComponentName(fiber: Fiber) {
  const memoName = fiber.return?.tag === MemoComponent ? getName(fiber.return.type) : undefined;
  return memoName ?? getName(fiber.elementType) ?? getName(fiber.type) ?? 'Anonymous';
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
      onCommitFiberRoot(_rendererId: number, root: FiberRoot) {
        roots.add(root);
        commitCount += 1;
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

// Timers and dates follow a fake clock, so polling, debounces and SWR deduping happen at the same
// point of the flow on every run. The clock only moves through advanceClock and settle.
export function startFakeClock() {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    now: new Date('2026-01-01T00:00:00Z'),
  });
}

type ClockOptions = {
  // Resolves once the work that doesn't depend on the clock is done, e.g. pending requests
  waitForIdle: () => Promise<void>;
  step?: number;
};

// React has no act() in production builds, so the profile drives it like a browser would and waits
// until no root has work scheduled
export function watchRoot(root: { _internalRoot: FiberRoot }) {
  roots.add(root._internalRoot);
}

async function waitUntilIdle(waitForIdle: () => Promise<void>) {
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    await waitForIdle();
    if ([...roots].every(({ callbackNode }) => callbackNode === null)) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function tick({ waitForIdle, step = 100 }: ClockOptions) {
  await waitUntilIdle(waitForIdle);
  await vi.advanceTimersByTimeAsync(step);
  await waitUntilIdle(waitForIdle);
}

export async function waitForReact(waitForIdle: () => Promise<void>) {
  await waitUntilIdle(waitForIdle);
}

export async function advanceClock({ duration, ...options }: ClockOptions & { duration: number }) {
  for (let elapsed = 0; elapsed < duration; elapsed += options.step ?? 100) {
    // eslint-disable-next-line no-await-in-loop
    await tick(options);
  }
}

// Advances the clock until nothing was committed for quietPeriod, so an interaction includes the
// renders of the updates, requests and timers it triggers
export async function settle({
  quietPeriod = 2_000,
  timeout = 60_000,
  ...options
}: ClockOptions & { quietPeriod?: number; timeout?: number }) {
  const step = options.step ?? 100;
  let quietFor = 0;
  for (let elapsed = 0; quietFor < quietPeriod; elapsed += step) {
    if (elapsed >= timeout) {
      throw new Error(`Renders did not settle within ${timeout} ms.`);
    }
    const commitsBefore = commitCount;
    // eslint-disable-next-line no-await-in-loop
    await tick(options);
    quietFor = commitCount === commitsBefore ? quietFor + step : 0;
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
