import { constants } from 'ethers/lib/ethers';
import { useCallback, useMemo, useState } from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { twMerge } from 'tailwind-merge';
import { useAccount } from 'wagmi';

import { useNativeCurrency } from '@/bridge/hooks/useNativeCurrency';
import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';

import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useBalances } from '../../hooks/useBalances';
import { useMode } from '../../hooks/useMode';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { LIFI_TRANSFER_LIST_ID } from '../../util/TokenListUtils';
import { isTokenNativeUSDC, isTokenUSDT, isTokenWBTC } from '../../util/TokenUtils';
import { Dialog, UseDialogProps } from '../common/Dialog';
import { SearchPanelTable } from '../common/SearchPanel/SearchPanelTable';
import { TokenRow } from './TokenRow';
import { useTokensFromLists } from './TokenSearchUtils';

const NATIVE_CURRENCY_IDENTIFIER = 'native_currency';

function DestinationTokensPanel({
  onTokenSelected,
}: {
  onTokenSelected: (token: ERC20BridgeToken | null) => void;
}): React.JSX.Element {
  const { address: walletAddress } = useAccount();
  const [networks] = useNetworks();
  const { isDepositMode, childChainProvider } = useNetworksRelationship(networks);
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider });
  const { erc20ParentBalances, erc20ChildBalances } = useBalances({
    parentWalletAddress: walletAddress,
    childWalletAddress: walletAddress,
  });

  const tokensFromLists = useTokensFromLists();

  const [searchValue, setSearchValue] = useState('');

  const getBalance = useCallback(
    (address: string) => {
      // For destination tokens, we want to show the balance on the destination (child) chain
      // We need to use the l2Address to get the balance
      const token = tokensFromLists[address];
      const l2Address = token?.l2Address;

      if (!l2Address) {
        return null;
      }

      return isDepositMode
        ? erc20ChildBalances?.[l2Address.toLowerCase()]
        : erc20ParentBalances?.[l2Address.toLowerCase()];
    },
    [erc20ChildBalances, erc20ParentBalances, isDepositMode, tokensFromLists],
  );

  const tokensToShow = useMemo(() => {
    const tokenSearch = searchValue.trim().toLowerCase();

    // Get all token addresses that are in the LiFi token list
    const lifiTokenAddresses = Object.keys(tokensFromLists).filter((address) => {
      const token = tokensFromLists[address];
      return token?.listIds.has(LIFI_TRANSFER_LIST_ID);
    });

    const isApeChainToSuperposition =
      networks.sourceChain.id === ChainId.ApeChain &&
      networks.destinationChain.id === ChainId.Superposition;
    // Add native currency if not already included
    // For chains with custom native tokens, always add it even if AddressZero is present
    if (
      (nativeCurrency.isCustom || !lifiTokenAddresses.includes(constants.AddressZero)) &&
      !isApeChainToSuperposition
    ) {
      lifiTokenAddresses.push(NATIVE_CURRENCY_IDENTIFIER);
    }

    return lifiTokenAddresses
      .filter((address) => {
        const token = tokensFromLists[address];

        // If the token on the list is used as a custom fee token, we remove the duplicate
        if (nativeCurrency.isCustom && addressesEqual(address, nativeCurrency.address)) {
          return false;
        }

        if (address === NATIVE_CURRENCY_IDENTIFIER) {
          return true;
        }

        if (!token) {
          return false;
        }

        /**
         * Lifi token lists contain both WETH and ETH token on parent chain mapped to WETH on ApeChain.
         * This check is for ApeChain token row to only show WETH.
         */
        if (
          networks.destinationChain.id === ChainId.ApeChain &&
          addressesEqual(address, constants.AddressZero)
        ) {
          return false;
        }

        if (tokenSearch) {
          const { name, symbol, address: tokenAddress, l2Address = '' } = token;
          return (name + symbol + tokenAddress + l2Address).toLowerCase().includes(tokenSearch);
        }

        return true;
      })
      .sort((address1: string, address2: string) => {
        // lower number = higher priority (top of the panel)
        const getPriority = (address: string): number => {
          if (address === NATIVE_CURRENCY_IDENTIFIER) return 0;
          if (addressesEqual(address, constants.AddressZero)) return 1;
          if (isTokenNativeUSDC(address)) return 2;
          if (isTokenUSDT(address)) return 3;
          if (isTokenWBTC(address)) return 4;
          return 5;
        };

        const priority1 = getPriority(address1);
        const priority2 = getPriority(address2);

        // If priorities are different, sort by priority
        if (priority1 !== priority2) {
          return priority1 - priority2;
        }

        // If priorities are the same, sort by balance
        if (priority1 === 5) {
          const bal1 = getBalance(address1);
          const bal2 = getBalance(address2);

          if (!(bal1 || bal2)) {
            return 0;
          }
          if (!bal1) {
            return 1;
          }
          if (!bal2) {
            return -1;
          }
          return bal1.gt(bal2) ? -1 : 1;
        }

        return 0;
      });
  }, [
    searchValue,
    tokensFromLists,
    networks.sourceChain.id,
    networks.destinationChain.id,
    nativeCurrency,
    getBalance,
  ]);

  const onSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  }, []);

  const rowRenderer = useCallback(
    (virtualizedProps: ListRowProps) => {
      const address = tokensToShow[virtualizedProps.index];
      if (!address) return null;

      const token = tokensFromLists[address] || null;

      return (
        <TokenRow
          key={address}
          style={virtualizedProps.style}
          onTokenSelected={onTokenSelected}
          token={address === NATIVE_CURRENCY_IDENTIFIER ? null : token}
          isDestination
        />
      );
    },
    [tokensToShow, tokensFromLists, onTokenSelected],
  );

  return (
    <SearchPanelTable
      searchInputPlaceholder="Search by token name, symbol, or address"
      searchInputValue={searchValue}
      searchInputOnChange={onSearchInputChange}
      errorMessage=""
      onSubmit={(e) => e.preventDefault()}
      dataCy="destinationTokenSearchList"
      showSearch={true}
      isDialog={true}
    >
      <AutoSizer>
        {({ height, width }) => (
          <List
            width={width - 2}
            height={height}
            rowCount={tokensToShow.length}
            rowHeight={84}
            rowRenderer={rowRenderer}
            style={{ minHeight: '180px' }}
          />
        )}
      </AutoSizer>
    </SearchPanelTable>
  );
}

export function DestinationTokenSearch(props: UseDialogProps) {
  const [, setQueryParams] = useArbQueryParams();
  const { embedMode } = useMode();
  const [networks] = useNetworks();

  async function selectToken(_token: ERC20BridgeToken | null) {
    props.onClose(false);

    if (_token === null) {
      setQueryParams({ destinationToken: undefined });
      return;
    }

    if (!_token?.address) {
      return;
    }

    /**
     * When going from chain that have WETH, it maps to ETH and WETH on the destination chain.
     * In this case, we need to differentiate between ETH (l2Address: zero) and WETH (l2Address: 0x...)
     */
    if (_token.address === constants.AddressZero) {
      if (networks.destinationChain.id === ChainId.ApeChain) {
        setQueryParams({ destinationToken: constants.AddressZero });
      } else if (addressesEqual(_token.l2Address, constants.AddressZero)) {
        // Map native currency to undefined for other chains
        setQueryParams({ destinationToken: undefined });
      } else {
        // WETH
        setQueryParams({ destinationToken: constants.AddressZero });
      }
      return;
    }

    setQueryParams({ destinationToken: _token.address });
  }

  return (
    <Dialog
      {...props}
      onClose={() => props.onClose(false)}
      title="Select Destination Token"
      actionButtonProps={{ hidden: true }}
      isFooterHidden={true}
      className={twMerge(
        'h-screen overflow-hidden md:h-[calc(100vh_-_175px)] md:max-h-[900px] md:max-w-[500px]',
        embedMode && 'md:h-full',
      )}
    >
      <div className="mt-4 flex flex-col gap-4">
        <DestinationTokensPanel onTokenSelected={selectToken} />
      </div>
    </Dialog>
  );
}
