import { useEffect, useMemo, useState } from 'react';

import { isValidLifiTransfer } from '../../app/api/crosschain-transfers/utils';
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../hooks/useSelectedToken';
import { ChainId } from '../../types/ChainId';
import { addressesEqual } from '../../util/AddressUtils';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { isTransferDisabledToken } from '../../util/TokenTransferDisabledUtils';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { withdrawOnlyTokens } from '../../util/WithdrawOnlyUtils';
import { isLifiEnabled } from '../../util/featureFlag';
import { Dialog } from '../common/Dialog';
import { ExternalLink } from '../common/ExternalLink';
import { useSelectedTokenIsWithdrawOnly } from './hooks/useSelectedTokenIsWithdrawOnly';

export function isDisabledCanonicalTransfer({
  selectedToken,
  isDepositMode,
  parentChainId,
  childChainId,
  isSelectedTokenWithdrawOnly,
  isSelectedTokenWithdrawOnlyLoading,
}: {
  selectedToken: ERC20BridgeToken | null;
  isDepositMode: boolean;
  parentChainId: ChainId;
  childChainId: ChainId;
  isSelectedTokenWithdrawOnly: boolean | undefined;
  isSelectedTokenWithdrawOnlyLoading: boolean;
}) {
  if (!selectedToken) {
    return false;
  }

  if (isTransferDisabledToken(selectedToken.address, childChainId)) {
    return true;
  }

  if (parentChainId === ChainId.ArbitrumOne) {
    if (
      childChainId === ChainId.ApeChain &&
      !addressesEqual(selectedToken.address, CommonAddress.ArbitrumOne.USDC)
    ) {
      return true;
    }

    if (
      childChainId === ChainId.Superposition &&
      !addressesEqual(selectedToken.address, CommonAddress.ArbitrumOne.USDT) &&
      !addressesEqual(selectedToken.address, CommonAddress.ArbitrumOne.USDC)
    ) {
      return true;
    }
  }

  if (isDepositMode && isSelectedTokenWithdrawOnly && !isSelectedTokenWithdrawOnlyLoading) {
    return true;
  }

  return false;
}

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
  const unsupportedToken = sanitizeTokenSymbol(selectedToken?.symbol ?? '', {
    erc20L1Address: selectedToken?.address,
    chainId: networks.sourceChain.id,
  });

  const shouldShowDialog = useMemo(() => {
    if (
      !selectedToken ||
      addressesEqual(selectedToken?.address, selectedTokenAddressLocalValue ?? undefined)
    ) {
      return false;
    }

    // If a lifi route exists, don't show any dialog
    if (
      isLifiEnabled() &&
      isValidLifiTransfer({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        fromToken: isDepositMode ? selectedToken.address : selectedToken.l2Address,
      })
    ) {
      return false;
    }

    return isDisabledCanonicalTransfer({
      selectedToken,
      isDepositMode,
      parentChainId: parentChain.id,
      childChainId: childChain.id,
      isSelectedTokenWithdrawOnly,
      isSelectedTokenWithdrawOnlyLoading,
    });
  }, [
    childChain.id,
    isDepositMode,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    parentChain.id,
    selectedToken,
    selectedTokenAddressLocalValue,
    networks.destinationChain.id,
    networks.sourceChain.id,
  ]);

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
