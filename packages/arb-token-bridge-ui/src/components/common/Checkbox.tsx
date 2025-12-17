import { Switch } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';

export type CheckboxProps = {
  label: string | React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelClassName?: string;
};

export function Checkbox({ labelClassName, label, ...props }: CheckboxProps) {
  return (
    <Switch.Group as="div" className="arb-hover flex flex-row items-start space-x-1">
      <Switch
        {...props}
        className={twMerge(
          'h-3 w-3 flex-shrink-0 rounded-[3px] transition duration-200 ease-in-out mt-[4px]',
          props.checked
            ? 'border-[1px] border-dark bg-white'
            : 'border-[1px] border-gray-6 bg-dark',
        )}
      >
        <CheckIcon className="ml-[2px] mt-[1px] h-2 w-2 stroke-[5] text-dark" />
      </Switch>
      <Switch.Label
        className={twMerge(
          'cursor-pointer',
          labelClassName,
          props.checked ? 'text-white' : 'text-gray-3',
        )}
      >
        {label}
      </Switch.Label>
    </Switch.Group>
  );
}
