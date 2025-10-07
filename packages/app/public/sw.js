// Service worker for client-side push notifications
// Handles notification display and click events

// Helper function to get user-friendly status message
function getNotificationMessage(payload) {
  const { status, depositStatus, isWithdrawal, direction } = payload;
  const shortTxHash = payload.txHash.substring(0, 6) + '...' + payload.txHash.substring(payload.txHash.length - 4);

  // Map deposit status codes to messages
  const depositStatusMessages = {
    1: 'L1 Transaction Pending',
    2: 'L1 Transaction Failed',
    3: 'L2 Transaction Pending',
    4: 'L2 Transaction Success',
    5: 'L2 Transaction Failed',
    6: 'Transaction Creation Failed',
    7: 'Transaction Expired',
    8: 'CCTP Transfer Processing',
    9: 'Cross-chain Transfer Processing'
  };

  // Map withdrawal statuses
  const withdrawalStatusMessages = {
    'Unconfirmed': 'Withdrawal Initiated',
    'Confirmed': 'Withdrawal Confirmed - Ready to Claim',
    'Executed': 'Withdrawal Claimed Successfully',
    'Expired': 'Withdrawal Expired',
    'Failure': 'Withdrawal Failed'
  };

  let title = 'Bridge Transaction Update';
  let body = `Transaction ${shortTxHash}`;

  // Handle broadcast notification
  if (status === 'BROADCAST') {
    title = isWithdrawal ? '🚀 Withdrawal Initiated' : '🚀 Deposit Initiated';
    body = `Transaction ${shortTxHash} has been signed and broadcast`;
    return { title, body };
  }

  // Handle withdrawal status
  if (isWithdrawal && withdrawalStatusMessages[status]) {
    const statusMsg = withdrawalStatusMessages[status];
    title = statusMsg;
    body = `${shortTxHash} - ${statusMsg}`;
    return { title, body };
  }

  // Handle deposit status
  if (depositStatus && depositStatusMessages[depositStatus]) {
    const statusMsg = depositStatusMessages[depositStatus];
    title = statusMsg;
    body = `${shortTxHash} - ${statusMsg}`;
    return { title, body };
  }

  // Generic status update
  if (status) {
    title = `Transaction ${status}`;
    body = `${shortTxHash} - Status: ${status}`;
  }

  return { title, body };
}

// Listen for messages from the main application
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SHOW_NOTIFICATION') {
    const { title, body } = getNotificationMessage(payload);

    const options = {
      body,
      icon: '/images/ArbitrumLogo-192.png',
      badge: '/images/ArbitrumLogo-192.png',
      tag: payload.txHash, // Reuse notification for same tx
      renotify: true, // Alert even if tag matches existing notification
      requireInteraction: false,
      data: {
        url: `/bridge?tab=tx_history`,
        txHash: payload.txHash
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Basic service worker lifecycle events to ensure it activates immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
