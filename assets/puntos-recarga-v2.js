(()=>{
'use strict';

const $=s=>document.querySelector(s);
const BASE=new URL('.',document.baseURI);
const MANIFEST_URL=new URL('data/recarga/index.json',BASE).href;
const state={manifest:null,cells:new Map(),map:null,markers:null,userMarker:null};
const IDX={lat:0,lon:1,name:2,address:3,municipality:4,province:5,community:6,operator:7,maxKw:8,connectorCount:9,connectors:10,chargeTypes:11,access:12,payments:13,schedule:14,modified:15};

function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function setStatus(msg,type=''){const el=$('#chargeStatus');if(el){el.textContent=msg;el.dataset.type=type}}
function distanceKm(lat1,lon1,lat2,lon2){const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180,a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function fmtKw(v){return Number.isFinite(v)&&v>0?`${v.toLocaleString('es-ES',{maximumFractionDigits:1})} kW`:'Potencia no indicada'}
function friendlyConnector(x){const s=String(x||'').toUpperCase();if(s.includes('T2_COMBO')||s.includes('COMBO_2')||s.includes('CCS'))return 'CCS Combo 2';if(s.includes('CHADEMO'))return 'CHAdeMO';if(s.includes('62196_T2')||s==='TYPE_2'||s.includes('TIPO_2'))return 'Tipo 2';if(s.includes('62196_T1')||s==='TYPE_1'||s.includes('TIPO_1'))return 'Tipo 1';if(s.includes('SCHUKO'))return 'Schuko';return String(x||'').replaceAll('_',' ')}
function connectorList(row){return [...new Set((Array.isArray(row[IDX.connectors])?row[IDX.connectors]:[]).map(friendlyConnector).filter(Boolean))]}
function badge(kw){if(!(kw>0))return '';if(kw>=150)return '<span class="charge-badge ultra">Ultrarrápida</span>';if(kw>=50)return '<span class="charge-badge fast">Rápida</span>';if(kw>=22)return '<span class="charge-badge">Semirrápida</span>';return '<span class="charge-badge slow">Normal</span>'}

function getLocation(){return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('Tu navegador no admite geolocalización.'));return}
  navigator.geolocation.getCurrentPosition(
    p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy}),
    e=>{const m=e.code===1?'Has denegado el permiso de ubicación. Actívalo y vuelve a intentarlo.':e.code===2?'No se ha podido determinar tu ubicación.':'La ubicación ha tardado demasiado en responder.';reject(new Error(m))},
    {enableHighAccuracy:false,timeout:15000,maximumAge:300000}
  );
})}

async function fetchJson(url,label){
  let r;
  try{r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}})}catch(e){throw new Error(`No se ha podido descargar ${label}.`)}
  if(!r.ok)throw new Error(`${label} no está disponible ahora mismo (HTTP ${r.status}).`);
  try{return await r.json()}catch(e){throw new Error(`${label} ha llegado con un formato no válido.`)}
}

async function loadManifest(){
  if(state.manifest)return state.manifest;
  const d=await fetchJson(MANIFEST_URL,'el índice de puntos de recarga');
  if(!d||!d.cells||!Number(d.total_points))throw new Error('No se ha podido validar el registro oficial de puntos de recarga.');
  state.manifest=d;
  return d;
}

function neededCells(lat,lon,radius,manifest){
  const latDelta=radius/110.6+.04;
  const cos=Math.max(.2,Math.cos(lat*Math.PI/180));
  const lonDelta=radius/(111.32*cos)+.04;
  const keys=[];
  for(let la=Math.floor(lat-latDelta);la<=Math.floor(lat+latDelta);la++){
    for(let lo=Math.floor(lon-lonDelta);lo<=Math.floor(lon+lonDelta);lo++){
      const key=`${la}_${lo}`;
      if(manifest.cells[key])keys.push(key);
    }
  }
  return keys;
}

async function loadCell(key,manifest){
  if(state.cells.has(key))return state.cells.get(key);
  const meta=manifest.cells[key];
  if(!meta)return [];
  const url=new URL(`data/recarga/${meta.file}`,BASE).href;
  const promise=fetchJson(url,`la zona ${key}`);
  state.cells.set(key,promise);
  try{return await promise}catch(e){state.cells.delete(key);throw e}
}

async function loadNearbyRows(user,radius){
  const manifest=await loadManifest();
  const keys=neededCells(user.lat,user.lon,radius,manifest);
  if(!keys.length)return {manifest,rows:[],failed:0};
  const settled=await Promise.allSettled(keys.map(k=>loadCell(k,manifest)));
  const rows=[];let failed=0;
  for(const part of settled){if(part.status==='fulfilled'&&Array.isArray(part.value))rows.push(...part.value);else failed++}
  if(!rows.length&&failed)throw new Error('No se han podido cargar los datos de tu zona. Vuelve a intentarlo en unos segundos.');
  return {manifest,rows,failed};
}

function matchesConnector(row,wanted){
  if(wanted==='all')return true;
  const raw=(Array.isArray(row[IDX.connectors])?row[IDX.connectors]:[]).join(' ').toUpperCase();
  if(wanted==='ccs')return raw.includes('T2_COMBO')||raw.includes('COMBO_2')||raw.includes('CCS');
  if(wanted==='type2')return (raw.includes('62196_T2')&&!raw.includes('T2_COMBO'))||raw.includes('TYPE_2')||raw.includes('TIPO_2');
  if(wanted==='chademo')return raw.includes('CHADEMO');
  return true;
}

function dedupe(items){
  const seen=new Set();
  return items.filter(x=>{const r=x.row,key=[Number(r[IDX.lat]).toFixed(5),Number(r[IDX.lon]).toFixed(5),String(r[IDX.name]||''),String(r[IDX.operator]||'')].join('|');if(seen.has(key))return false;seen.add(key);return true});
}

function renderResults(items,manifest,failed){
  const root=$('#chargeResults'),count=$('#chargeCount'),summary=$('#chargeSummary');
  if(!root)return;
  const when=manifest.synced_at?new Date(manifest.synced_at).toLocaleString('es-ES'):'fecha no disponible';
  if(count)count.textContent=`${items.length} resultado${items.length===1?'':'s'} mostrado${items.length===1?'':'s'} · datos ${when}`;
  if(!items.length){if(summary)summary.textContent='';root.innerHTML='<div class="charge-empty"><strong>No encontramos puntos que cumplan esos filtros.</strong><span>Prueba aumentando el radio o reduciendo la potencia mínima.</span></div>';return}
  const fast=items.filter(x=>x.kw>=50).length;
  if(summary)summary.innerHTML=`Hay <strong>${fast}</strong> punto${fast===1?'':'s'} de 50 kW o más entre los resultados mostrados.${failed?' Algunas zonas cercanas no pudieron cargarse y se han omitido.':''}`;
  root.innerHTML=items.map((x,i)=>{
    const r=x.row,kw=x.kw,connectors=connectorList(r),addr=[r[IDX.address],r[IDX.municipality],r[IDX.province]].filter(Boolean).join(' · '),op=r[IDX.operator]||'Operador no indicado';
    return `<article class="charge-result ${i===0?'is-nearest':''}"><div class="charge-rank">${i+1}</div><div class="charge-result-main"><div class="charge-result-title">${esc(r[IDX.name]||'Punto de recarga')} ${badge(kw)}</div><div class="charge-result-address">${esc(addr||'Dirección no disponible')}</div><div class="charge-result-meta">${esc(op)} · ${esc(connectors.length?`Conectores: ${connectors.slice(0,4).join(', ')}`:'Conector no indicado')}</div></div><div class="charge-result-side"><strong>${fmtKw(kw)}</strong><span>${x.distance.toLocaleString('es-ES',{maximumFractionDigits:1})} km</span><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r[IDX.lat]+','+r[IDX.lon])}" target="_blank" rel="noopener">Cómo llegar ↗</a></div></article>`;
  }).join('');
}

async function loadLeaflet(){
  if(window.L)return;
  await new Promise((resolve,reject)=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.crossOrigin='anonymous';document.head.appendChild(css);
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error('No se ha podido cargar el mapa interactivo.'));document.head.appendChild(s);
  });
}

async function renderMap(user,items){
  const box=$('#chargeMap');if(!box)return;
  try{
    await loadLeaflet();
    if(!state.map){state.map=L.map(box,{scrollWheelZoom:false}).setView([user.lat,user.lon],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(state.map);state.markers=L.layerGroup().addTo(state.map)}
    else{state.markers.clearLayers();if(state.userMarker)state.map.removeLayer(state.userMarker)}
    state.userMarker=L.circleMarker([user.lat,user.lon],{radius:8,weight:3,fillOpacity:.9}).addTo(state.map).bindPopup('Tu ubicación aproximada');
    const bounds=[[user.lat,user.lon]];
    items.slice(0,30).forEach(x=>{const r=x.row;L.marker([Number(r[IDX.lat]),Number(r[IDX.lon])]).bindPopup(`<strong>${esc(r[IDX.name]||'Punto de recarga')}</strong><br>${fmtKw(x.kw)} · ${x.distance.toLocaleString('es-ES',{maximumFractionDigits:1})} km`).addTo(state.markers);bounds.push([Number(r[IDX.lat]),Number(r[IDX.lon])])});
    if(bounds.length>1)state.map.fitBounds(bounds,{padding:[28,28],maxZoom:13});else state.map.setView([user.lat,user.lon],12);
    setTimeout(()=>state.map.invalidateSize(),80);
  }catch(e){box.innerHTML=`<div class="charge-map-error"><strong>Mapa no disponible.</strong><span>${esc(e.message)}</span></div>`}
}

async function search(){
  const btn=$('#chargeSearch');if(!btn)return;
  const radius=Number($('#chargeRadius')?.value||20),minKw=Number($('#chargePower')?.value||0),connector=$('#chargeConnector')?.value||'all',sort=$('#chargeSort')?.value||'distance';
  btn.disabled=true;btn.textContent='Buscando…';
  setStatus('Solicitando tu ubicación al navegador…');
  if($('#chargeResults'))$('#chargeResults').innerHTML='<div class="charge-loading">Cargando puntos oficiales cercanos…</div>';
  if($('#chargeCount'))$('#chargeCount').textContent='';if($('#chargeSummary'))$('#chargeSummary').textContent='';
  try{
    const user=await getLocation();
    setStatus('Ubicación recibida. Cargando puntos de recarga…','ok');
    const {manifest,rows,failed}=await loadNearbyRows(user,radius);
    let items=rows.map(row=>({row,kw:Number(row[IDX.maxKw])||0,distance:distanceKm(user.lat,user.lon,Number(row[IDX.lat]),Number(row[IDX.lon]))})).filter(x=>Number.isFinite(x.distance)&&x.distance<=radius&&x.kw>=minKw&&matchesConnector(x.row,connector));
    items=dedupe(items);
    items.sort(sort==='power'?(a,b)=>(b.kw||0)-(a.kw||0)||a.distance-b.distance:(a,b)=>a.distance-b.distance||(b.kw||0)-(a.kw||0));
    const shown=items.slice(0,30);
    renderResults(shown,manifest,failed);
    setStatus(`Encontrados ${items.length} puntos dentro de ${radius} km. Mostramos hasta 30.`,'ok');
    renderMap(user,shown);
    window.CosteCocheAnalytics?.track?.('charging_points_search',{radius_km:radius,min_power_kw:minKw,connector,sort,results_bucket:items.length===0?'0':items.length<6?'1-5':items.length<16?'6-15':items.length<31?'16-30':'31+'});
  }catch(e){
    setStatus(e.message||'No se ha podido completar la búsqueda.','error');
    if($('#chargeResults'))$('#chargeResults').innerHTML=`<div class="charge-empty"><strong>No hemos podido completar la búsqueda.</strong><span>${esc(e.message||'Vuelve a intentarlo.')}</span></div>`;
  }finally{btn.disabled=false;btn.textContent='Buscar puntos de carga cerca de mí'}
}

async function init(){
  const btn=$('#chargeSearch');
  if(btn)btn.addEventListener('click',search);
  try{
    const m=await loadManifest();
    const d=m.synced_at?new Date(m.synced_at).toLocaleDateString('es-ES'):'fecha no disponible';
    const info=$('#chargeDataInfo');if(info)info.innerHTML=`Registro preparado con <strong>${Number(m.total_points).toLocaleString('es-ES')}</strong> puntos de recarga · actualización <strong>${d}</strong>.`;
    setStatus(`Buscador listo · ${Number(m.total_points).toLocaleString('es-ES')} puntos disponibles.`,'ok');
    window.__CosteCocheChargeReady=true;
  }catch(e){
    const info=$('#chargeDataInfo');if(info)info.textContent=e.message||'No se ha podido cargar el registro.';
    setStatus(e.message||'No se ha podido cargar el registro.','error');
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
