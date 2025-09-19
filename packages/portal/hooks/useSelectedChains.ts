import { sortByChainRank } from '@/common/chains';
import { useArbQueryParams } from './useArbQueryParams';
import { getSelectedChainsInfo } from '@/common/getSelectedChainsInfo';

export const useSelectedChains = () => {
  const [{ chains: _selectedChains }] = useArbQueryParams();

  const {
    isArbitrumNovaSelected,
    isArbitrumOneSelected,
    areAllChainsSelected,
  } = getSelectedChainsInfo(_selectedChains);

  return {
    selectedChains: _selectedChains.sort(sortByChainRank),
    isArbitrumOneSelected,
    isArbitrumNovaSelected,
    areAllChainsSelected,
  };
};
