import { generateLighthouseReport } from './index';

generateLighthouseReport({
  updateBaseline: process.argv.includes('--update-baseline'),
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
