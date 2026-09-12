(()=>{
  'use strict';

  const GA_ID='G-EZJ4866V6M';
  const CONSENT_KEY='costecoche_consent_v3';
  const LEGACY_KEY='costecoche_privacy_v2';
  const LEGACY_OLD_KEY='costecoche_analytics_choice_v1';
  const CONSENT_VERSION=3;
  const MAX_AGE_MS=365*24*60*60*1000;
  const GA_DISABLED='ga-disable-'+GA_ID;
  let state=null;
  let settingsOpenedFromSavedChoice=false;
  let lastTracked={key:'',at:0};

  function safeParse(raw){
    try{return JSON.parse(raw)}catch{return null}
  }

  function readState(){
    const raw=localStorage.getItem(CONSENT_KEY);
    if(raw){
      const parsed=safeParse(raw);
      if(parsed&&parsed.version===CONSENT_VERSION&&typeof parsed.analytics==='boolean'&&Number.isFinite(parsed.updatedAt)){
        if(Date.now()-parsed.updatedAt<=MAX_AGE_MS) return parsed;
      }
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(LEGACY_KEY);
    }

    const legacy=localStorage.getItem(LEGACY_KEY)||localStorage.getItem(LEGACY_OLD_KEY);
    if(legacy==='accepted'||legacy==='rejected'){
      const migrated={version:CONSENT_VERSION,necessary:true,analytics:legacy==='accepted',updatedAt:Date.now()};
      localStorage.setItem(CONSENT_KEY,JSON.stringify(migrated));
      localStorage.setItem(LEGACY_KEY,migrated.analytics?'accepted':'rejected');
      localStorage.removeItem(LEGACY_OLD_KEY);
      return migrated;
    }
    return null;
  }

  function syncLegacy(analytics){
    localStorage.setItem(LEGACY_KEY,analytics?'accepted':'rejected');
    localStorage.removeItem(LEGACY_OLD_KEY);
  }

  function clearAnalyticsCookies(){
    const names=document.cookie.split(';').map(v=>v.split('=')[0].trim()).filter(n=>n==='_ga'||n.startsWith('_ga_'));
    const host=location.hostname;
    const domains=[host,'.'+host];
    for(const name of names){
      document.cookie=`${name}=; Max-Age=0; path=/; SameSite=Lax`;
      for(const domain of domains) document.cookie=`${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
    }
  }

  function ensureGtag(){
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  }

  function setConsentSignal(granted){
    window[GA_DISABLED]=!granted;
    if(typeof window.gtag==='function'){
      window.gtag('consent','update',{
        analytics_storage:granted?'granted':'denied',
        ad_storage:'denied',
        ad_user_data:'denied',
        ad_personalization:'denied'
      });
    }
    if(!granted) clearAnalyticsCookies();
  }

  function loadAnalytics(){
    if(!state?.analytics) return;
    setConsentSignal(true);
    if(window.__ccConsentGaLoaded) return;

    const alreadyLoaded=Boolean(window.__ccConsentGaLoaded||window.__ccAnalyticsLoaded||window.__costecocheGaLoaded||window.__ga);
    ensureGtag();
    window.gtag('consent','default',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });

    window.__ccConsentGaLoaded=true;
    window.__ccAnalyticsLoaded=true;
    window.__costecocheGaLoaded=true;
    window.__ga=1;

    window.gtag('js',new Date());
    window.gtag('config',GA_ID,{
      anonymize_ip:true,
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });

    if(!alreadyLoaded&&!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)){
      const script=document.createElement('script');
      script.async=true;
      script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);
      document.head.appendChild(script);
    }
  }

  function applyState(){
    const granted=Boolean(state?.analytics);
    window[GA_DISABLED]=!granted;
    if(granted) loadAnalytics();
    else setConsentSignal(false);
  }

  function saveState(analytics){
    state={version:CONSENT_VERSION,necessary:true,analytics:Boolean(analytics),updatedAt:Date.now()};
    localStorage.setItem(CONSENT_KEY,JSON.stringify(state));
    syncLegacy(state.analytics);
    applyState();
    if(state.analytics) track('consent_update',{analytics_storage:'granted'});
    closeConsent();
  }

  function labelFor(el){
    const scope=el.closest('details,.tool,.card,.calculator,section,main')||document.body;
    const candidate=scope.querySelector('.tool-title,h1,h2,h3');
    return (candidate?.textContent||document.title||'Calculadora').replace(/\s+/g,' ').trim().slice(0,90);
  }

  function cleanPath(href){
    try{
      const u=new URL(href,location.href);
      return u.origin===location.origin?u.pathname.slice(0,160):'';
    }catch{return ''}
  }

  function track(name,params={}){
    if(!state?.analytics||typeof window.gtag!=='function') return;
    const safe={page_path:location.pathname,...params};
    Object.keys(safe).forEach(k=>{
      if(typeof safe[k]==='string') safe[k]=safe[k].replace(/\s+/g,' ').trim().slice(0,100);
    });
    window.gtag('event',name,safe);
  }

  function trackOnce(name,key,params){
    const now=Date.now(),full=name+'|'+key;
    if(lastTracked.key===full&&now-lastTracked.at<700) return;
    lastTracked={key:full,at:now};
    track(name,params);
  }

  function buildUi(){
    if(document.getElementById('ccConsentRoot')) return;
    const root=document.createElement('div');
    root.id='ccConsentRoot';
    root.className='cc-consent-root';
    root.dataset.open='0';
    root.dataset.settings='0';
    root.innerHTML=`
      <div class="cc-consent-backdrop" data-cc-backdrop></div>
      <section class="cc-consent-panel" role="dialog" aria-labelledby="ccConsentTitle" aria-describedby="ccConsentText">
        <div class="cc-consent-kicker">Privacidad</div>
        <h2 class="cc-consent-title" id="ccConsentTitle">Tus preferencias de privacidad</h2>
        <p class="cc-consent-text" id="ccConsentText">CosteCoche usa almacenamiento necesario para recordar tus preferencias. Google Analytics es opcional y solo se activa si lo aceptas. Puedes usar todas las calculadoras aunque lo rechaces. <a href="cookies.html">Más información</a>.</p>
        <div class="cc-consent-actions cc-consent-summary-actions">
          <button class="cc-consent-btn cc-consent-btn-primary" type="button" data-cc-accept>Aceptar todas</button>
          <button class="cc-consent-btn" type="button" data-cc-reject>Rechazar no necesarias</button>
          <button class="cc-consent-btn cc-consent-btn-link" type="button" data-cc-configure>Configurar</button>
        </div>
        <div class="cc-consent-settings" aria-label="Configurar preferencias">
          <div class="cc-consent-row">
            <div><h3>Necesarias</h3><p>Permiten recordar tu elección de privacidad y mantener funciones básicas del sitio.</p><span class="cc-consent-status">Siempre activas</span></div>
            <label class="cc-consent-toggle" aria-label="Cookies necesarias siempre activas"><input type="checkbox" checked disabled><span class="cc-consent-switch"></span></label>
          </div>
          <div class="cc-consent-row">
            <div><h3>Analítica</h3><p>Google Analytics nos ayuda a saber qué páginas y calculadoras se usan. No enviamos a Analytics los números que introduces en las calculadoras.</p></div>
            <label class="cc-consent-toggle" aria-label="Permitir analítica"><input id="ccAnalyticsToggle" type="checkbox"><span class="cc-consent-switch"></span></label>
          </div>
          <div class="cc-consent-row">
            <div><h3>Publicidad</h3><p>CosteCoche no utiliza actualmente cookies publicitarias. Si se incorporan anuncios, esta configuración deberá ampliarse antes de activarlos.</p><span class="cc-consent-status">No utilizada</span></div>
          </div>
          <div class="cc-consent-settings-actions">
            <button class="cc-consent-btn cc-consent-btn-primary" type="button" data-cc-save>Guardar preferencias</button>
            <button class="cc-consent-btn" type="button" data-cc-reject>Rechazar no necesarias</button>
            <button class="cc-consent-btn cc-consent-btn-link" type="button" data-cc-back>Volver</button>
          </div>
          <p class="cc-consent-footnote">Puedes cambiar esta decisión en cualquier momento desde “Preferencias de privacidad” en el pie de página.</p>
        </div>
      </section>`;
    document.body.appendChild(root);

    root.querySelector('[data-cc-accept]').addEventListener('click',()=>saveState(true));
    root.querySelectorAll('[data-cc-reject]').forEach(b=>b.addEventListener('click',()=>saveState(false)));
    root.querySelector('[data-cc-configure]').addEventListener('click',()=>openSettings(false));
    root.querySelector('[data-cc-save]').addEventListener('click',()=>saveState(root.querySelector('#ccAnalyticsToggle').checked));
    root.querySelector('[data-cc-back]').addEventListener('click',()=>backFromSettings());
    root.querySelector('[data-cc-backdrop]').addEventListener('click',()=>backFromSettings());
  }

  function openSummary(){
    buildUi();
    const root=document.getElementById('ccConsentRoot');
    root.dataset.settings='0';
    root.dataset.open='1';
    requestAnimationFrame(()=>root.querySelector('[data-cc-accept]')?.focus());
  }

  function openSettings(fromSavedChoice=true){
    buildUi();
    const root=document.getElementById('ccConsentRoot');
    settingsOpenedFromSavedChoice=Boolean(fromSavedChoice&&state);
    root.querySelector('#ccAnalyticsToggle').checked=Boolean(state?.analytics);
    root.dataset.settings='1';
    root.dataset.open='1';
    requestAnimationFrame(()=>root.querySelector('#ccAnalyticsToggle')?.focus());
  }

  function backFromSettings(){
    if(settingsOpenedFromSavedChoice&&state) closeConsent();
    else openSummary();
  }

  function closeConsent(){
    const root=document.getElementById('ccConsentRoot');
    if(!root) return;
    root.dataset.open='0';
    root.dataset.settings='0';
  }

  function bindPrivacyLinks(){
    document.addEventListener('click',event=>{
      const trigger=event.target.closest?.('[data-privacy-settings]');
      if(!trigger) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openSettings(true);
    },true);
  }

  function bindAnalyticsEvents(){
    document.addEventListener('submit',event=>{
      const form=event.target.closest?.('form');
      if(!form) return;
      trackOnce('calculator_calculate',labelFor(form),{calculator:labelFor(form),method:'form_submit'});
    },true);

    document.addEventListener('click',event=>{
      const target=event.target.closest?.('button,a');
      if(!target||target.closest('#ccConsentRoot')||target.matches('[data-privacy-settings]')) return;

      if(target.tagName==='BUTTON'&&target.closest('.cc-price-helper')&&/usar media de españa/i.test(target.textContent||'')){
        trackOnce('reference_price_used',labelFor(target),{calculator:labelFor(target),reference:'spain_average_fuel'});
        return;
      }

      if(target.tagName==='BUTTON'){
        const type=(target.getAttribute('type')||'submit').toLowerCase();
        if(target.form&&type==='submit') return;
        const text=(target.textContent||'').trim();
        const onclick=target.getAttribute('onclick')||'';
        if(/calcular|comparar|estimar|simular|comprobar/i.test(text)||/calc|calculate|compare/i.test(onclick)){
          trackOnce('calculator_calculate',labelFor(target),{calculator:labelFor(target),method:'button'});
          return;
        }
      }

      if(target.tagName==='A'&&(target.closest('.seo-card')||target.closest('.related')||target.closest('.footer-links')||target.closest('.foot-links'))){
        const destination=cleanPath(target.href);
        if(destination) track('internal_navigation',{destination,component:target.closest('.seo-card')?'seo_card':target.closest('.related')?'related':'footer'});
      }
    },true);
  }

  function init(){
    state=readState();
    applyState();
    buildUi();
    bindPrivacyLinks();
    bindAnalyticsEvents();
    window.CosteCocheAnalytics={track,refreshConsent:()=>{state=readState();applyState()},hasAnalyticsConsent:()=>Boolean(state?.analytics),openPrivacySettings:()=>openSettings(true)};
    if(!state) openSummary();
  }

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    const root=document.getElementById('ccConsentRoot');
    if(root?.dataset.open!=='1') return;
    if(root.dataset.settings==='1') backFromSettings();
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
(()=>{if(document.querySelector('script[src*="product-parity.js"]'))return;const s=document.createElement('script');s.src='assets/product-parity.js?v=20260911-1';s.defer=true;document.head.appendChild(s)})();
(()=>{if(document.querySelector('script[src*="workflow-bridge.js"]'))return;const s=document.createElement('script');s.src='assets/workflow-bridge.js?v=20260911-1';s.defer=true;document.head.appendChild(s)})();
