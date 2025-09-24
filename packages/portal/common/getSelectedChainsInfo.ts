/*
 gives information about selected chains
*/

import { CHAINS } from './chains';

export const getSelectedChainsInfo = (selectedChains: string[]) => {
  const areAllChainsSelected =
    !selectedChains.length || selectedChains.length === CHAINS.length;
  return {
    areAllChainsSelected,
    isArbitrumOneSelected:
      areAllChainsSelected || selectedChains.includes('arbitrum-one'),
    isArbitrumNovaSelected:
      areAllChainsSelected || selectedChains.includes('arbitrum-nova'),
  };
};
