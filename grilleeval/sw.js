// GrilleÉval · Service-Worker (nur bei eigenem Hosting, z. B. GitHub Pages; auf claude.ai nie aktiv).
// Netz zuerst: Online kommt immer die neueste Fassung, der Cache dient nur offline.
// Testdaten berührt er nie: Er speichert nur die Dateien der App selbst.
const CACHE='grilleeval-app';
const CORE=['./','index.html','app.js','styles.css','model.mjs','analysis.mjs','auto-results.mjs','bilan.mjs','bilan-view.mjs','catalogue.mjs','curriculum.mjs','descriptor-layout.mjs','pages-garde.mjs','plan-links.mjs','vendor/jspdf.umd.min.js','assets/schullogo.png','assets/icon-192.png','manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))));});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  const key=u.origin+u.pathname;
  e.respondWith(fetch(key,{cache:'no-cache',credentials:'same-origin'}).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(key,copy));}
    return res;
  }).catch(()=>caches.match(key).then(hit=>hit||(r.mode==='navigate'?caches.match(new URL('index.html',self.registration.scope).href):Response.error()))));
});
