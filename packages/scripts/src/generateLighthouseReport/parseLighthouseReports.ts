import {
  FlowResultLike,
  FlowStepLike,
  LighthouseSummary,
  Metric,
  NavigationResult,
  SnapshotResult,
  TimespanResult,
} from './types';

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function metric(step: FlowStepLike, auditName: string): Metric {
  const audit = step.lhr.audits[auditName];

  return {
    score: (audit?.score ?? 0) * 100,
    numericValue: audit?.numericValue ?? 0,
  };
}

function category(step: FlowStepLike, categoryName: string): number {
  return (step.lhr.categories[categoryName]?.score ?? 0) * 100;
}

function average(values: number[], digits = 2): number {
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, digits);
}

function averageMetric(steps: FlowStepLike[], auditName: string): Metric {
  const metrics = steps.map((step) => metric(step, auditName));

  return {
    score: average(metrics.map((value) => value.score)),
    numericValue: average(
      metrics.map((value) => value.numericValue),
      3,
    ),
  };
}

export function parseNavigationResults(steps: FlowStepLike[]): NavigationResult {
  return {
    performance: average(steps.map((step) => category(step, 'performance'))),
    accessibility: average(steps.map((step) => category(step, 'accessibility'))),
    bestPractices: average(steps.map((step) => category(step, 'best-practices'))),
    seo: average(steps.map((step) => category(step, 'seo'))),
    firstContentfulPaint: averageMetric(steps, 'first-contentful-paint'),
    largestContentfulPaint: averageMetric(steps, 'largest-contentful-paint'),
    totalBlockingTime: averageMetric(steps, 'total-blocking-time'),
    cumulativeLayoutShift: averageMetric(steps, 'cumulative-layout-shift'),
    speedIndex: averageMetric(steps, 'speed-index'),
    totalByteWeight: averageMetric(steps, 'total-byte-weight'),
  };
}

type LongTaskDetails = {
  items?: Array<{ duration?: number }>;
};

function getLongTasks(step: FlowStepLike): { total: number; durationMs: number } {
  const details = step.lhr.audits['long-tasks']?.details as LongTaskDetails | undefined;
  const items = details?.items ?? [];

  return {
    total: items.length,
    durationMs: items.reduce((sum, item) => sum + (item.duration ?? 0), 0),
  };
}

export function parseTimespanResults(steps: FlowStepLike[]): TimespanResult {
  const longTasks = steps.map(getLongTasks);

  return {
    performance: average(steps.map((step) => category(step, 'performance'))),
    bestPractices: average(steps.map((step) => category(step, 'best-practices'))),
    totalBlockingTime: averageMetric(steps, 'total-blocking-time'),
    cumulativeLayoutShift: averageMetric(steps, 'cumulative-layout-shift'),
    interactionToNextPaint: averageMetric(steps, 'interaction-to-next-paint'),
    longTasks: {
      total: average(longTasks.map((value) => value.total)),
      durationMs: average(
        longTasks.map((value) => value.durationMs),
        3,
      ),
    },
  };
}

export function parseSnapshotResults(steps: FlowStepLike[]): SnapshotResult {
  return {
    accessibility: average(steps.map((step) => category(step, 'accessibility'))),
    bestPractices: average(steps.map((step) => category(step, 'best-practices'))),
    seo: average(steps.map((step) => category(step, 'seo'))),
  };
}

export function parseLighthouseReports(reports: FlowResultLike[]): LighthouseSummary {
  if (reports.length === 0 || reports.some((report) => report.steps.length < 3)) {
    throw new Error('Each Lighthouse flow must contain navigation, timespan, and snapshot steps.');
  }

  return {
    navigation: parseNavigationResults(reports.map((report) => report.steps[0]!)),
    timespan: parseTimespanResults(reports.map((report) => report.steps[1]!)),
    snapshot: parseSnapshotResults(reports.map((report) => report.steps[2]!)),
  };
}
