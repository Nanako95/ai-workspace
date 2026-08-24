const SHARE_CACHE = 'little-ledger-shared-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      const form = await event.request.formData();
      const files = form.getAll('files').filter(item => item instanceof File && item.size);
      const ids = [];
      const cache = await caches.open(SHARE_CACHE);
      for (const file of files.slice(0, 5)) {
        const id = crypto.randomUUID();
        await cache.put(`/shared-import/${id}`, new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }));
        ids.push(id);
      }
      const text = form.get('text') || form.get('title') || form.get('url') || '';
      const query = new URLSearchParams();
      if (ids.length) query.set('share', ids.join(','));
      if (text) query.set('sharedText', String(text).slice(0, 4000));
      return Response.redirect(`/?${query.toString()}`, 303);
    })());
    return;
  }

  if (event.request.method === 'GET' && url.pathname.startsWith('/shared-import/')) {
    event.respondWith(caches.open(SHARE_CACHE).then(cache => cache.match(event.request)));
  }
});
