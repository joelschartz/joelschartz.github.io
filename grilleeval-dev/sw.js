// La version de développement n’existe plus : ce service worker efface son cache, se désinscrit et renvoie vers /grilleeval/.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('grilleeval-grilleeval-dev'))await caches.delete(key);
  await self.registration.unregister();
  for(const client of await self.clients.matchAll({type:'window'}))client.navigate(new URL('../grilleeval/',self.location.href).href);
})()));
