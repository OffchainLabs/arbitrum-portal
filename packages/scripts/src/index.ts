#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('orbit-scripts')
  .description('CLI for Arbitrum chain management scripts')
  .version('1.0.0');

program
  .command('add-orbit-chain <targetJsonPath>')
  .description('Add a new Arbitrum chain')
  .action(async (targetJsonPath) => {
    try {
      const { addOrbitChain } = await import('./addOrbitChain');
      await addOrbitChain(targetJsonPath);
    } catch (error) {
      console.error(`Error in addOrbitChain: ${error}`);
      process.exit(1);
    }
  });

program
  .command('update-assertion-intervals <targetJsonPath>')
  .description('Update orbit chain assertion intervals from recent rollup assertions')
  .action(async (targetJsonPath) => {
    try {
      const { updateAssertionIntervals } = await import('./updateAssertionIntervals');
      await updateAssertionIntervals(targetJsonPath);
    } catch (error) {
      console.error(`Error in updateAssertionIntervals: ${error}`);
      process.exit(1);
    }
  });

// Add more commands here as needed, for example:
// program
//   .command('some-other-script')
//   .description('Description of the other script')
//   .action(() => {
//     // Call the function for the other script
//   });

program.parseAsync(process.argv).catch((error) => {
  console.error(`Error parsing command: ${error}`);
  process.exit(1);
});
