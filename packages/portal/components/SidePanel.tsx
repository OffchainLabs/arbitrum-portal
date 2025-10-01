import { Dialog } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
};

export const SidePanel = ({
  isOpen,
  onClose,
  children,
  className,
  panelClassName,
}: SidePanelProps) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-[1001]">
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black opacity-80" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div
        className={twMerge(
          'fixed right-0 top-0 flex h-full items-start justify-end overflow-y-auto bg-white lg:min-w-[700px] lg:max-w-[960px]',
          className,
        )}
        style={{
          animation: 'panelSlideInAnimation 0.3s ease',
        }}
      >
        {/* The heading of dialog  */}
        <Dialog.Panel
          className={twMerge(
            'flex h-full w-full flex-col border border-white/10 font-light',
            panelClassName,
          )}
        >
          {/* need Dialog.Title tag (even though empty) to fix a known bug in @headless/Dialog */}
          {/* https://github.com/tailwindlabs/headlessui/issues/2535#issuecomment-1679907710 */}
          <Dialog.Title />

          {/* Contents of the panel */}
          <div className="side-panel relative z-40 h-full w-full overflow-auto">{children}</div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
