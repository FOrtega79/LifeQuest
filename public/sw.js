// LifeQuest - Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle real background push events
self.addEventListener('push', (event) => {
  let data = { 
    title: 'LifeQuest', 
    body: 'New update from your LifeQuest companion!' 
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: 'LifeQuest', 
        body: event.data.text() 
      };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Access Station' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle click on notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle local postMessage triggers to support testing in sandboxed environments
const scheduledNotifications = new Map();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body, delay, icon, id } = event.data;

    if (id && scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }

    const showNotification = () => {
      const options = {
        body: body,
        icon: icon || '/icon.png',
        badge: icon || '/icon.png',
        vibrate: [100, 50, 100],
        data: { url: '/' },
        actions: [
          { action: 'open', title: 'Access Station' },
          { action: 'close', title: 'Dismiss' }
        ]
      };
      self.registration.showNotification(title, options);
      if (id) scheduledNotifications.delete(id);
    };

    if (delay && delay > 0) {
      const timer = setTimeout(showNotification, delay);
      if (id) scheduledNotifications.set(id, timer);
    } else {
      showNotification();
    }
  } else if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data;
    if (id && scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }
  }
});
