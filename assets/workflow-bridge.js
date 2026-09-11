(()=>{
'use strict';
const ROOT='/calculadora-coche/';
const $=(s,r=document)=>r.querySelector(s);
const num=id=>{const v=parseFloat(document.getElementById(id)?.value);return Number.isFinite(v)?v:null};
function targetUrl(file,values){
  const state={v:1,path:ROOT+file,x:Object.entries(values).filter(([,v])=>v!==null&&v!==undefined&&Number.isFinite(Number(v))).map(([id,v])=>[`#${id}`,String(v),'number',0])};
  const url=new URL(ROOT+file,location.origin);url.searchParams.set('calc',JSON.stringify(state));return url.href;
}
function addLink(result,key,text,href){
  if(!result||result.querySelector(`[data-cc-transfer="${key}"]`))return;
  let wrap=result.querySelector('.cc-transfer-actions');
  if(!wrap){wrap=document.createElement('div');wrap.className='cc-transfer-actions';result.appendChild(wrap)}
  const a=document.createElement('a');a.dataset.ccTransfer=key;a.className='cc-transfer-link';a.textContent=text;a.href=href;a.addEventListener('click',()=>window.CosteCocheAnalytics?.track?.('calculator_transfer',{target:fileName(href),flow:key}));wrap.appendChild(a);
}
const fileName=href=>{try{return new URL(href,location.href).pathname.split('/').pop()||'index.html'}catch{return''}};
function refresh(){
  const path=location.pathname.split('/').pop()||'index.html';
  if(path==='calculadora-kilometros-anuales-coche.html'){
    const d=num('daily'),days=num('days'),weeks=num('weeks'),extra=num('extra');if([d,days,weeks,extra].some(v=>v===null))return;
    const annual=d*days*weeks+extra;if(!(annual>=0))return;
    const result=document.getElementById('annual')?.closest('.result');
    addLink(result,'annual-to-cost','Usar estos km/año en coste por km',targetUrl('coste-por-kilometro-coche.html',{km:annual}));
    addLink(result,'annual-to-fuel','Usar en gasto mensual de combustible',targetUrl('cuanto-gasto-gasolina-al-mes.html',{km:annual/12}));
    return;
  }
  if(path==='cuanto-gasto-gasolina-al-mes.html'){
    const km=num('km'),cons=num('consumo'),price=num('precio');if([km,cons,price].some(v=>v===null))return;
    const result=document.getElementById('mes')?.closest('.result');
    addLink(result,'fuel-to-cost','Usar estos datos en coste real por km',targetUrl('coste-por-kilometro-coche.html',{km:km*12,cons,price}));
    return;
  }
  if(path==='index.html'||path===''){
    const km=num('fuelKm'),cons=num('fuelCons'),price=num('fuelPrice');if([km,cons,price].some(v=>v===null))return;
    const result=document.getElementById('fuelAnnual')?.closest('.result-card');
    addLink(result,'home-fuel-to-cost','Continuar en coste real por km',targetUrl('coste-por-kilometro-coche.html',{km,cons,price}));
  }
}
function styles(){if(document.getElementById('ccWorkflowStyles'))return;const s=document.createElement('style');s.id='ccWorkflowStyles';s.textContent='.cc-transfer-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.8rem}.cc-transfer-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid rgba(42,109,242,.28);background:rgba(42,109,242,.08);color:#1d4fb0;border-radius:.65rem;padding:.58rem .82rem;font-weight:800}.cc-transfer-link:hover{background:rgba(42,109,242,.14)}';document.head.appendChild(s)}
function init(){styles();refresh();document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;const text=(b.textContent||'')+' '+(b.getAttribute('onclick')||'');if(/calcular|comparar|estimar|calc|compare/i.test(text))setTimeout(refresh,0)},true);document.addEventListener('submit',()=>setTimeout(refresh,0),true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
