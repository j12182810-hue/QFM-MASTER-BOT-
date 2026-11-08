// Native Service Worker for QFM MASTER BOT Web Push Notifications

self.addEventListener('push', function(event) {
  let data = { title: 'QFM MASTER BOT', body: 'Market movement detected. Check the app for details.' };
  
  if (event.data) {
    try {
      const json = event.data.json();
      if (json && (json.title || json.body)) {
        data = { ...data, ...json };
      }
    } catch(e) {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.jpg',
    badge: '/icon.jpg',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: {
      url: '/'
    },
    tag: 'qfm-signal-' + Date.now(),
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
