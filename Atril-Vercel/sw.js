// Atril service worker: works offline and receives PDFs shared from other apps (Android).
const V="atril-v5";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"];
const CDN=["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(async c=>{ await c.addAll(SHELL); await Promise.all(CDN.map(u=>fetch(u,{mode:"cors"}).then(r=>r.ok&&c.put(u,r)).catch(()=>{}))); }).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
function inbox(){ return new Promise((res,rej)=>{ const r=indexedDB.open("atril-inbox",1); r.onupgradeneeded=()=>r.result.createObjectStore("files",{autoIncrement:true}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function receive(req){
  try{ const fd=await req.formData(); const files=fd.getAll("pdf").filter(f=>f&&f.size);
    const db=await inbox(); await new Promise((res,rej)=>{ const t=db.transaction("files","readwrite"); for(const f of files) t.objectStore("files").add({name:f.name||"documento.pdf",blob:f}); t.oncomplete=res; t.onerror=()=>rej(t.error); });
  }catch(e){}
  return Response.redirect("./?compartido=1",303);
}
self.addEventListener("fetch",e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method==="POST" && url.pathname.endsWith("/compartir")){ e.respondWith(receive(req)); return; }
  if(req.method!=="GET") return;
  if(req.mode==="navigate"){ e.respondWith(fetch(req).then(r=>{ const cp=r.clone(); caches.open(V).then(c=>c.put("index.html",cp)); return r; }).catch(()=>caches.match("index.html"))); return; }
  if(url.origin===location.origin || url.hostname==="cdnjs.cloudflare.com" || url.hostname.endsWith("gstatic.com") || url.hostname==="fonts.googleapis.com"){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{ if(r.ok||r.type==="opaque"){ const cp=r.clone(); caches.open(V).then(c=>c.put(req,cp)); } return r; })));
  }
});
