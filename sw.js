const CACHE="tilefusion-v2";
const ASSETS=["./","./index.html","./css/style.css","./js/content.js","./js/engine.js","./js/app.js","./manifest.json","./assets/icons/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(e.request.method==="GET"&&r.ok){const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy));}return r;}).catch(()=>caches.match("./index.html")))));
