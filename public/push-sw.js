// Shows reminders sent by the Questly server, and opens the app when tapped.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    const raw = event.data ? event.data.json() : {};
    // Firebase Cloud Messaging wraps the fields in "data".
    data = raw.data || raw;
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Questly', {
      body: data.body || 'Your next quest is waiting.',
      tag: data.tag,
      icon: 'icon-192.png',
      badge: 'favicon-32.png',
      data: { url: self.registration.scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
