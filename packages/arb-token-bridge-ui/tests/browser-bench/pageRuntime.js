// Runs in every page of the browser benchmark before the app's scripts, see browserBench.run.ts.
// Plain browser JavaScript, so nothing compiles helpers into it.
/* eslint-disable no-await-in-loop -- waits for frames and entries one after the other */
(() => {
  // Polling and other long timers would fire at random points of a measurement, so timers of 2 s
  // or more never fire. The scenarios don't depend on any.
  const longTimerMs = 2000;
  const realSetTimeout = window.setTimeout.bind(window);
  const realSetInterval = window.setInterval.bind(window);
  let suppressedTimerId = 1e9;
  window.setTimeout = (handler, timeout, ...args) =>
    Number(timeout) >= longTimerMs
      ? ++suppressedTimerId
      : realSetTimeout(handler, timeout, ...args);
  window.setInterval = (handler, timeout, ...args) =>
    Number(timeout) >= longTimerMs
      ? ++suppressedTimerId
      : realSetInterval(handler, timeout, ...args);

  // Transitions would add their duration to dialogs and make completion depend on them
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent =
      '*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }';
    document.head.append(style);
  });

  const eventEntries = [];
  const longTasks = [];
  const longAnimationFrames = [];
  const observe = (type, options, entries, toSample) => {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
      return false;
    }
    new PerformanceObserver((list) => {
      entries.push(...list.getEntries().map(toSample));
    }).observe({ type, buffered: true, ...options });
    return true;
  };
  const supports = {
    // 16 ms is the lowest threshold Event Timing allows, faster events aren't reported
    eventTiming: observe('event', { durationThreshold: 16 }, eventEntries, (entry) => ({
      name: entry.name,
      interactionId: entry.interactionId,
      startTime: entry.startTime,
      processingStart: entry.processingStart,
      processingEnd: entry.processingEnd,
      duration: entry.duration,
    })),
    longTask: observe('longtask', {}, longTasks, ({ startTime, duration }) => ({
      startTime,
      duration,
    })),
    longAnimationFrame: observe(
      'long-animation-frame',
      {},
      longAnimationFrames,
      ({ startTime, duration, blockingDuration }) => ({ startTime, duration, blockingDuration }),
    ),
  };

  // Filled by the app's <Profiler> callbacks in the profiling build, see benchProfiler.tsx
  window.__BENCH_PROFILER__ = { active: null, samples: [] };

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const sleep = (ms) => new Promise((resolve) => realSetTimeout(resolve, ms));

  // A condition is a list of checks that must all hold:
  // { selector, count?, minCount?, everyTextIncludes?, height?, focused? }
  function holds(checks) {
    return checks.every(({ selector, count, minCount, everyTextIncludes, height, focused }) => {
      const elements = [...document.querySelectorAll(selector)];
      if (count !== undefined && elements.length !== count) {
        return false;
      }
      if (elements.length < (minCount ?? 1)) {
        return false;
      }
      if (
        everyTextIncludes !== undefined &&
        !elements.every((element) =>
          element.textContent.toLowerCase().includes(everyTextIncludes.toLowerCase()),
        )
      ) {
        return false;
      }
      if (height !== undefined && elements.some((element) => element.style.height !== height)) {
        return false;
      }
      if (focused && !elements.includes(document.activeElement)) {
        return false;
      }
      return true;
    });
  }

  let measurement = null;

  // Resolves when the checks hold in a rendered frame. They're checked in animation frame
  // callbacks, so a frame that sees them hold also renders the result. The end is taken in a task
  // posted from that callback, which runs once the frame is rendered on the main thread. The
  // compositor and display add a few more milliseconds, which Event Timing includes.
  async function watchCompletion(current, checks, timeoutMs) {
    const deadline = performance.now() + timeoutMs;
    for (;;) {
      await nextFrame();
      if (current.start !== null && holds(checks)) {
        break;
      }
      if (performance.now() > deadline) {
        const reason =
          current.start === null ? 'the input never arrived' : 'the condition never held';
        window.__BENCH_PROFILER__.active = null;
        throw new Error(`${current.scenario}: ${reason} within ${timeoutMs} ms`);
      }
    }
    const end = await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve(performance.now());
      channel.port2.postMessage(null);
    });
    window.__BENCH_PROFILER__.active = null;
    const { scenario, start } = current;
    performance.mark(`bench:${scenario}:end`, { startTime: end });
    const { duration } = performance.measure(`bench:${scenario}`, {
      start: `bench:${scenario}:start`,
      end: `bench:${scenario}:end`,
    });

    // Event Timing reports an event after the frame that follows it is presented
    if (supports.eventTiming) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (eventEntries.some((entry) => entry.startTime >= start - 1)) {
          break;
        }
        await sleep(30);
      }
    }
    // Long tasks are reported once they end
    await sleep(100);

    const interactionEntries = eventEntries.filter(
      (entry) => entry.interactionId > 0 && entry.startTime >= start - 1 && entry.startTime <= end,
    );
    const overlaps = (entry) => entry.startTime < end && entry.startTime + entry.duration > start;
    const tasks = longTasks.filter(overlaps);
    const frames = longAnimationFrames.filter(overlaps);
    const profilerSamples = window.__BENCH_PROFILER__.samples.filter(
      (entry) => entry.commitTime >= start && entry.commitTime <= end,
    );
    window.__BENCH_PROFILER__.samples = [];
    return {
      start,
      end,
      duration,
      // Longest event of the interaction, from input to the next paint. Missing when every
      // event took less than 16 ms.
      interactionLatency: interactionEntries.length
        ? Math.max(...interactionEntries.map((entry) => entry.duration))
        : null,
      interactionEvents: interactionEntries,
      longTaskCount: tasks.length,
      longTaskDuration: tasks.reduce((total, task) => total + task.duration, 0),
      longAnimationFrameCount: frames.length,
      longAnimationFrameBlocking: frames.reduce(
        (total, frame) => total + (frame.blockingDuration ?? 0),
        0,
      ),
      profilerSamples,
    };
  }

  window.__bench = {
    supports,

    lastLongTaskEnd: () =>
      longTasks.reduce((end, task) => Math.max(end, task.startTime + task.duration), 0),

    // Starts a measurement at the next trusted `eventType` event, the input of the interaction.
    // Its timestamp is when the input happened, before any handler ran. Watching for completion
    // starts here too, before the automation sends the input, so the time the automation takes to
    // return can't delay the end. The warm-up passes no checks and isn't measured.
    arm(scenario, sample, eventType, collectProfiler, checks, timeoutMs) {
      measurement = { scenario, sample, start: null, done: null };
      window.__BENCH_PROFILER__.samples = [];
      window.__BENCH_PROFILER__.active = collectProfiler ? { scenario, sample } : null;
      const listener = (event) => {
        if (!event.isTrusted || measurement.start !== null) {
          return;
        }
        measurement.start = event.timeStamp;
        performance.mark(`bench:${scenario}:start`, { startTime: event.timeStamp });
        window.removeEventListener(eventType, listener, true);
      };
      window.addEventListener(eventType, listener, true);
      if (checks) {
        measurement.done = watchCompletion(measurement, checks, timeoutMs);
        // Read by complete(), this only keeps an early failure from being reported as unhandled
        measurement.done.catch(() => {});
      }
    },

    complete() {
      return measurement.done;
    },

    profilerSampleCount: () => window.__BENCH_PROFILER__.samples.length,
  };
})();
