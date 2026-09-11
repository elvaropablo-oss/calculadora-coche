(()=>{
'use strict';
function loadFuelPrice(){
  const q=new URLSearchParams(location.search),raw=q.get('price');
  if(!raw)return;
  const input=document.getElementById('precio');
  if(!input)return;
  const price=Number(String(raw).replace(',','.'));
  if(!Number.isFinite(price)||price<=0)return;
  input.value=String(price);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  if(document.querySelector('[data-fuel-price-loaded]'))return;
  const field=input.closest('.field')||input.parentElement;
  if(!field)return;
  const note=document.createElement('div');
  note.dataset.fuelPriceLoaded='';
  note.className='cc-price-loaded-note';
  const fuel=q.get('fuel')==='diesel'?'diésel':'gasolina';
  const type=(q.get('priceType')||'precio').replace(/^./,c=>c.toUpperCase());
  note.textContent=`${type} de ${fuel} cargado desde la tabla de precios: ${price.toLocaleString('es-ES',{minimumFractionDigits:3,maximumFractionDigits:3})} €/L. Completa tus kilómetros y consumo para calcular.`;
  field.appendChild(note);
}
function keepLauncherClear(){
  const launcher=document.querySelector('.cc-project-launcher');
  if(!launcher)return;
  const footer=document.querySelector('footer');
  if(!footer){launcher.style.bottom='1rem';return}
  const overlap=Math.max(0,innerHeight-footer.getBoundingClientRect().top);
  const desired=16+overlap;
  const max=Math.max(16,innerHeight-launcher.offsetHeight-24);
  launcher.style.bottom=`${Math.min(desired,max)}px`;
}
function styles(){if(document.getElementById('ccQualityFixStyles'))return;const s=document.createElement('style');s.id='ccQualityFixStyles';s.textContent=`.cc-price-loaded-note{margin-top:.55rem;padding:.55rem .7rem;border-radius:.65rem;background:#eef4ff;color:#29486f;font-size:.78rem;line-height:1.4}.cc-project-launcher{transition:bottom .16s ease}@media print{.cc-project-launcher{display:none!important}}`;document.head.appendChild(s)}
function init(){styles();loadFuelPrice();keepLauncherClear();addEventListener('scroll',keepLauncherClear,{passive:true});addEventListener('resize',keepLauncherClear);new MutationObserver(keepLauncherClear).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();