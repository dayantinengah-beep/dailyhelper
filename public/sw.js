/* =========================================================
   DAILY HELPER - sw.js (Service Worker)
   File kecil ini "berjaga" di belakang layar HP kamu.
   Tugasnya: terima notifikasi dari server, tampilkan ke HP,
   dan buka lagi Daily Helper kalau notifikasinya ditap.
========================================================= */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---------- MENERIMA PESAN DARI SERVER ----------
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Daily Helper',
    body: 'Kamu punya pengingat baru.',
    url: '/'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    tag: 'daily-helper-reminder-' + Date.now(),
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ---------- SAAT NOTIFIKASI DITAP ----------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});