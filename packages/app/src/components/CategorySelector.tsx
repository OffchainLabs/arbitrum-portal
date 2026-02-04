'use client';

import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

export interface CategorySelectorOption {
  id: string;
  label: string;
  imageUrl: string;
  onClick: () => void;
}

interface CategorySelectorProps {
  config: CategorySelectorOption[];
  selectedId: string;
  title?: string;
}

export function CategorySelector({ config, selectedId, title }: CategorySelectorProps) {
  return (
    <div className="flex flex-col gap-4">
      {title && (
        <>
          <div className="text-2xl">{title}</div>
          <hr className="border-white/40" />
        </>
      )}

      <div className="relative h-full w-full">
        <div className="flex w-full flex-nowrap justify-around gap-2 overflow-hidden rounded-md">
          {config.map((option, index) => {
            const isSelected = selectedId === option.id;
            const isFirst = index === 0;
            const isLast = index === config.length - 1;

            return (
              <button
                className={twMerge(
                  'group relative flex h-20 w-[20%] shrink grow skew-x-[-23deg] items-end justify-start overflow-hidden lg:p-2 lg:px-3 p-1 text-xs transition-all hover:w-[30%]',
                  isSelected ? 'bg-default-black' : 'bg-white/10',
                  isFirst && 'ml-[-20px]',
                  isLast && 'mr-[-20px]',
                )}
                key={option.id}
                onClick={option.onClick}
              >
                <div className="absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-t from-black/60 from-[25%] to-transparent" />
                <Image
                  src={option.imageUrl}
                  fill
                  style={{ objectFit: 'contain' }}
                  alt={option.label}
                  className={twMerge(
                    'skew-x-[23deg] scale-[2.3] opacity-30 grayscale group-hover:grayscale-0',
                    isSelected && 'opacity-70 grayscale-0',
                  )}
                />
                <div
                  className={twMerge(
                    'z-20 skew-x-[23deg] lg:px-2 p-0 text-sm opacity-80 lg:text-lg',
                    isFirst && 'lg:ml-[20px] ml-[30px]',
                    isSelected && 'font-bold opacity-100',
                  )}
                >
                  <span className="hidden lg:block">{option.label}</span>
                  <span className="lg:hidden">{option.label.split(' ')[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
