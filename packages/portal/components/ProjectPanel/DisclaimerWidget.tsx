import { InformationCircleIcon } from '@heroicons/react/24/solid';

export const DisclaimerWidget = () => (
  <div className="my-4 inline-flex w-full gap-1 text-xs text-white/75">
    <InformationCircleIcon className="h-4 w-4 shrink-0" />
    The content here is provided by the app developers. Links and content are not verified nor
    endorsed by Arbitrum. If you have any questions, please contact the project directly.
  </div>
);
