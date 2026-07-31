import { LighthouseDiff, LighthouseSummary, Metric } from './types';

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function diffMetric(current: Metric, baseline: Metric): Metric {
  return {
    score: round(current.score - baseline.score),
    numericValue: round(current.numericValue - baseline.numericValue, 3),
  };
}

export function compareLighthouseReports(
  current: LighthouseSummary,
  baseline: LighthouseSummary,
): LighthouseDiff {
  return {
    navigation: {
      performance: round(current.navigation.performance - baseline.navigation.performance),
      accessibility: round(current.navigation.accessibility - baseline.navigation.accessibility),
      bestPractices: round(current.navigation.bestPractices - baseline.navigation.bestPractices),
      seo: round(current.navigation.seo - baseline.navigation.seo),
      firstContentfulPaint: diffMetric(
        current.navigation.firstContentfulPaint,
        baseline.navigation.firstContentfulPaint,
      ),
      largestContentfulPaint: diffMetric(
        current.navigation.largestContentfulPaint,
        baseline.navigation.largestContentfulPaint,
      ),
      totalBlockingTime: diffMetric(
        current.navigation.totalBlockingTime,
        baseline.navigation.totalBlockingTime,
      ),
      cumulativeLayoutShift: diffMetric(
        current.navigation.cumulativeLayoutShift,
        baseline.navigation.cumulativeLayoutShift,
      ),
      speedIndex: diffMetric(current.navigation.speedIndex, baseline.navigation.speedIndex),
      totalByteWeight: diffMetric(
        current.navigation.totalByteWeight,
        baseline.navigation.totalByteWeight,
      ),
    },
    timespan: {
      performance: round(current.timespan.performance - baseline.timespan.performance),
      bestPractices: round(current.timespan.bestPractices - baseline.timespan.bestPractices),
      totalBlockingTime: diffMetric(
        current.timespan.totalBlockingTime,
        baseline.timespan.totalBlockingTime,
      ),
      cumulativeLayoutShift: diffMetric(
        current.timespan.cumulativeLayoutShift,
        baseline.timespan.cumulativeLayoutShift,
      ),
      interactionToNextPaint: diffMetric(
        current.timespan.interactionToNextPaint,
        baseline.timespan.interactionToNextPaint,
      ),
      longTasks: {
        total: round(current.timespan.longTasks.total - baseline.timespan.longTasks.total),
        durationMs: round(
          current.timespan.longTasks.durationMs - baseline.timespan.longTasks.durationMs,
          3,
        ),
      },
    },
    snapshot: {
      accessibility: round(current.snapshot.accessibility - baseline.snapshot.accessibility),
      bestPractices: round(current.snapshot.bestPractices - baseline.snapshot.bestPractices),
      seo: round(current.snapshot.seo - baseline.snapshot.seo),
    },
  };
}
