self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'PawSync', body: 'You have a new notification', url: '/notifications' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/favicon.ico', data: { url: data.url } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/notifications'));
});
