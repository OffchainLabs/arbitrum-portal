import { ChevronDownIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export const CategoryDropdownButton = ({ onClick }: { onClick?: () => void }) => {
  return (
    <button
      className="group flex h-[40px] w-full items-center justify-between gap-1 overflow-hidden rounded-md border border-dark-gray bg-black py-[5px] pl-2 pr-1 text-sm text-white hover:bg-white hover:text-black lg:w-max lg:gap-2 lg:pl-4 lg:pr-2"
      onClick={onClick}
    >
      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        <span className="flex items-center justify-center p-0.5">
          <Squares2X2Icon className="h-5 w-5 stroke-white group-hover:stroke-black" />
        </span>

        <span>Categories</span>
      </div>

      <span className="flex items-center justify-center p-1">
        <ChevronDownIcon className="h-3 w-3 shrink-0 stroke-white stroke-2 group-hover:stroke-black lg:h-4 lg:w-4" />
      </span>
    </button>
  );
};
