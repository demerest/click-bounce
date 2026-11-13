/* KEEP IT UP service worker: cache-first shell so an installed home-screen app
   plays offline. The game code itself makes zero network requests; only this
   platform cache ever fetches, and only at install/update time. */
var CACHE = 'keep-it-up-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(SHELL);
  }).then(function(){
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){
      return k !== CACHE;
    }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  /* stale-while-revalidate: answer from cache at once, refresh in the
     background, so a new deploy reaches players on the next launch instead of
     being pinned behind an immutable cache-first hit. */
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(e.request, { ignoreSearch: true }).then(function(hit){
      var refresh = fetch(e.request).then(function(res){
        c.put(e.request, res.clone());
        return res;
      }).catch(function(){ return null; });
      if (hit) return hit;
      return refresh.then(function(res){
        if (res) return res;
        return c.match('./index.html');
      });
    });
  }));
});
