import { installRenderProfiler, startFakeClock } from './src/test-utils/renderProfiler';

installRenderProfiler();

// Imported once the profiler is installed, in case its imports load react-dom
const { startProfileNetwork } = await import('./src/test-utils/renderProfileNetwork');
startProfileNetwork();
startFakeClock();
