// GrilleÉval · Service-Worker (nur bei eigenem Hosting, z. B. GitHub Pages; auf claude.ai nie aktiv).
// Netz zuerst: Online kommt immer die neueste Fassung, der Cache dient nur offline.
// D1.57 · Ein Cache pro Version (sw.js?v=D1.57): Die Installation gelingt nur vollständig (addAll),
// sonst bleibt die alte Version aktiv; alte Caches werden erst nach der Aktivierung gelöscht.
// Testdaten berührt er nie: Er speichert nur die Dateien der App selbst.
const VERSION=new URL(self.location.href).searchParams.get('v')||'dev';
const CACHE='grilleeval-'+VERSION;
const CORE=['./','index.html','app.js','styles.css','model.mjs','analysis.mjs','auto-results.mjs','bilan.mjs','bilan-view.mjs','catalogue.mjs','curriculum.mjs','descriptor-layout.mjs','pages-garde.mjs','overview-pdf.mjs','report-pdf.mjs','plan-links.mjs','vendor/jspdf.umd.min.js','vendor/ge-sans-Regular.ttf','vendor/ge-sans-Bold.ttf','assets/schullogo.png','assets/icon-192.png','manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('grilleeval-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  const key=u.origin+u.pathname;
  e.respondWith(fetch(key,{cache:'no-cache',credentials:'same-origin'}).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(key,copy));}
    return res;
  }).catch(()=>caches.match(key,{cacheName:CACHE}).then(hit=>hit||caches.match(key)).then(hit=>hit||(r.mode==='navigate'?caches.match(new URL('index.html',self.registration.scope).href):Response.error()))));
});
