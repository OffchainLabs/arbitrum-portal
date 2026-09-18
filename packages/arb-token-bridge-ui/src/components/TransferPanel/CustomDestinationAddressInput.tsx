import { ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useCallback, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { twMerge } from 'tailwind-merge';

import { useAccountType } from '../../hooks/useAccountType';
import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useNetworks } from '../../hooks/useNetworks';
import { getDestinationAddressWarning } from '../../services/destinationAddress';
import { getAccountExplorerUrl } from '../../services/explorer';
import { isValidAddressForChain, normalizeAddress } from '../../util/AddressUtils';
import { useWallets } from '../../wallet/hooks/useWallets';
import { ExternalLink } from '../common/ExternalLink';
import { useDestinationAddressError } from './hooks/useDestinationAddressError';

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid address.',
  REQUIRED_ADDRESS = 'The destination address is required.',
  DENYLISTED_ADDRESS = 'The address you entered is a known contract address, and sending funds to it would likely result in losing said funds. If you think this is a mistake, please contact our support.',
}

export const CustomDestinationAddressInput = () => {
  const [networks] = useNetworks();
  const { destinationWallet } = useWallets();
  const address = destinationWallet.account.address;
  const { accountType, isLoading: isLoadingAccountType } = useAccountType();
  const [{ destinationAddress: destinationAddressFromQueryParams }, setQueryParams] =
    useArbQueryParams();

  const [localDestinationAddress, setLocalDestinationAddress] = useState(
    destinationAddressFromQueryParams || '',
  );

  const isSmartContractWallet = accountType === 'smart-contract-wallet';

  const { destinationAddressError: error } = useDestinationAddressError(localDestinationAddress);

  const validateAndSubmitDestinationAddress = useCallback(
    (address: string) => {
      if (error || !isValidAddressForChain(address, networks.destinationChain.id)) {
        // Clear query params if there's an error
        setLocalDestinationAddress('');
        setQueryParams({ destinationAddress: undefined });
      } else {
        // if valid, commit to query params
        setQueryParams({ destinationAddress: normalizeAddress(address) });
      }
    },
    [error, networks.destinationChain.id, setQueryParams, setLocalDestinationAddress],
  );

  const { data: warning } = useSWRImmutable(
    localDestinationAddress && !isLoadingAccountType && typeof accountType !== 'undefined'
      ? [
          localDestinationAddress,
          accountType,
          networks.destinationChain.id,
          'useDestinationAddressWarning',
        ]
      : null,
    ([_destinationAddress, _accountType, _destinationChainId]) =>
      getDestinationAddressWarning({
        destinationAddress: _destinationAddress,
        accountType: _accountType,
        destinationChainId: _destinationChainId,
      }),
  );

  if (isLoadingAccountType) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded border border-white/10 bg-white/5 p-3 text-white">
      <p className="text-sm font-light">
        {isSmartContractWallet ? (
          <>
            With Smart Contract Wallets, you{' '}
            <span className="font-semibold">must specify an address</span> you&apos;d like the funds
            sent to.
          </>
        ) : (
          'Send your funds to a different address. Be sure you mean to send it here.'
        )}
      </p>
      <div
        className={twMerge(
          'group my-1 flex h-8 w-full items-center rounded bg-black/50 shadow-input',
          error && 'border border-red-400',
          warning && !error && 'border border-yellow-500',
        )}
      >
        {error && (
          <XCircleIcon className="mx-2 h-4 w-4 shrink-0 rounded-full bg-red-400/20 p-[2px] text-red-400" />
        )}
        {localDestinationAddress && !error && (
          <CheckCircleIcon className="mx-2 h-4 w-4 shrink-0 rounded-full bg-green-400/20 p-[2px] text-green-400" />
        )}

        <input
          className={twMerge(
            'h-full w-full bg-transparent text-sm text-white placeholder-white/60',
            error || (localDestinationAddress && !error) ? 'pl-0' : 'pl-2',
          )}
          placeholder={!address || isSmartContractWallet ? 'Enter Destination Address' : address}
          value={localDestinationAddress}
          spellCheck={false}
          onChange={(e) => {
            const newValue = e.target.value.trim();
            setLocalDestinationAddress(newValue);
          }}
          onBlur={() => {
            // on blur, validate the input, and if valid, commit to query params, else clear the input
            validateAndSubmitDestinationAddress(localDestinationAddress);
          }}
          aria-label="Custom Destination Address Input"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && warning && <p className="text-sm text-yellow-500">{warning}</p>}
      {localDestinationAddress && !error && (
        <ExternalLink
          className="arb-hover flex w-fit items-center text-sm font-medium text-white/50"
          href={getAccountExplorerUrl(networks.destinationChain.id, localDestinationAddress)}
        >
          <ArrowDownTrayIcon height={12} strokeWidth={3} className="mr-1 -rotate-90" />
          View account in explorer
        </ExternalLink>
      )}
    </div>
  );
};
