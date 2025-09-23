import { HeaderDropdownMenu } from '../HeaderDropdownMenu';
import { SitewideSearchBar } from './SitewideSearchBar';

export const PortalPage = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="portal">
      <div
        id="sticky-top-bar"
        className="sticky top-0 z-40 flex w-full flex-col items-center gap-4 py-6 pb-4 transition-all duration-300 lg:pb-6"
      >
        <div className="m-auto flex w-full max-w-[1153px] items-center justify-between gap-4 px-6">
          <SitewideSearchBar />

          <HeaderDropdownMenu />
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-[1153px] flex-col gap-4 px-6 pb-[160px] lg:gap-6">
        {children}
      </div>
    </div>
  );
};
