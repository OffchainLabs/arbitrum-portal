import { InformationCircleIcon } from '@heroicons/react/24/outline';

export const Disclaimer = () => {
  return (
    <p className="mx-auto mt-1 flex w-full max-w-site items-start gap-2 px-4 text-xs text-orange lg:items-center lg:px-7">
      <InformationCircleIcon className="h-4 w-4 shrink-0 stroke-orange" />
      <span>
        The links in the Portal do not constitute an endorsement by Arbitrum. For questions about a
        project, contact the project directly.
      </span>
    </p>
  );
};
