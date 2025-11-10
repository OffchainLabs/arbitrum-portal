import { getTokenOverride, isValidLifiTransfer } from '@/bridge/app/api/crosschain-transfers/utils';
import { useSelectedToken } from '@/bridge/hooks/useSelectedToken';

import { useDestinationToken } from '../../hooks/useDestinationToken';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { Button } from '../common/Button';
import { DialogWrapper, useDialog2 } from '../common/Dialog2';
import { TokenLogo } from './TokenLogo';
import { useTokensFromLists } from './TokenSearchUtils';

export function DestinationTokenButton(): JSX.Element {
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
  const tokenOverride = getTokenOverride({
    destinationChainId: networks.destinationChain.id,
    fromToken: destinationToken?.address,
    sourceChainId: networks.sourceChain.id,
  });

  const tokenSymbol = tokenOverride.destination
    ? sanitizeTokenSymbol(tokenOverride.destination.symbol, {
        erc20L1Address: tokenOverride.destination.address,
        chainId: networks.destinationChain.id,
      })
    : destinationToken
      ? destinationToken?.symbol
      : nativeCurrency.symbol;

  const tokenLogoSrc = tokenOverride.destination
    ? tokenOverride.destination?.logoURI
    : destinationToken
      ? destinationToken?.logoURI
      : nativeCurrency.logoUrl;

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
        </div>
      </Button>
    </>
  );
}
