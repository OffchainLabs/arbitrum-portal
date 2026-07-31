import { describe, expect, it } from 'vitest';

import { compareLighthouseReports } from './compareLighthouseReports';
import { formatLighthouseReport } from './formatLighthouseReport';
import { parseLighthouseReports } from './parseLighthouseReports';
import { FlowResultLike, FlowStepLike } from './types';

function step(multiplier: number): FlowStepLike {
  const audit = (score: number, numericValue: number, details?: unknown) => ({
    score,
    numericValue: numericValue * multiplier,
    details,
  });

  return {
    lhr: {
      audits: {
        'first-contentful-paint': audit(0.9, 100),
        'largest-contentful-paint': audit(0.8, 200),
        'total-blocking-time': audit(0.7, 300),
        'cumulative-layout-shift': audit(1, 0.01),
        'speed-index': audit(0.6, 400),
        'total-byte-weight': audit(0.5, 500),
        'interaction-to-next-paint': audit(0.8, 250),
        'long-tasks': audit(0, 0, {
          items: [{ duration: 100 * multiplier }, { duration: 50 * multiplier }],
        }),
      },
      categories: {
        'performance': { score: 0.75 },
        'accessibility': { score: 0.9 },
        'best-practices': { score: 0.95 },
        'seo': { score: 1 },
      },
    },
  };
}

function report(multiplier: number): FlowResultLike {
  return { steps: [step(multiplier), step(multiplier), step(multiplier)] };
}

describe('Lighthouse report processing', () => {
  it('averages navigation, timespan, snapshot, and long-task metrics', () => {
    const summary = parseLighthouseReports([report(1), report(2)]);

    expect(summary.navigation.performance).toBe(75);
    expect(summary.navigation.firstContentfulPaint).toEqual({
      score: 90,
      numericValue: 150,
    });
    expect(summary.timespan.interactionToNextPaint.numericValue).toBe(375);
    expect(summary.timespan.longTasks).toEqual({ total: 2, durationMs: 225 });
    expect(summary.snapshot).toEqual({ accessibility: 90, bestPractices: 95, seo: 100 });
  });

  it('computes result-minus-baseline deltas and formats a PR comment', () => {
    const baseline = parseLighthouseReports([report(1)]);
    const current = parseLighthouseReports([report(2)]);
    const difference = compareLighthouseReports(current, baseline);
    const markdown = formatLighthouseReport(current, baseline, difference);

    expect(difference.navigation.firstContentfulPaint.numericValue).toBe(100);
    expect(difference.navigation.performance).toBe(0);
    expect(markdown).toContain('<!-- lighthouse-user-flow-report -->');
    expect(markdown).toContain('Interaction timespan');
    expect(markdown).toContain('+100 ⚠️ ms');
  });

  it('rejects incomplete flow reports', () => {
    expect(() => parseLighthouseReports([{ steps: [step(1)] }])).toThrow(
      'navigation, timespan, and snapshot',
    );
  });
});
