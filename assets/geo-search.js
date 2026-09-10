(()=>{
'use strict';
const CACHE_KEY='costecoche_geo_cache_v1';
let lastRequest=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cleanLabel(display){return String(display||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,4).join(', ')}
function readCache(){try{return JSON.parse(sessionStorage.getItem(CACHE_KEY)||'{}')}catch(e){return {}}}
function writeCache(cache){try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch(e){}}
async function resolve(query){
  const q=String(query||'').trim();
  if(q.length<2)throw new Error('Escribe una ciudad o un código postal de España.');
  const cache=readCache(),key=q.toLocaleLowerCase('es-ES');
  if(cache[key]&&Date.now()-Number(cache[key].ts)<86400000)return cache[key].value;
  const wait=Math.max(0,1050-(Date.now()-lastRequest));
  if(wait)await sleep(wait);
  lastRequest=Date.now();
  const params=new URLSearchParams({format:'jsonv2',limit:'5',countrycodes:'es','accept-language':'es',addressdetails:'1',q:`${q}, España`});
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  let res;
  try{res=await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`,{headers:{Accept:'application/json'},signal:ctrl.signal})}
  catch(e){clearTimeout(timer);throw new Error(e?.name==='AbortError'?'La búsqueda de la localidad ha tardado demasiado.':'No se ha podido consultar el buscador de localidades.');}
  clearTimeout(timer);
  if(!res.ok)throw new Error(`El buscador de localidades no responde ahora mismo (HTTP ${res.status}).`);
  let rows;
  try{rows=await res.json()}catch(e){throw new Error('El buscador de localidades ha devuelto una respuesta no válida.');}
  if(!Array.isArray(rows)||!rows.length)throw new Error('No encontramos esa ciudad o código postal en España. Prueba con otro nombre.');
  const best=rows.find(x=>['city','town','village','municipality','postcode','administrative'].includes(x.type))||rows[0];
  const lat=Number(best.lat),lon=Number(best.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('No hemos podido obtener coordenadas válidas para esa localidad.');
  const value={lat,lon,label:cleanLabel(best.display_name)||q,source:'manual'};
  cache[key]={ts:Date.now(),value};writeCache(cache);
  return value;
}
window.CosteCocheGeo={resolve};
})();
