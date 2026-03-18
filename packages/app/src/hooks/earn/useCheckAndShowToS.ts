import { useLocalStorage } from '@rehooks/local-storage';
import { useCallback } from 'react';

import { EARN_TOS_LOCALSTORAGE_KEY } from '@/app-lib/earn/constants';
import { useDialog2 } from '@/bridge/components/common/Dialog2';

export function useCheckAndShowToS() {
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(EARN_TOS_LOCALSTORAGE_KEY, false);
  const [tosDialogProps, tosOpenDialog] = useDialog2();

  const checkAndShowToS = useCallback(async (): Promise<boolean> => {
    if (tosAccepted) {
      return true;
    }

    const waitForInput = tosOpenDialog('earn_tos');
    const [confirmed, onCloseData] = await waitForInput();

    if (
      confirmed &&
      onCloseData &&
      typeof onCloseData === 'object' &&
      'tosAccepted' in onCloseData
    ) {
      setTosAccepted(true);
      return true;
    }

    return false;
  }, [setTosAccepted, tosAccepted, tosOpenDialog]);

  return { checkAndShowToS, tosDialogProps };
}
