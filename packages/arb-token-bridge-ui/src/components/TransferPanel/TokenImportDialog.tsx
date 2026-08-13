import { Provider } from '@ethersproject/providers';
import { constants } from 'ethers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';

import { allowsUnmatchedLifiTokens } from '../../app/api/crosschain-transfers/constants';
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { useERC20L1Address } from '../../hooks/useERC20L1Address';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { useAppState } from '../../state';
import { isLifiOnlyToken } from '../../util/TokenListUtils';
import { erc20DataToErc20BridgeToken, fetchErc20Data, isValidErc20 } from '../../util/TokenUtils';
import { Dialog, UseDialogProps } from '../common/Dialog';
import { NoteBox } from '../common/NoteBox';
import { Loader } from '../common/atoms/Loader';
import { warningToast } from '../common/atoms/Toast';
import { TokenInfo } from './TokenInfo';
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils';

enum ImportStatus {
  LOADING,
  KNOWN,
  KNOWN_UNIMPORTED,
  UNKNOWN,
  ERROR,
}

type TokenListSearchResult =
  | {
      found: false;
    }
  | {
      found: true;
      token: ERC20BridgeToken;
      status: ImportStatus;
    };

type TokenImportDialogStore = {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
};

export const useTokenImportDialogStore = create<TokenImportDialogStore>((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
}));

type TokenImportDialogProps = Omit<UseDialogProps, 'isOpen'> & {
  tokenAddress: string;
};

async function getValidatedTokenData(address: string, provider: Provider) {
  const erc20Params = { address, provider };
  if (!(await isValidErc20(erc20Params))) {
    throw new Error(`${address} is not a valid ERC-20 token`);
  }
  return fetchErc20Data(erc20Params);
}

export function TokenImportDialog({
  onClose,
  tokenAddress,
}: TokenImportDialogProps): React.JSX.Element {
  const {
    app: {
      arbTokenBridge: { bridgeTokens, token },
    },
  } = useAppState();
  const [, setSelectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { childChain, parentChainProvider, isDepositMode } = useNetworksRelationship(networks);
  const allowsUnmatchedTokenImport = allowsUnmatchedLifiTokens(networks.sourceChain.id);
  const sourceTokenAddress = tokenAddress.toLowerCase();

  const tokensFromUser = useTokensFromUser();
  const { data: tokensFromLists } = useTokensFromLists();

  const [status, setStatus] = useState<ImportStatus>(ImportStatus.LOADING);
  const [isImportingToken, setIsImportingToken] = useState<boolean>(false);
  const [tokenToImport, setTokenToImport] = useState<ERC20BridgeToken>();
  const isOpen = useTokenImportDialogStore((state) => state.isOpen);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const {
    data: l1Address,
    hasParentAddress,
    isLoading: isParentAddressLoading,
  } = useERC20L1Address({
    eitherL1OrL2Address: tokenAddress,
    l2ChainId: childChain.id,
  });
  const addressToImport = l1Address ?? sourceTokenAddress;
  const isUnmatchedTokenImport = allowsUnmatchedTokenImport && isLifiOnlyToken(tokenToImport);

  // we use a different state to handle dialog visibility to trigger the entry transition,
  // otherwise if we only used isOpen then the transition would never trigger because
  // we conditionally render the component and we'd always start with isOpen as true
  //
  // for the transition to work we need to start as false and update it to true
  useEffect(() => {
    setIsDialogVisible(isOpen);
  }, [isOpen]);

  const modalTitle = useMemo(() => {
    switch (status) {
      case ImportStatus.LOADING:
        return 'Loading token';
      case ImportStatus.KNOWN:
      case ImportStatus.KNOWN_UNIMPORTED:
        return 'Import known token';
      case ImportStatus.UNKNOWN:
        return 'Import unknown token';
      case ImportStatus.ERROR:
        return 'Invalid token address';
    }
  }, [status]);

  const getTokenData = useCallback(async () => {
    if (!hasParentAddress && !isDepositMode && allowsUnmatchedTokenImport) {
      try {
        const data = await getValidatedTokenData(sourceTokenAddress, networks.sourceChainProvider);
        return {
          ...erc20DataToErc20BridgeToken(data),
          address: sourceTokenAddress,
          l2Address: sourceTokenAddress,
          lifiOnlyChainId: networks.sourceChain.id,
        };
      } catch {
        // The URL may contain a parent-chain address while the source is the child chain.
        // Fall through to preserve canonical imports using that address.
      }
    }

    const data = await getValidatedTokenData(addressToImport, parentChainProvider);
    return erc20DataToErc20BridgeToken(data);
  }, [
    addressToImport,
    allowsUnmatchedTokenImport,
    hasParentAddress,
    isDepositMode,
    networks.sourceChainProvider,
    parentChainProvider,
    networks.sourceChain.id,
    sourceTokenAddress,
  ]);

  const searchForTokenInLists = useCallback(
    (erc20L1Address: string): TokenListSearchResult => {
      // We found the token in an imported list
      if (typeof bridgeTokens === 'undefined') {
        return { found: false };
      }

      const l1Token = bridgeTokens[erc20L1Address];
      if (typeof l1Token !== 'undefined') {
        return {
          found: true,
          token: l1Token,
          status: ImportStatus.KNOWN,
        };
      }

      const tokens = {
        ...tokensFromLists,
        ...tokensFromUser,
      };

      const token = tokens[erc20L1Address];
      // We found the token in an unimported list
      if (typeof token !== 'undefined') {
        return {
          found: true,
          token,
          status: ImportStatus.KNOWN_UNIMPORTED,
        };
      }

      return { found: false };
    },
    [bridgeTokens, tokensFromLists, tokensFromUser],
  );

  const selectToken = useCallback(
    async (_token: ERC20BridgeToken) => {
      if (!isLifiOnlyToken(_token)) {
        await token.updateTokenData(_token.address);
      }
      setSelectedToken(_token.address, _token);
    },
    [token, setSelectedToken],
  );

  useEffect(() => {
    if (!isOpen || isImportingToken || isParentAddressLoading) {
      return;
    }

    if (typeof bridgeTokens === 'undefined') {
      return;
    }

    if (addressToImport) {
      if (addressToImport === constants.AddressZero) {
        return;
      }

      const searchResult1 = searchForTokenInLists(addressToImport);

      if (searchResult1.found) {
        setStatus(searchResult1.status);
        setTokenToImport(searchResult1.token);

        return;
      }
    }

    // Can't find the address provided, so we look further
    getTokenData()
      .then((tokenData) => {
        if (!tokenData) {
          return;
        }

        // We couldn't find the address within our lists
        setStatus(ImportStatus.UNKNOWN);
        setTokenToImport(tokenData);
      })
      .catch(() => {
        setStatus(ImportStatus.ERROR);
      });
  }, [
    addressToImport,
    bridgeTokens,
    getTokenData,
    isParentAddressLoading,
    isOpen,
    searchForTokenInLists,
    isImportingToken,
  ]);

  async function storeNewToken(newToken: string) {
    try {
      await (isUnmatchedTokenImport
        ? token.addLifiTokenForChain(newToken, networks.sourceChain.id)
        : token.add(newToken));
    } catch (ex) {
      setStatus(ImportStatus.ERROR);

      if (ex instanceof Error && ex.name === 'TokenDisabledError') {
        warningToast('This token is currently paused in the bridge');
      }
      throw ex;
    }
  }

  function handleTokenImport() {
    if (typeof bridgeTokens === 'undefined' || isImportingToken || !tokenToImport) {
      return;
    }

    setIsImportingToken(true);

    if (typeof bridgeTokens[addressToImport] !== 'undefined') {
      // Token is already added to the bridge
      onClose(true);
      selectToken(tokenToImport);
    } else {
      // Token is not added to the bridge, so we add it
      storeNewToken(addressToImport)
        .then(() => selectToken(tokenToImport))
        .catch(() => {
          setStatus(ImportStatus.ERROR);
          setIsImportingToken(false);
        });
    }
  }

  if (status === ImportStatus.LOADING) {
    return (
      <Dialog
        isOpen={isDialogVisible}
        onClose={onClose}
        title={modalTitle}
        actionButtonProps={{ hidden: true }}
      >
        <div className="flex h-48 items-center justify-center">
          <Loader color="white" size="medium" />
        </div>
      </Dialog>
    );
  }

  if (status === ImportStatus.ERROR) {
    return (
      <Dialog
        isOpen={isDialogVisible}
        onClose={onClose}
        title={modalTitle}
        actionButtonProps={{ hidden: true }}
      >
        <span className="flex py-4">
          Whoops, looks like this token address is invalid. Try asking the token team to update
          their link.
        </span>
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen={isDialogVisible}
      onClose={onClose}
      title={modalTitle}
      actionButtonProps={{
        loading: isImportingToken,
        onClick: handleTokenImport,
      }}
      actionButtonTitle="Import token"
    >
      <div className="flex flex-col space-y-4 pt-4">
        {status === ImportStatus.KNOWN && <span>This token is on an imported token list:</span>}

        {status === ImportStatus.KNOWN_UNIMPORTED && (
          <span>This token hasn&apos;t been imported yet but appears on a token list:</span>
        )}

        <div className="flex flex-col pb-4">
          <TokenInfo token={tokenToImport} showFullAddress />

          {status === ImportStatus.UNKNOWN && (
            <NoteBox className="mt-4" variant="warning">
              <div className="flex flex-col space-y-2">
                <p>
                  This token address doesn&apos;t exist in any of the token lists we have. This
                  doesn&apos;t mean it&apos;s not good, it just means{' '}
                  <span className="font-bold">proceed with caution.</span>
                </p>
                <p>
                  It&apos;s easy to impersonate the name of any token, including ETH. Make sure you
                  trust the source it came from. If it&apos;s a popular token, there&apos;s a good
                  chance we have it on our list. If it&apos;s a smaller or newer token, it&apos;s
                  reasonable to believe we might not have it.
                </p>
              </div>
            </NoteBox>
          )}

          <NoteBox className="mt-4">
            <span className="font-medium">
              Non-standard tokens aren&apos;t supported by the bridge.
            </span>{' '}
            Ex: if the token balance increases or decreases while sitting in a wallet address.
            Contact the team behind the token to find out if this token is standard or not.
          </NoteBox>
        </div>
      </div>
    </Dialog>
  );
}
