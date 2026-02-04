import { NavLogo } from '../NavLogo';
import { NavSearch } from '../NavSearch';
import { NavWallet } from '../NavWallet';

export function NavHeaderMobile() {
  return (
    <nav
      id="sticky-top-bar-mobile"
      className="fixed top-0 left-0 right-0 z-50 flex h-14 w-full items-center gap-2 border-0 bg-black/70 backdrop-blur-sm px-4 md:hidden"
    >
      <div className="flex shrink-0 items-center">
        <NavLogo />
      </div>

      <div className="flex flex-1 items-center min-w-0">
        <NavSearch />
      </div>

      <div className="flex shrink-0 items-center">
        <NavWallet />
      </div>
    </nav>
  );
}
