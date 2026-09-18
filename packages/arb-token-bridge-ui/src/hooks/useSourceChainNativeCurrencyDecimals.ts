import { useNativeCurrencyForTransfer } from './useNativeCurrency';

export const useSourceChainNativeCurrencyDecimals = () =>
  useNativeCurrencyForTransfer().balanceDecimals;
