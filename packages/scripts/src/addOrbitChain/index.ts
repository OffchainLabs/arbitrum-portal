import * as core from '@actions/core';

import {
  createAndValidateOrbitChain,
  handleImages,
  initializeAndFetchData,
  processChainData,
  updateOrbitChainsList,
} from './transforms';

/**
 * Main function to add an Arbitrum chain
 * @param targetJsonPath Path to the target JSON file
 */
export async function addOrbitChain(targetJsonPath: string): Promise<void> {
  try {
    await initializeAndFetchData();

    const { branchName, validatedIncomingData } = await processChainData();

    const { chainLogoPath, nativeTokenLogoPath } = await handleImages(
      branchName,
      validatedIncomingData,
    );

    const orbitChain = await createAndValidateOrbitChain(
      validatedIncomingData,
      chainLogoPath,
      nativeTokenLogoPath,
    );

    await updateOrbitChainsList(orbitChain, targetJsonPath);
  } catch (error) {
    core.setFailed(`Error in addOrbitChain: ${error}`);
    throw error;
  }
}
