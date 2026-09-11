import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sites = [
  { key:'costecoche', name:'CosteCoche', base:'https://elvaropablo-oss.github.io/calculadora-coche/', tool:'cuanto-gasto-gasolina-al-mes.html' },
  { key:'material', name:'CuántoMaterial', base:'https://elvaropablo-oss.github.io/cuanto-material/', tool:'reforma-habitacion.html' },
  { key:'horno', name:'HornoExacto', base:'https://elvaropablo-oss.github.io/horno-exacto/', tool:'escalar-receta/' },
  { key:'teje', name:'TejeConMedida', base:'https://elvaropablo-oss.github.io/teje-con-medida/', tool:'calcular-muestra/' },
  { key:'imprime', name:'ImprimeMedido', base:'https://elvaropablo-oss.github.io/imprime-medido/', tool:'crear-etiquetas/' },
  { key:'escala', name:'EscalaClara', base:'https://elvaropablo-oss.github.io/escala-clara/', tool:'hallar-escala/' },
  { key:'cuelga', name:'CuelgaMedido', base:'https://elvaropablo-oss.github.io/cuelga-medido/', tool:'cuadricula-cuadros/' },
  { key:'estante', name:'EstanteMedido', base:'https://elvaropablo-oss.github.io/estante-medido/', tool:'lista-corte-estanteria/' },
  { key:'embala', name:'EmbalaExacto', base:'https://elvaropablo-oss.github.io/embala-exacto/', tool:'caja-minima/' },
  { key:'tierra', name:'TierraExacta', base:'https://elvaropablo-oss.github.io/tierra-exacta/', tool:'litros-maceta/' }
];

const projectKeys = {
  horno:'he:v1:projects', teje:'tcm:v1:projects', imprime:'im:v1:projects', escala:'ec:v1:projects',
  cuelga:'cm:v1:projects', estante:'em:v1:projects', embala:'ee:v1:projects', tierra:'te:v1:projects'
};

function monitor(page) {
  const pageErrors=[];
  const consoleErrors=[];
  const badLocalResponses=[];
  page.on('pageerror', error=>pageErrors.push(error.message));
  page.on('console', message=>{
    if(message.type()!=='error')return;
    const text=message.text();
    if(/google(tagmanager|analytics)|ERR_BLOCKED_BY_CLIENT|favicon/i.test(text))return;
    consoleErrors.push(text);
  });
  page.on('response', response=>{
    if(response.status()<400)return;
    try {
      const url=new URL(response.url());
      if(url.hostname==='elvaropablo-oss.github.io')badLocalResponses.push(`${response.status()} ${url.pathname}`);
    } catch {}
  });
  return { pageErrors, consoleErrors, badLocalResponses };
}

async function settledGoto(page,url){
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForLoadState('networkidle',{timeout:7000}).catch(()=>{});
  await page.waitForTimeout(250);
  return response;
}

async function fillEmptyNumbers(form){
  const inputs=form.locator('input[type="number"]');
  for(let i=0;i<await inputs.count();i++){
    const input=inputs.nth(i);
    if(!(await input.isVisible())||await input.isDisabled())continue;
    const value=await input.inputValue();
    if(value.trim())continue;
    const min=Number(await input.getAttribute('min'));
    const candidate=Number.isFinite(min)?Math.max(min+(min===0?1:0),1):10;
    await input.fill(String(candidate));
  }
}

async function assertNoOverflow(page,label){
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(overflow.scroll,`${label}: overflow horizontal ${overflow.scroll}-${overflow.client}px`).toBeLessThanOrEqual(overflow.client+3);
}

async function attachScreenshot(page,testInfo,name){
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach(name,{body:shot,contentType:'image/png'});
}

for(const site of sites){
  test.describe(site.name,()=>{
    test('portada: carga, responsive, consola y accesibilidad',async({page},testInfo)=>{
      const errors=monitor(page);
      const response=await settledGoto(page,site.base);
      expect(response?.status()||0).toBeLessThan(400);
      await expect(page.locator('h1').first()).toBeVisible();
      await assertNoOverflow(page,site.name);
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      const serious=axe.violations.filter(v=>['critical','serious'].includes(v.impact));
      expect(serious,`${site.name}: ${serious.map(v=>`${v.id} (${v.nodes.length})`).join(', ')}`).toEqual([]);
      expect(errors.pageErrors,`${site.name}: pageerror`).toEqual([]);
      expect(errors.consoleErrors,`${site.name}: console.error`).toEqual([]);
      expect(errors.badLocalResponses,`${site.name}: recursos locales >=400`).toEqual([]);
      await attachScreenshot(page,testInfo,`${site.key}-${testInfo.project.name}-home`);
    });

    test('herramienta principal: carga sin errores ni overflow',async({page},testInfo)=>{
      const errors=monitor(page);
      const response=await settledGoto(page,new URL(site.tool,site.base).href);
      expect(response?.status()||0).toBeLessThan(400);
      await expect(page.locator('h1').first()).toBeVisible();
      await assertNoOverflow(page,`${site.name} herramienta`);
      expect(errors.pageErrors,`${site.name}: pageerror en herramienta`).toEqual([]);
      expect(errors.badLocalResponses,`${site.name}: recursos locales >=400`).toEqual([]);
      await attachScreenshot(page,testInfo,`${site.key}-${testInfo.project.name}-tool`);
    });
  });
}

test.describe('Regresiones y flujos críticos',()=>{
  test('CosteCoche calcula, copia, guarda y restaura estado',async({page,context},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://elvaropablo-oss.github.io'});
    const errors=monitor(page);
    await settledGoto(page,sites[0].base+'cuanto-gasto-gasolina-al-mes.html?price=1.649&fuel=gasolina&priceType=media&source=precios-region');
    await expect(page.locator('#precio')).toHaveValue('1.649');
    await page.locator('#km').fill('1250');
    await page.locator('#consumo').fill('6.2');
    await page.getByRole('button',{name:'Calcular',exact:true}).click();
    await expect(page.locator('#mes')).toContainText('€');
    await expect(page.getByRole('button',{name:'Copiar resultado'})).toBeVisible();
    await page.getByRole('button',{name:'Copiar resultado'}).click();
    page.once('dialog',dialog=>dialog.accept('QA CosteCoche'));
    await page.getByRole('button',{name:'Guardar en mis cálculos'}).click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('costecoche:v1:projects')||'[]').length);
    expect(saved).toBeGreaterThan(0);
    expect(errors.pageErrors).toEqual([]);
  });

  test('CuántoMaterial plano en L no produce excepción',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    const errors=monitor(page);
    await settledGoto(page,sites[1].base+'reforma-habitacion.html');
    const preset=page.locator('#fpPresetL');
    await expect(preset).toBeVisible();
    await preset.click();
    await expect(page.locator('#fpArea')).not.toHaveText('—');
    expect(errors.pageErrors).toEqual([]);
  });

  test('TejeConMedida mantiene el hero dentro del viewport móvil',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='mobile');
    for(const path of ['calcular-muestra/','puntos-y-vueltas/']){
      await settledGoto(page,sites[3].base+path);
      await assertNoOverflow(page,`Teje ${path}`);
      const box=await page.locator('h1').boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x+box.width).toBeLessThanOrEqual(391);
      const after=await page.locator('.hero').evaluate(el=>{const s=getComputedStyle(el,'::after');return{width:parseFloat(s.width),transform:s.transform};});
      expect(after.width).toBeLessThanOrEqual(358);
      expect(after.transform).toBe('none');
    }
  });

  test('ImprimeMedido no lanza SyntaxError en páginas afectadas',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    for(const path of ['','crear-etiquetas/','imprimir-medida-exacta/']){
      const errors=monitor(page);
      await settledGoto(page,sites[4].base+path);
      expect(errors.pageErrors,`ImprimeMedido ${path||'home'}`).toEqual([]);
    }
  });

  for(const site of sites.filter(s=>projectKeys[s.key])){
    test(`${site.name}: cálculo compartible, acciones y proyecto`,async({page,context},testInfo)=>{
      test.skip(testInfo.project.name!=='desktop');
      await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://elvaropablo-oss.github.io'});
      await page.addInitScript(()=>{window.print=()=>{window.__qaPrintCalled=true;};});
      const errors=monitor(page);
      await settledGoto(page,new URL(site.tool,site.base).href);
      const form=page.locator('form').first();
      await expect(form).toBeVisible();
      await fillEmptyNumbers(form);
      await form.evaluate(el=>el.requestSubmit());
      await page.waitForTimeout(250);
      const actions=page.locator('.result-standard-actions');
      await expect(actions).toBeVisible();
      expect(new URL(page.url()).searchParams.has('calc')).toBeTruthy();
      await actions.getByRole('button',{name:'Copiar resultado'}).click();
      await actions.getByRole('button',{name:'Copiar enlace'}).click();
      await actions.getByRole('button',{name:'Imprimir / PDF'}).click();
      expect(await page.evaluate(()=>window.__qaPrintCalled===true)).toBeTruthy();
      const save=actions.locator('[data-save-project]');
      if(await save.count()){
        page.once('dialog',dialog=>dialog.accept('QA proyecto'));
        await save.click();
        const key=projectKeys[site.key];
        expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'[]').length,key)).toBeGreaterThan(0);
      }
      const shared=page.url();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForTimeout(300);
      expect(page.url()).toBe(shared);
      expect(errors.pageErrors,`${site.name}: errores durante acciones/restauración`).toEqual([]);
    });
  }

  test('EscalaClara mantiene decoración horizontal',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    await settledGoto(page,sites[5].base);
    const style=await page.locator('.hero').evaluate(el=>{const s=getComputedStyle(el,'::after');return{writingMode:s.writingMode,transform:s.transform};});
    expect(style.writingMode).toBe('horizontal-tb');
    expect(style.transform).toBe('none');
  });

  test('CuelgaMedido no muestra suelo en la previsualización',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    await settledGoto(page,sites[6].base+'cuadricula-cuadros/');
    const preview=page.locator('#wall-preview');
    if(await preview.count())expect((await preview.textContent())||'').not.toMatch(/suelo/i);
  });

  test('EmbalaExacto usa regla de sección completa en escritorio',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    await settledGoto(page,sites[8].base);
    const section=page.locator('.section.prose').first();
    if(await section.count()){
      const width=await section.evaluate(el=>el.getBoundingClientRect().width);
      expect(width).toBeGreaterThan(800);
    }
  });

  test('preferencias de analítica visibles y coherentes',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    for(const site of sites){
      await settledGoto(page,site.base);
      const accept=page.getByRole('button',{name:/Aceptar (analítica|Analytics)/i}).first();
      await expect(accept,`${site.name}: consentimiento en sesión limpia`).toBeVisible();
      const gaBefore=await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('googletagmanager.com/gtag/js')));
      expect(gaBefore,`${site.name}: Analytics cargado antes de aceptar`).toBeFalsy();
      await accept.click();
      await page.waitForTimeout(250);
      const settings=page.getByRole('button',{name:/Preferencias (de analítica|de privacidad)/i}).first().or(page.getByRole('link',{name:/Preferencias de privacidad/i}).first());
      await expect(settings,`${site.name}: control para reabrir preferencias`).toBeVisible();
      await page.evaluate(()=>localStorage.clear());
    }
  });
});
