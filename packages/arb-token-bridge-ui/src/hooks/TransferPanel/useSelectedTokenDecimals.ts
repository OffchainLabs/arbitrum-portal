import { useNativeCurrencyForTransfer } from '../useNativeCurrency';
import { useSelectedToken } from '../useSelectedToken';

export function useSelectedTokenDecimals() {
  const [selectedToken] = useSelectedToken();
  const { balanceDecimals: nativeCurrencyDecimalsOnSourceChain } = useNativeCurrencyForTransfer();

  return selectedToken ? selectedToken.decimals : nativeCurrencyDecimalsOnSourceChain;
}
