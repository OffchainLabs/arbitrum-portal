'use client';

import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { Network } from '@/common/chains';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';
import { useSelectedChains } from '@/hooks/useSelectedChains';

export const NetworkOption = ({ network }: { network: Network }) => {
  const [, setQueryParams] = useArbQueryParams();
  const { selectedChains } = useSelectedChains();
  const posthog = usePostHog();

  const checked = useMemo(
    () => selectedChains.some((selectedChain) => selectedChain === network.slug),
    [network.slug, selectedChains],
  );
  const isOnlyOneChecked = selectedChains.length === 1 && checked;

  const onChange = () => {
    posthog?.capture('Chain Dropdown Option Click', {
      network: network.title,
      action: checked ? 'Unselect' : 'Select',
    });

    if (checked) {
      setQueryParams({
        chains: selectedChains.filter((chain) => chain !== network.slug).join('_'),
      });
    } else {
      // should check, so we always add
      setQueryParams({ chains: [...selectedChains, network.slug].join('_') });
    }
  };

  return (
    <div
      key={network.slug}
      className={twMerge('group flex select-none justify-start rounded-md', 'hover:bg-white')}
    >
      <input
        type="checkbox"
        id={network.slug}
        name={network.title}
        checked={checked}
        onChange={onChange}
        className={twMerge(
          'text-grey-400 peer',
          '[&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-gray-200 [&:checked~label_span:first-child]:bg-white', // checked state
          '[&:disabled~label_span:first-child]:bg-white/70 [&:disabled~label_span:nth-child(2)]:opacity-50', // disabled state
        )}
        disabled={isOnlyOneChecked}
        hidden
        aria-hidden={false}
      />
      <label
        htmlFor={network.slug}
        className={twMerge(
          'flex items-center whitespace-pre p-2 px-3 text-left hover:text-black peer-checked:text-white peer-checked:hover:text-black peer-disabled:text-gray-500/50 peer-disabled:hover:text-gray-500/50',
          isOnlyOneChecked ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span className="flex items-center justify-center rounded-sm border border-gray-100/20 bg-default-black p-[3px] lg:p-[1px]">
          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
        </span>
        <span className="ml-2 mr-1 shrink-0">
          <Image
            src={network.logoUrl}
            width={24}
            height={24}
            className="rounded-full lg:h-4 lg:w-4"
            alt={`${network.title} Logo`}
          />
        </span>
        <span>{network.title}</span>
      </label>
    </div>
  );
};
