import { InformationCircleIcon } from '@heroicons/react/24/outline';

import { ChainId } from '../../types/ChainId';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';
import { SafeImage } from '../common/SafeImage';
import { TokenLogoFallback } from './TokenInfo';
import { useUsdgSuggestion } from './hooks/useUsdgSuggestion';

export function UsdgSuggestionBanner() {
  const { isVisible, destinationSymbol, usdgLogoURI, switchToUsdg } = useUsdgSuggestion();

  if (!isVisible) {
    return null;
  }

  const { color } = getBridgeUiConfigForChain(ChainId.RobinhoodChain);

  return (
    <div
      role="note"
      aria-label="USDG suggestion"
      // Robinhood Chain's accent at 20% alpha, same treatment as the custom address banner
      style={{ backgroundColor: `${color}33`, borderColor: color }}
      className="flex flex-wrap items-center gap-[5px] rounded border p-[15px] text-sm tracking-[-0.28px] text-white"
    >
      <div className="flex min-w-0 flex-1 items-start gap-[5px]">
        <InformationCircleIcon className="mt-[1px] h-5 w-5 shrink-0" />
        <p>
          USDG is Robinhood Chain&apos;s native stablecoin. Most Robinhood apps use USDG
          {destinationSymbol ? `, not ${destinationSymbol}` : ''}.
        </p>
      </div>
      <button
        type="button"
        onClick={switchToUsdg}
        className="arb-hover flex shrink-0 items-center gap-2 rounded bg-black px-[10px] py-[5px] text-sm text-white"
      >
        <SafeImage
          src={usdgLogoURI}
          alt="USDG logo"
          className="h-[15px] w-[15px] shrink-0"
          fallback={<TokenLogoFallback className="h-[15px] w-[15px]" />}
        />
        <span>Switch to USDG</span>
      </button>
    </div>
  );
}
