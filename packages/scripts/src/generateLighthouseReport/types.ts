export type Metric = {
  score: number;
  numericValue: number;
};

export type NavigationResult = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  firstContentfulPaint: Metric;
  largestContentfulPaint: Metric;
  totalBlockingTime: Metric;
  cumulativeLayoutShift: Metric;
  speedIndex: Metric;
  totalByteWeight: Metric;
};

export type TimespanResult = {
  performance: number;
  bestPractices: number;
  totalBlockingTime: Metric;
  cumulativeLayoutShift: Metric;
  interactionToNextPaint: Metric;
  longTasks: {
    total: number;
    durationMs: number;
  };
};

export type SnapshotResult = {
  accessibility: number;
  bestPractices: number;
  seo: number;
};

export type LighthouseSummary = {
  navigation: NavigationResult;
  timespan: TimespanResult;
  snapshot: SnapshotResult;
};

export type LighthouseDiff = LighthouseSummary;

export type FlowStepLike = {
  lhr: {
    audits: Record<
      string,
      {
        score: number | null;
        numericValue?: number;
        details?: unknown;
      }
    >;
    categories: Record<string, { score: number | null } | undefined>;
  };
};

export type FlowResultLike = {
  steps: FlowStepLike[];
};
