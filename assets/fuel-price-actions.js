(()=>{
'use strict';
const TARGET='cuanto-gasto-gasolina-al-mes.html';
const parsePrice=text=>{const value=Number(String(text||'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(value)&&value>0?value:null};
const kindFor=card=>/gas[oó]leo|di[eé]sel/i.test(card.querySelector('h3')?.textContent||'')?'diesel':'gasolina';
const labelFor=stat=>(stat.querySelector('span')?.textContent||'precio').trim().toLowerCase();
function enhanceCard(card){
  card.querySelectorAll('.cc-zone-stat').forEach(stat=>{
    if(stat.querySelector('[data-fuel-price-action]'))return;
    const price=parsePrice(stat.querySelector('strong')?.textContent);
    if(!price)return;
    const label=labelFor(stat);
    const url=new URL(TARGET,location.href);
    url.searchParams.set('price',String(price));
    url.searchParams.set('fuel',kindFor(card));
    url.searchParams.set('priceType',label);
    url.searchParams.set('source','precios-region');
    const link=document.createElement('a');
    link.href=url.href;
    link.dataset.fuelPriceAction='';
    link.className='cc-zone-use-price';
    link.textContent=`Usar ${label}`;
    link.setAttribute('aria-label',`Usar ${label} de ${price.toLocaleString('es-ES',{minimumFractionDigits:3,maximumFractionDigits:3})} euros por litro en la calculadora`);
    link.addEventListener('click',()=>window.CosteCocheAnalytics?.track?.('fuel_price_to_calculator',{fuel:kindFor(card),price_type:label,price}));
    stat.appendChild(link);
  });
}
function enhance(){document.querySelectorAll('.cc-zone-card').forEach(enhanceCard)}
function styles(){if(document.getElementById('ccFuelPriceActionStyles'))return;const s=document.createElement('style');s.id='ccFuelPriceActionStyles';s.textContent=`.cc-zone-stat{display:flex;flex-direction:column;align-items:flex-start;gap:.15rem}.cc-zone-use-price{display:inline-flex;margin-top:.45rem;padding:.32rem .5rem;border:1px solid #b9ccef;border-radius:.55rem;background:#fff;color:#1d4fb0;text-decoration:none;font-size:.7rem;font-weight:800;line-height:1.15}.cc-zone-use-price:hover,.cc-zone-use-price:focus-visible{background:#eaf1ff;border-color:#7fa3e9}.cc-zone-use-price:focus-visible{outline:2px solid #2a6df2;outline-offset:2px}`;document.head.appendChild(s)}
function init(){styles();enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();