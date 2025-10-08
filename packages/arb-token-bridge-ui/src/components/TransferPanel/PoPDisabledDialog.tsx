import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { ExternalLink } from '@/components/ExternalLink';

import { Dialog } from '../common/Dialog';

export const usePoPDisabledDialogVisibilityStore = create<{
  isPoPDisabledDialogVisible: boolean;
  showPoPDisabledDialog: () => void;
  closePoPDisabledDialog: () => void;
}>((set) => ({
  isPoPDisabledDialogVisible: false,
  showPoPDisabledDialog: () => {
    set(() => ({
      isPoPDisabledDialogVisible: true,
    }));
  },
  closePoPDisabledDialog: () => {
    set(() => ({
      isPoPDisabledDialogVisible: false,
    }));
  },
}));

export function PoPDisabledDialog() {
  const { isPoPDisabledDialogVisible, closePoPDisabledDialog } =
    usePoPDisabledDialogVisibilityStore(
      (state) => ({
        isPoPDisabledDialogVisible: state.isPoPDisabledDialogVisible,
        closePoPDisabledDialog: state.closePoPDisabledDialog,
      }),
      shallow,
    );

  const onClose = () => {
    closePoPDisabledDialog();
  };

  return (
    <Dialog
      closeable
      title="Proof of Play Not Supported"
      cancelButtonProps={{ className: 'hidden' }}
      actionButtonTitle="Close"
      isOpen={isPoPDisabledDialogVisible}
      onClose={onClose}
    >
      <div className="flex flex-col space-y-4 py-4">
        <p>
          The chains Proof of Play Apex and Proof of Play Boss have been deprecated.
          <br />
          Please{' '}
          <ExternalLink
            className="underline"
            href="https://proofofplay.helpshift.com/hc/en/3-shiba-story-go/contact-us/"
          >
            contact the Proof of Play team
          </ExternalLink>{' '}
          directly for withdrawal support.
        </p>
      </div>
    </Dialog>
  );
}
