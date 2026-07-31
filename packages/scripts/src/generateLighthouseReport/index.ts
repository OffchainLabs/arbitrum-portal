import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

import { compareLighthouseReports } from './compareLighthouseReports';
import { executeLighthouseFlow } from './executeLighthouse';
import { formatLighthouseReport } from './formatLighthouseReport';
import baseline from './lighthouseBaseline.json';
import { parseLighthouseReports } from './parseLighthouseReports';
import { FlowResultLike, LighthouseSummary } from './types';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(sourceDirectory, '../../../..');

export async function generateLighthouseReport({
  updateBaseline = false,
}: {
  updateBaseline?: boolean;
} = {}): Promise<LighthouseSummary> {
  const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? 'http://127.0.0.1:3000';
  const chromePath = process.env.CHROME_PATH;
  const reportDirectory = resolve(
    process.env.LIGHTHOUSE_REPORT_DIR ?? join(workspaceRoot, 'lighthouse-reports'),
  );
  const runCount = Number(process.env.LIGHTHOUSE_RUNS ?? 3);

  if (!chromePath) {
    throw new Error('CHROME_PATH is required.');
  }
  if (!Number.isInteger(runCount) || runCount < 1) {
    throw new Error('LIGHTHOUSE_RUNS must be a positive integer.');
  }

  await mkdir(reportDirectory, { recursive: true });
  const reports: FlowResultLike[] = [];

  for (let runNumber = 1; runNumber <= runCount; runNumber += 1) {
    console.log(`Running Lighthouse user flow ${runNumber}/${runCount}`);
    reports.push(
      await executeLighthouseFlow({
        baseUrl,
        chromePath,
        reportDirectory,
        runNumber,
      }),
    );
  }

  const summary = parseLighthouseReports(reports);
  const baselineSummary = baseline as LighthouseSummary;
  const difference = compareLighthouseReports(summary, baselineSummary);
  const markdown = formatLighthouseReport(summary, baselineSummary, difference);

  await writeFile(join(reportDirectory, 'summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(join(reportDirectory, 'summary.md'), markdown);

  if (updateBaseline) {
    await writeFile(
      join(sourceDirectory, 'lighthouseBaseline.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log('Updated Lighthouse baseline.');
  }

  console.log(markdown);
  return summary;
}
