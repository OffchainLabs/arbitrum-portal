import { useState, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { isAddress } from 'ethers/lib/utils'
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid'

import { getExplorerUrl } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

import { useAccountType } from '../../hooks/useAccountType'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { AccountType } from '../../util/AccountUtils'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useDestinationAddressError } from './hooks/useDestinationAddressError'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import useSWRImmutable from 'swr/immutable'

export enum DestinationAddressErrors {
  INVALID_ADDRESS = 'The destination address is not a valid address.',
  REQUIRED_ADDRESS = 'The destination address is required.',
  DENYLISTED_ADDRESS = 'The address you entered is a known contract address, and sending funds to it would likely result in losing said funds. If you think this is a mistake, please contact our support.',
  TELEPORT_DISABLED = 'LayerLeap transfers to custom destination addresses are not supported yet.'
}

enum DestinationAddressWarnings {
  CONTRACT_ADDRESS = 'The destination address is a contract address. Please make sure it is the right address.'
}

async function getDestinationAddressWarning({
  destinationAddress,
  accountType,
  destinationChainId
}: {
  destinationAddress: string | undefined
  accountType: AccountType
  destinationChainId: number
}) {
  if (!destinationAddress) {
    return null
  }

  if (!isAddress(destinationAddress)) {
    return null
  }

  const destinationIsSmartContract = await addressIsSmartContract(
    destinationAddress,
    destinationChainId
  )

  // checks if trying to send to a contract address, only checks EOA
  if (
    (accountType === 'externally-owned-account' ||
      accountType === 'delegated-account') &&
    destinationIsSmartContract
  ) {
    return DestinationAddressWarnings.CONTRACT_ADDRESS
  }

  // no warning
  return null
}

export const CustomDestinationAddressInput = () => {
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)
  const { address } = useAccount()
  const { accountType, isLoading: isLoadingAccountType } = useAccountType()
  const [
    { destinationAddress: destinationAddressFromQueryParams },
    setQueryParams
  ] = useArbQueryParams()

  const [localDestinationAddress, setLocalDestinationAddress] = useState(
    destinationAddressFromQueryParams || ''
  )

  const [inputLocked, setInputLocked] = useState(
    !destinationAddressFromQueryParams &&
      accountType !== 'smart-contract-wallet'
  )

  const { destinationAddressError: error } = useDestinationAddressError(
    localDestinationAddress
  )

  const validateAndSubmitDestinationAddress = useCallback(
    (address: string) => {
      if (error || !address || !isAddress(address)) {
        // Clear query params if there's an error
        setLocalDestinationAddress('')
        setQueryParams({ destinationAddress: undefined })
      } else {
        // if valid, commit to query params
        setQueryParams({ destinationAddress: address })
      }
    },
    [error, setQueryParams, setLocalDestinationAddress]
  )

  const { data: warning } = useSWRImmutable(
    localDestinationAddress &&
      !isLoadingAccountType &&
      typeof accountType !== 'undefined'
      ? [
          localDestinationAddress,
          accountType,
          networks.destinationChain.id,
          isDepositMode,
          childChainProvider,
          parentChainProvider,
          childChain.id,
          parentChain.id,
          'useDestinationAddressWarning'
        ]
      : null,
    ([_destinationAddress, _accountType, _destinationChainId]) =>
      getDestinationAddressWarning({
        destinationAddress: _destinationAddress,
        accountType: _accountType,
        destinationChainId: _destinationChainId
      })
  )

  const isSmartContractWallet = accountType === 'smart-contract-wallet'

  if (isLoadingAccountType) {
    return null
  }

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded border border-white/10 bg-white/5 p-2 text-white">
      <p className="text-sm font-light">
        {isSmartContractWallet ? (
          <>
            With Smart Contract Wallets, you{' '}
            <span className="font-semibold">must specify an address</span>{' '}
            you&apos;d like the funds sent to.
          </>
        ) : (
          'Send your funds to a different address. Be sure you mean to send it here.'
        )}
      </p>
      <div
        className={twMerge(
          'group my-1 flex h-8 w-full items-center rounded bg-black/50 shadow-input',
          inputLocked && 'bg-black/20',
          error && 'border border-red-400',
          warning && !error && 'border border-yellow-500'
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
            'h-full w-full bg-transparent text-sm text-white placeholder-gray-dark',
            error || (localDestinationAddress && !error) ? 'pl-0' : 'pl-2',
            !inputLocked && 'placeholder-white/60'
          )}
          placeholder={
            !address || isSmartContractWallet
              ? 'Enter Destination Address'
              : address
          }
          value={localDestinationAddress}
          disabled={inputLocked}
          spellCheck={false}
          onChange={e => {
            const newValue = e.target.value?.toLowerCase().trim()
            setLocalDestinationAddress(newValue)
          }}
          onBlur={() => {
            // on blur, validate the input, and if valid, commit to query params, else clear the input
            validateAndSubmitDestinationAddress(localDestinationAddress)
          }}
          aria-label="Custom Destination Address Input"
        />
        {!isSmartContractWallet && (
          <button
            onClick={() => setInputLocked(!inputLocked)}
            aria-label="Custom destination input lock"
            className={twMerge(
              'm-1 cursor-pointer rounded-full p-[6px] group-hover:bg-white/10',
              !inputLocked && 'group-hover:bg-transparent'
            )}
          >
            {inputLocked ? (
              <LockClosedIcon height={16} />
            ) : (
              <LockOpenIcon height={16} />
            )}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && warning && (
        <p className="text-sm text-yellow-500">{warning}</p>
      )}
      {localDestinationAddress && !error && (
        <ExternalLink
          className="arb-hover flex w-fit items-center text-sm font-medium text-white/50"
          href={`${getExplorerUrl(
            isDepositMode ? childChain.id : parentChain.id
          )}/address/${localDestinationAddress}`}
        >
          <ArrowDownTrayIcon
            height={12}
            strokeWidth={3}
            className="mr-1 -rotate-90"
          />
          View account in explorer
        </ExternalLink>
      )}
    </div>
  )
}
