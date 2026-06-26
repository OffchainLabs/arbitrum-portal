import Image from 'next/image';

import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { useTokenLists } from '../../hooks/useTokenLists';
import { MergedTransaction } from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
import { TokenListWithId } from '../../util/TokenListUtils';
import { orbitChains } from '../../util/orbitChainsList';

function createTokenLogoByAddressMap(tokenLists: TokenListWithId[] | undefined) {
  const map: { [address: string]: string | undefined } = {};
  for (const list of tokenLists ?? []) {
    for (const token of list.tokens) {
      map[token.address.toLowerCase()] = token.logoURI;
    }
  }
  return map;
}

function createTokenLogoBySymbolMap(tokenLists: TokenListWithId[] | undefined) {
  const map: { [symbol: string]: string | undefined } = {};
  for (const list of tokenLists ?? []) {
    for (const token of list.tokens) {
      const symbol = token.symbol?.toLowerCase();
      if (symbol && !map[symbol]) {
        map[symbol] = token.logoURI;
      }
    }
  }
  return map;
}

export const TransactionsTableTokenImage = ({ tx }: { tx: MergedTransaction }) => {
  const sourceChainTokenLists = useTokenLists(tx.sourceChainId);
  const mainnetTokenLists = useTokenLists(ChainId.ArbitrumOne);

  if (tx.assetType === AssetType.ETH) {
    const orbitChain = orbitChains[tx.childChainId];

    const nativeTokenLogoSrc = orbitChain?.bridgeUiConfig.nativeTokenData?.logoUrl;

    if (nativeTokenLogoSrc) {
      return (
        // we use img in case native token logos are imported from an external source
        // eslint-disable-next-line @next/next/no-img-element
        <img className="w-[20px]" alt="Native token logo" src={nativeTokenLogoSrc} />
      );
    }

    return <Image height={20} width={20} alt="ETH logo" src={EthereumLogoRoundLight} />;
  }

  const logoByAddress = createTokenLogoByAddressMap(sourceChainTokenLists.data);
  const logoBySymbol = createTokenLogoBySymbolMap(mainnetTokenLists.data);

  const tokenLogoSrc =
    (tx.tokenAddress ? logoByAddress[tx.tokenAddress.toLowerCase()] : undefined) ??
    (tx.asset ? logoBySymbol[tx.asset.toLowerCase()] : undefined);

  if (!tokenLogoSrc) {
    return <div className="h-[20px] w-[20px] rounded-full bg-white/20" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="w-[20px]" alt={tx.asset + ' logo'} src={tokenLogoSrc} />
  );
};
