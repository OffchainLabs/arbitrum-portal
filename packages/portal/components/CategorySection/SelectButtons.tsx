import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const selectAllButtonStyles =
  'mt-2 flex items-center justify-center gap-1 hover:text-black rounded-md hover:bg-white text-sm p-2 px-3';

export const SelectAllButton = ({ onClick }: React.ComponentPropsWithoutRef<'button'>) => (
  <button className={selectAllButtonStyles} onClick={onClick}>
    <CheckIcon className="h-4 w-4 stroke-current stroke-[3px] lg:h-3 lg:w-3" />
    <span>Select all</span>
  </button>
);

export const UnselectAllButton = ({ onClick }: React.ComponentPropsWithoutRef<'button'>) => (
  <button className={selectAllButtonStyles} onClick={onClick}>
    <XMarkIcon className="h-4 w-4 stroke-current stroke-[3px] lg:h-3 lg:w-3" />
    <span className="font-medium">Unselect all</span>
  </button>
);
