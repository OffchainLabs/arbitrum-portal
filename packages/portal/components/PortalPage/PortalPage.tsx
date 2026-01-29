// PortalPage wrapper - DEPRECATED
// This component is being phased out. Styles have been migrated to:
// - sticky-top-bar ID moved to MasterNavbar
// - Content wrapper styles moved to portal layout
// - SearchBar moved to ArbitrumNavigation
// - HeaderDropdownMenu moved to ProjectsFilterBar
export const PortalPage = ({ children }: { children: React.ReactNode }) => {
  // Content wrapper styles preserved for backward compatibility during migration
  return (
    <div className="relative mx-auto flex w-full max-w-[1153px] flex-col gap-4 px-4 pb-[160px] lg:gap-6">
      {children}
    </div>
  );
};
