import { ChevronDownIcon } from '@heroicons/react/24/outline';

import { isValidLifiTransfer } from '@/bridge/app/api/crosschain-transfers/utils';
import { useSelectedToken } from '@/bridge/hooks/useSelectedToken';

import { useDestinationToken } from '../../hooks/useDestinationToken';
import { NativeCurrency, useNativeCurrency } from '../../hooks/useNativeCurrency';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { Button } from '../common/Button';
import { DialogWrapper, useDialog2 } from '../common/Dialog2';
import { TokenLogo } from './TokenLogo';
import { useTokensFromLists } from './TokenSearchUtils';

export function DestinationTokenButton({
  tokenInfo,
}: { tokenInfo?: NativeCurrency } = {}): JSX.Element {
  const destinationToken = useDestinationToken();
  const [networks] = useNetworks();
  const [selectedToken] = useSelectedToken();
  const tokensFromLists = useTokensFromLists();

  const isLifiTransfer = isValidLifiTransfer({
    destinationChainId: networks.destinationChain.id,
    fromToken: selectedToken?.address,
    sourceChainId: networks.sourceChain.id,
    tokensFromLists,
  });

  const [dialogProps, openDialog] = useDialog2();

  const { childChainProvider } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });

  const tokenSymbol =
    tokenInfo?.symbol ||
    (destinationToken
      ? sanitizeTokenSymbol(destinationToken.symbol, {
          erc20L1Address: destinationToken.address,
          chainId: networks.destinationChain.id,
        })
      : nativeCurrency.symbol);

  const tokenLogoSrc = tokenInfo?.logoUrl || destinationToken?.logoURI || nativeCurrency.logoUrl;

  return (
    <>
      <DialogWrapper {...dialogProps} />

      <Button
        variant="secondary"
        className="px-[10px] py-[5px]"
        aria-label="Select Destination Token"
        onClick={() => openDialog('destination_token_selection')}
        disabled={!isLifiTransfer}
      >
        <div className="flex flex-nowrap items-center gap-1 text-base leading-[1.1]">
          <TokenLogo srcOverride={tokenLogoSrc} />
          <span className="font-light">{tokenSymbol}</span>
          {isLifiTransfer && (
            <ChevronDownIcon
              width={12}
              className={
                dialogProps.openedDialogType === 'destination_token_selection' ? 'rotate-180' : ''
              }
            />
          )}
        </div>
      </Button>
    </>
  );
}
