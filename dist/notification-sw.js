self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({type: 'window', includeUncontrolled: true});
    const planner = windows.find(client => client.url.startsWith(self.location.origin) && !client.url.includes('widget=1'));
    if (planner) {
      await planner.focus();
      return;
    }
    await clients.openWindow(target);
  })());
});
