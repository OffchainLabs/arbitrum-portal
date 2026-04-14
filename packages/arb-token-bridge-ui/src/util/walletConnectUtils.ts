export function onDisconnectHandler() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const isWalletConnect = localStorage.getItem('wagmi.wallet') === '"walletConnect"';

  if (!isWalletConnect) {
    return;
  }

  // Clear WalletConnect session keys from localStorage so reconnection starts fresh.
  // Avoid deleting the entire IndexedDB and force-reloading — that was too aggressive
  // and caused Safe wallet sessions to break on minor disconnects.
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('wc@2')) {
      localStorage.removeItem(key);
    }
  });
}
