import { LighthouseDiff, LighthouseSummary, Metric } from './types';

const marker = '<!-- lighthouse-user-flow-report -->';

function delta(value: number, lowerIsBetter = false): string {
  const direction = lowerIsBetter ? -value : value;
  const icon = direction > 0 ? ' ✅' : direction < 0 ? ' ⚠️' : '';
  return `${value > 0 ? '+' : ''}${value}${icon}`;
}

function scoreRow(name: string, current: number, baseline: number, difference: number): string {
  return `| ${name} | ${current} | ${baseline} | ${delta(difference)} |`;
}

function metricRow(
  name: string,
  current: Metric,
  baseline: Metric,
  difference: Metric,
  unit: string,
): string {
  return `| ${name} | ${current.score} (${current.numericValue}${unit}) | ${baseline.score} (${baseline.numericValue}${unit}) | ${delta(difference.score)} (${delta(difference.numericValue, true)}${unit}) |`;
}

export function formatLighthouseReport(
  current: LighthouseSummary,
  baseline: LighthouseSummary,
  difference: LighthouseDiff,
): string {
  const navigation = [
    '| Navigation | Result | Baseline | Δ |',
    '|---|---:|---:|---:|',
    scoreRow(
      'Performance',
      current.navigation.performance,
      baseline.navigation.performance,
      difference.navigation.performance,
    ),
    scoreRow(
      'Accessibility',
      current.navigation.accessibility,
      baseline.navigation.accessibility,
      difference.navigation.accessibility,
    ),
    scoreRow(
      'Best Practices',
      current.navigation.bestPractices,
      baseline.navigation.bestPractices,
      difference.navigation.bestPractices,
    ),
    scoreRow('SEO', current.navigation.seo, baseline.navigation.seo, difference.navigation.seo),
    metricRow(
      'First Contentful Paint',
      current.navigation.firstContentfulPaint,
      baseline.navigation.firstContentfulPaint,
      difference.navigation.firstContentfulPaint,
      ' ms',
    ),
    metricRow(
      'Largest Contentful Paint',
      current.navigation.largestContentfulPaint,
      baseline.navigation.largestContentfulPaint,
      difference.navigation.largestContentfulPaint,
      ' ms',
    ),
    metricRow(
      'Total Blocking Time',
      current.navigation.totalBlockingTime,
      baseline.navigation.totalBlockingTime,
      difference.navigation.totalBlockingTime,
      ' ms',
    ),
    metricRow(
      'Cumulative Layout Shift',
      current.navigation.cumulativeLayoutShift,
      baseline.navigation.cumulativeLayoutShift,
      difference.navigation.cumulativeLayoutShift,
      '',
    ),
    metricRow(
      'Speed Index',
      current.navigation.speedIndex,
      baseline.navigation.speedIndex,
      difference.navigation.speedIndex,
      ' ms',
    ),
    metricRow(
      'Total Byte Weight',
      current.navigation.totalByteWeight,
      baseline.navigation.totalByteWeight,
      difference.navigation.totalByteWeight,
      ' bytes',
    ),
  ];

  const timespan = [
    '| Interaction timespan | Result | Baseline | Δ |',
    '|---|---:|---:|---:|',
    scoreRow(
      'Performance',
      current.timespan.performance,
      baseline.timespan.performance,
      difference.timespan.performance,
    ),
    scoreRow(
      'Best Practices',
      current.timespan.bestPractices,
      baseline.timespan.bestPractices,
      difference.timespan.bestPractices,
    ),
    metricRow(
      'Total Blocking Time',
      current.timespan.totalBlockingTime,
      baseline.timespan.totalBlockingTime,
      difference.timespan.totalBlockingTime,
      ' ms',
    ),
    metricRow(
      'Cumulative Layout Shift',
      current.timespan.cumulativeLayoutShift,
      baseline.timespan.cumulativeLayoutShift,
      difference.timespan.cumulativeLayoutShift,
      '',
    ),
    metricRow(
      'Interaction to Next Paint',
      current.timespan.interactionToNextPaint,
      baseline.timespan.interactionToNextPaint,
      difference.timespan.interactionToNextPaint,
      ' ms',
    ),
    `| Long tasks | ${current.timespan.longTasks.total} (${current.timespan.longTasks.durationMs} ms) | ${baseline.timespan.longTasks.total} (${baseline.timespan.longTasks.durationMs} ms) | ${delta(difference.timespan.longTasks.total, true)} (${delta(difference.timespan.longTasks.durationMs, true)} ms) |`,
  ];

  const snapshot = [
    '| Final snapshot | Result | Baseline | Δ |',
    '|---|---:|---:|---:|',
    scoreRow(
      'Accessibility',
      current.snapshot.accessibility,
      baseline.snapshot.accessibility,
      difference.snapshot.accessibility,
    ),
    scoreRow(
      'Best Practices',
      current.snapshot.bestPractices,
      baseline.snapshot.bestPractices,
      difference.snapshot.bestPractices,
    ),
    scoreRow('SEO', current.snapshot.seo, baseline.snapshot.seo, difference.snapshot.seo),
  ];

  return [
    marker,
    '<details open>',
    '<summary>🗼 Lighthouse user-flow results</summary>',
    '',
    'Results are the mean of three sequential desktop runs. Δ is result minus baseline.',
    '',
    ...navigation,
    '',
    ...timespan,
    '',
    ...snapshot,
    '',
    '</details>',
  ].join('\n');
}

export { marker as lighthouseCommentMarker };
