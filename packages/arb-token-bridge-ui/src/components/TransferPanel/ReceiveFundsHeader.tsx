import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useAccountType } from '../../hooks/useAccountType';
import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { Button } from '../common/Button';
import { Loader } from '../common/atoms/Loader';
import { CustomDestinationAddressInput } from './CustomDestinationAddressInput';
import { useDestinationAddressError } from './hooks/useDestinationAddressError';
import { useRouteStore } from './hooks/useRouteStore';

export const ReceiveFundsHeader = () => {
  const [showCustomDestinationAddressInput, setShowCustomDestinationAddressInput] = useState(false);

  const { accountType } = useAccountType();
  const isSmartContractWallet = accountType === 'smart-contract-wallet';
  const { destinationAddressError } = useDestinationAddressError();

  const isLoadingRoutes = useRouteStore((state) => state.isLoading);

  const [{ destinationAddress }] = useArbQueryParams();

  useEffect(() => {
    // if there is a destination address or error, show the custom destination address input
    if (destinationAddress || destinationAddressError) {
      setShowCustomDestinationAddressInput(true);
      return;
    }

    if (isSmartContractWallet && !showCustomDestinationAddressInput) {
      setShowCustomDestinationAddressInput(true);
    }
  }, [isSmartContractWallet, destinationAddress, destinationAddressError]);

  const toggleCustomDestinationAddressInput = useCallback(() => {
    // for SCW, we must always show the custom destination address input
    if (isSmartContractWallet) {
      setShowCustomDestinationAddressInput(true);
    }

    setShowCustomDestinationAddressInput((prev) => !prev);
  }, [isSmartContractWallet]);

  return (
    <div
      className={twMerge(
        'flex max-h-8 flex-col gap-3 overflow-hidden transition-all duration-200',
        showCustomDestinationAddressInput && 'max-h-[180px]',
        destinationAddressError && 'max-h-[230px]',
      )}
    >
      <div className="flex flex-nowrap items-end justify-between text-white">
        <div className="flex flex-nowrap items-center gap-2">
          <div className="text-[18px]">Receive</div>
          {isLoadingRoutes && <Loader color="white" size="small" />}
        </div>
        <Button
          variant="tertiary"
          aria-label="Show Custom Destination Address"
          onClick={toggleCustomDestinationAddressInput}
          disabled={!!destinationAddressError || isSmartContractWallet}
          className="p-0"
        >
          <div className="flex flex-nowrap items-center gap-1 text-sm opacity-50">
            Send to custom address
            <ChevronDownIcon
              className={twMerge(
                'h-3 w-3 transition duration-200',
                showCustomDestinationAddressInput && 'rotate-180',
              )}
            />
          </div>
        </Button>
      </div>

      <CustomDestinationAddressInput />
    </div>
  );
};
