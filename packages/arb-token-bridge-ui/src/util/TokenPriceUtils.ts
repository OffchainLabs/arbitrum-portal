import { ContractStorage, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { NativeCurrency } from '../hooks/useNativeCurrency';

/**
 * Return USD value for a given amount using token/native price data.
 */
export function getUsdValueForAmount({
  amount,
  selectedToken,
  nativeCurrency,
  nativeCurrencyPrice,
  tokensFromLists,
}: {
  amount: string | number;
  selectedToken?: ERC20BridgeToken | null;
  nativeCurrency: NativeCurrency;
  nativeCurrencyPrice?: number | null;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
}): number | null {
  const amountNumber = Number(amount);
  if (selectedToken) {
    const priceUSD =
      selectedToken.priceUSD ??
      tokensFromLists[selectedToken.address.toLowerCase()]?.priceUSD ??
      null;
    return priceUSD ? priceUSD * amountNumber : null;
  }

  if (nativeCurrency.isCustom) {
    const priceUSD =
      tokensFromLists[nativeCurrency.address.toLowerCase()]?.priceUSD ??
      nativeCurrencyPrice ??
      null;
    return priceUSD ? priceUSD * amountNumber : null;
  }

  return nativeCurrencyPrice ? nativeCurrencyPrice * amountNumber : null;
}
