import { BigNumber } from 'ethers';
import { useAccount } from 'wagmi';

import { useWeETHBalance, useWstETHBalance } from './useLiquidStakingBalances';

interface UseLiquidStakingPositionsResult {
  isLoading: boolean;
  wstETHBalance: BigNumber | null;
  weETHBalance: BigNumber | null;
}

export function useLiquidStakingPositions(): UseLiquidStakingPositionsResult {
  const { address: walletAddress } = useAccount();

  const { balance: wstETHBalance, isLoading: isLoadingWstETH } = useWstETHBalance(!!walletAddress);
  const { balance: weETHBalance, isLoading: isLoadingWeETH } = useWeETHBalance(!!walletAddress);

  const isLoading = isLoadingWstETH || isLoadingWeETH;

  return {
    isLoading,
    wstETHBalance,
    weETHBalance,
  };
}
