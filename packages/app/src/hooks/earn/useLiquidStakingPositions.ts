'use client';

import { BigNumber } from 'ethers';

import { useWeETHBalance, useWstETHBalance } from './useLiquidStakingBalances';

interface UseLiquidStakingPositionsResult {
  isLoading: boolean;
  wstETHBalance: BigNumber | null;
  weETHBalance: BigNumber | null;
  refetchWstETHBalance: () => void;
  refetchWeETHBalance: () => void;
}

export function useLiquidStakingPositions(): UseLiquidStakingPositionsResult {
  const {
    balance: wstETHBalance,
    isLoading: isLoadingWstETH,
    refetch: refetchWstETHBalance,
  } = useWstETHBalance();
  const {
    balance: weETHBalance,
    isLoading: isLoadingWeETH,
    refetch: refetchWeETHBalance,
  } = useWeETHBalance();

  const isLoading = isLoadingWstETH || isLoadingWeETH;

  return {
    isLoading,
    wstETHBalance,
    weETHBalance,
    refetchWstETHBalance,
    refetchWeETHBalance,
  };
}
