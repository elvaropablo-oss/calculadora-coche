(()=>{
  const API='https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProducto/';
  const GEO='https://geoportalgasolineras.es/geoportal-instalaciones/Inicio';
  const PRODUCTS={gasolina:{id:1,name:'Gasolina 95 E5'},diesel:{id:4,name:'Gasóleo A'}};
  const cache=new Map();

  const css=`
  .cc-price-helper{margin-top:8px;padding:11px 12px;border:1px solid #dce4ef;border-radius:14px;background:#f7faff;color:#4f5f73;font-size:.82rem;line-height:1.4}
  .cc-price-helper strong{color:#162033}.cc-price-helper button{margin-top:8px;border:0;border-radius:10px;padding:8px 10px;background:#eaf1ff;color:#1f57c6;font-weight:800;cursor:pointer}.cc-price-helper button:disabled{opacity:.55;cursor:wait}
  .cc-live-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:18px 0}.cc-live-card{background:#fff;border:1px solid #dce4ef;border-radius:20px;padding:18px;box-shadow:0 14px 35px rgba(19,34,61,.06)}
  .cc-live-card h3{margin:0 0 6px}.cc-live-meta{color:#667387;font-size:.84rem}.cc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.cc-stat{background:#f5f8fd;border-radius:12px;padding:10px}.cc-stat span{display:block;color:#667387;font-size:.72rem}.cc-stat strong{font-size:1.05rem}.cc-range{margin-top:10px;color:#667387;font-size:.82rem}.cc-data-note{font-size:.82rem;color:#667387}.cc-data-note a{font-weight:700}
  @media(max-width:700px){.cc-live-grid{grid-template-columns:1fr}.cc-stats{grid-template-columns:1fr 1fr 1fr}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  function n(v){
    if(typeof v==='number') return v;
    return Number(String(v??'').replace(',','.').replace(/[^0-9.]/g,''));
  }
  function fmt(v,d=3){return Number(v).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d})+' €/L'}
  function percentile(sorted,p){
    if(!sorted.length)return NaN;
    const i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);
    return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
  }
  async function load(product){
    if(cache.has(product)) return cache.get(product);
    const promise=(async()=>{
      const cfg=PRODUCTS[product];
      const res=await fetch(API+cfg.id,{headers:{Accept:'application/json'}});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      const rows=Array.isArray(data.ListaEESSPrecio)?data.ListaEESSPrecio:[];
      const values=rows.map(r=>n(r.PrecioProducto)).filter(v=>Number.isFinite(v)&&v>=0.5&&v<=3.5).sort((a,b)=>a-b);
      if(values.length<20) throw new Error('Sin datos suficientes');
      const avg=values.reduce((a,b)=>a+b,0)/values.length;
      return {name:cfg.name,min:values[0],avg,max:values.at(-1),p10:percentile(values,.10),p90:percentile(values,.90),count:values.length,date:data.Fecha||'actualización reciente'};
    })();
    cache.set(product,promise);return promise;
  }

  function classifyLabel(text){
    const s=text.toLowerCase();
    if(/kwh|electric/.test(s)) return 'electric';
    if(/gas[oó]leo|di[eé]sel/.test(s)) return 'diesel';
    if(/gasolina/.test(s)) return 'gasolina';
    if(/combustible|precio.*litro|€\s*\/\s*l|€\/l/.test(s)) return 'gasolina';
    return null;
  }

  function enhanceInputs(){
    document.querySelectorAll('label[for]').forEach(label=>{
      const kind=classifyLabel(label.textContent||'');
      if(!kind) return;
      const input=document.getElementById(label.htmlFor);
      if(!input||input.dataset.ccPriceEnhanced) return;
      input.dataset.ccPriceEnhanced='1';
      const box=document.createElement('div');box.className='cc-price-helper';
      if(kind==='electric'){
        box.innerHTML='<strong>Referencia oficial de España:</strong> el MITECO sitúa el coste comparativo en 2,75 €/100 km para recarga doméstica y 8,37 €/100 km para recarga rápida (actualización 17/06/2026). El precio real por kWh depende de tu tarifa.';
        input.insertAdjacentElement('afterend',box);return;
      }
      box.innerHTML='<span>Cargando precio medio oficial en España…</span><br><button type="button" disabled>Usar media de España</button>';
      input.insertAdjacentElement('afterend',box);
      load(kind).then(s=>{
        box.querySelector('span').innerHTML=`<strong>${s.name}:</strong> media ${fmt(s.avg)} · mínimo ${fmt(s.min)} · máximo ${fmt(s.max)}. <a href="precios-combustible-espana.html">Ver datos</a>`;
        const b=box.querySelector('button');b.disabled=false;b.textContent='Usar media de España: '+fmt(s.avg);b.onclick=()=>{input.value=s.avg.toFixed(3);input.dispatchEvent(new Event('input',{bubbles:true}));};
      }).catch(()=>{
        box.querySelector('span').innerHTML=`No se ha podido cargar ahora el dato en vivo. <a href="${GEO}" target="_blank" rel="noopener">Consultar Geoportal del MITECO</a>`;
        box.querySelector('button').remove();
      });
    });
  }

  function card(kind){
    const cfg=PRODUCTS[kind];
    const el=document.createElement('article');el.className='cc-live-card';el.innerHTML=`<h3>${cfg.name}</h3><div class="cc-live-meta">Cargando datos oficiales…</div>`;
    load(kind).then(s=>{
      el.innerHTML=`<h3>${s.name}</h3><div class="cc-live-meta">${s.count.toLocaleString('es-ES')} estaciones con precio válido · ${s.date}</div><div class="cc-stats"><div class="cc-stat"><span>Mínimo publicado</span><strong>${fmt(s.min)}</strong></div><div class="cc-stat"><span>Media nacional</span><strong>${fmt(s.avg)}</strong></div><div class="cc-stat"><span>Máximo publicado</span><strong>${fmt(s.max)}</strong></div></div><div class="cc-range">Rango central (percentil 10–90): <strong>${fmt(s.p10)} – ${fmt(s.p90)}</strong></div>`;
    }).catch(()=>{el.innerHTML=`<h3>${cfg.name}</h3><p class="cc-live-meta">No se han podido cargar los precios en vivo. <a href="${GEO}" target="_blank" rel="noopener">Abrir Geoportal oficial</a>.</p>`;});
    return el;
  }

  function renderDashboard(){
    document.querySelectorAll('[data-precios-espana-dashboard]').forEach(root=>{
      root.innerHTML='';const grid=document.createElement('div');grid.className='cc-live-grid';grid.append(card('gasolina'),card('diesel'));root.append(grid);
      const p=document.createElement('p');p.className='cc-data-note';p.innerHTML='Fuente: servicio público de precios de carburantes del Ministerio para la Transición Ecológica y el Reto Demográfico. Los valores se calculan en tu navegador a partir de las estaciones que reportan un precio numérico válido. El mínimo y máximo pueden corresponder a casos poco habituales; por eso también mostramos el rango central 10–90.';root.append(p);
    });
  }

  function init(){enhanceInputs();renderDashboard();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();