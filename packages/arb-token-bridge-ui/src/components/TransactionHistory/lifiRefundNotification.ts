import type { LifiMergedTransaction } from '../../state/app/state';
import { getNetworkName } from '../../util/networks';
import { warningToast } from '../common/atoms/Toast';

const LIFI_REFUND_TOAST_KEY_PREFIX = 'arbitrum:bridge:lifi:refund:';

export function showLifiRefundToastOnce(tx: LifiMergedTransaction) {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = `${LIFI_REFUND_TOAST_KEY_PREFIX}${tx.txId}`;
  if (window.localStorage.getItem(storageKey)) {
    return;
  }

  window.localStorage.setItem(storageKey, '1');
  const networkName = getNetworkName(tx.destinationChainId);
  warningToast(`Tokens refunded on ${networkName}`);
}
