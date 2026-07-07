import { useEffect, useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';

import { isValidLifiTransfer } from '../../app/api/crosschain-transfers/utils';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { withdrawOnlyTokens } from '../../util/WithdrawOnlyUtils';
import { isLifiEnabled } from '../../util/featureFlag';
import { Dialog } from '../common/Dialog';
import { ExternalLink } from '../common/ExternalLink';
import { useTokensFromLists } from './TokenSearchUtils';
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly';
import { isDisabledCanonicalTransfer } from './isDisabledCanonicalTransfer';

export function TransferDisabledDialog() {
  const [networks] = useNetworks();
  const { isDepositMode, parentChain, childChain } = useNetworksRelationship(networks);
  const [selectedToken, setSelectedToken] = useSelectedToken();
  // for tracking local state and prevent flickering with async URL params updating
  const [selectedTokenAddressLocalValue, setSelectedTokenAddressLocalValue] = useState<
    string | null
  >(null);
  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly();
  const tokensFromLists = useTokensFromLists();
  const unsupportedToken = sanitizeTokenSymbol(selectedToken?.symbol ?? '', {
    erc20L1Address: selectedToken?.address,
    chainId: networks.sourceChain.id,
  });

  const queryKey = useMemo(() => {
    if (
      !selectedToken ||
      addressesEqual(selectedToken?.address, selectedTokenAddressLocalValue ?? undefined)
    ) {
      return null;
    }

    // If a lifi route exists, don't show any dialog
    if (
      isLifiEnabled() &&
      isValidLifiTransfer({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        fromToken: selectedToken.address,
        tokensFromLists,
      })
    ) {
      return null;
    }

    return [
      selectedToken.address,
      isDepositMode,
      parentChain.id,
      childChain.id,
      isSelectedTokenWithdrawOnly,
      isSelectedTokenWithdrawOnlyLoading,
      'isDisabledCanonicalTransfer',
    ] as const;
  }, [
    childChain.id,
    isDepositMode,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    parentChain.id,
    selectedToken,
    selectedTokenAddressLocalValue,
    tokensFromLists,
    networks.sourceChain.id,
    networks.destinationChain.id,
  ]);

  const { data: shouldShowDialog = false } = useSWRImmutable(
    queryKey,
    ([
      ,
      _isDepositMode,
      parentChainId,
      childChainId,
      _isSelectedTokenWithdrawOnly,
      _isSelectedTokenWithdrawOnlyLoading,
    ]) =>
      isDisabledCanonicalTransfer({
        selectedToken,
        isDepositMode: _isDepositMode,
        parentChainId,
        childChainId,
        isSelectedTokenWithdrawOnly: _isSelectedTokenWithdrawOnly,
        isSelectedTokenWithdrawOnlyLoading: _isSelectedTokenWithdrawOnlyLoading,
      }),
  );

  const isGHO =
    selectedToken &&
    networks.destinationChain.id === ChainId.ArbitrumOne &&
    addressesEqual(
      selectedToken.address,
      withdrawOnlyTokens[ChainId.ArbitrumOne]?.find((_token) => _token.symbol === 'GHO')?.l1Address,
    );

  useEffect(() => {
    if (
      selectedTokenAddressLocalValue &&
      (!selectedToken || !addressesEqual(selectedToken.address, selectedTokenAddressLocalValue))
    ) {
      setSelectedTokenAddressLocalValue(null);
    }
  }, [selectedToken, selectedTokenAddressLocalValue]);

  const onClose = () => {
    if (selectedToken) {
      setSelectedTokenAddressLocalValue(selectedToken.address);
      setSelectedToken(null);
    }
  };

  return (
    <Dialog
      closeable
      title="Token cannot be bridged here"
      cancelButtonProps={{ className: 'hidden' }}
      actionButtonTitle="Close"
      isOpen={shouldShowDialog}
      onClose={onClose}
    >
      <div className="flex flex-col space-y-4 py-4">
        <p>
          Unfortunately, <span className="font-medium">{unsupportedToken}</span> has a custom bridge
          solution that is incompatible with the canonical Arbitrum bridge.
        </p>
        {isGHO && (
          <p>
            Please use the{' '}
            <ExternalLink
              className="underline hover:opacity-70"
              href="https://app.transporter.io/?from=mainnet&tab=token&to=arbitrum&token=GHO"
            >
              CCIP bridge for GHO
            </ExternalLink>{' '}
            instead.
          </p>
        )}
        <p>
          For more information please contact{' '}
          <span className="font-medium">{unsupportedToken}</span>
          &apos;s developer team directly or explore their docs.
        </p>
      </div>
    </Dialog>
  );
}
