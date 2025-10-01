'use client';

import { Disclosure } from '@headlessui/react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { twMerge } from 'tailwind-merge';

import { Card } from './Card';

type FAQ = { q: React.ReactNode; a: React.ReactNode };

export const FAQs = ({ content }: { content: FAQ[] }) => {
  return (
    <Card className="flex flex-col rounded-lg bg-black p-0 text-sm">
      {content.map((c, index) => (
        <Card
          key={`faq-${index}`}
          className={twMerge(
            'flex flex-col rounded-none bg-black p-6',
            index !== content.length - 1 ? 'border-b border-white/20' : '',
          )}
        >
          <Disclosure>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full items-start justify-between text-left text-xl lg:items-center">
                  {c.q}
                  {open ? (
                    <MinusIcon className="h-6 w-6 shrink-0" />
                  ) : (
                    <PlusIcon className="h-6 w-6 shrink-0" />
                  )}
                </Disclosure.Button>
                <Disclosure.Panel>
                  <div className="relative z-10 pr-[30px] pt-2 opacity-70 lg:pr-[150px]">{c.a}</div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </Card>
      ))}
    </Card>
  );
};
