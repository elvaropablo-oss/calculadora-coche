import { test, expect } from '@playwright/test';

const asset='https://elvaropablo-oss.github.io/assets/monetization.js';
const sites=[
  {slug:'calculadora-coche',url:'https://elvaropablo-oss.github.io/calculadora-coche/cuanto-gasto-gasolina-al-mes.html'},
  {slug:'cuanto-material',url:'https://elvaropablo-oss.github.io/cuanto-material/pintura-paredes.html'},
  {slug:'horno-exacto',url:'https://elvaropablo-oss.github.io/horno-exacto/escalar-receta/'},
  {slug:'teje-con-medida',url:'https://elvaropablo-oss.github.io/teje-con-medida/calcular-muestra/'},
  {slug:'imprime-medido',url:'https://elvaropablo-oss.github.io/imprime-medido/crear-etiquetas/'},
  {slug:'escala-clara',url:'https://elvaropablo-oss.github.io/escala-clara/hallar-escala/'},
  {slug:'cuelga-medido',url:'https://elvaropablo-oss.github.io/cuelga-medido/cuadricula-cuadros/'},
  {slug:'estante-medido',url:'https://elvaropablo-oss.github.io/estante-medido/lista-corte-estanteria/'},
  {slug:'embala-exacto',url:'https://elvaropablo-oss.github.io/embala-exacto/caja-minima/'},
  {slug:'tierra-exacta',url:'https://elvaropablo-oss.github.io/tierra-exacta/litros-maceta/'}
];

async function settled(page,url){
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForLoadState('networkidle',{timeout:7000}).catch(()=>{});
  await page.waitForTimeout(250);
  return response;
}

test.describe('Infraestructura de monetización',()=>{
  test('el motor compartido está publicado y las 10 herramientas lo cargan sin mostrar ofertas vacías',async({page,request},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    const response=await request.get(asset);
    expect(response.ok()).toBeTruthy();
    const code=await response.text();
    expect(code).toContain('rel="sponsored noopener"');
    expect(code).toContain('affiliate_click');

    for(const site of sites){
      const pageResponse=await settled(page,site.url);
      expect(pageResponse?.status()||0,site.slug).toBeLessThan(400);
      await page.waitForFunction(slug=>window.HerramientasExactasMonetization?.site===slug,site.slug,{timeout:7000});
      const state=await page.evaluate(()=>({
        site:window.HerramientasExactasMonetization?.site,
        intents:window.HerramientasExactasMonetization?.intents?.length||0,
        offers:window.HerramientasExactasMonetization?.offers?.length||0,
        scripts:[...document.scripts].map(s=>s.src).filter(Boolean)
      }));
      expect(state.site).toBe(site.slug);
      expect(state.intents,`${site.slug}: catálogo comercial`).toBeGreaterThan(0);
      expect(state.offers,`${site.slug}: no debe haber enlaces inventados`).toBe(0);
      expect(state.scripts.some(src=>src.includes('/assets/monetization.js')),`${site.slug}: carga del motor`).toBeTruthy();
      await expect(page.locator('.he-affiliate'),`${site.slug}: no mostrar bloque vacío`).toHaveCount(0);
    }
  });

  test('una oferta aprobada de prueba se renderiza con aviso y rel sponsored',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    await page.addInitScript(()=>{
      window.HERRAMIENTAS_EXACTAS_AFFILIATE_OVERRIDES={
        'horno-exacto':{offers:[{id:'qa-offer',merchant:'QA',title:'Oferta de prueba',description:'Solo para validar la infraestructura.',url:'https://example.com/affiliate-test',paths:['escalar-receta'],cta:'Ver opción'}]}
      };
    });
    await settled(page,'https://elvaropablo-oss.github.io/horno-exacto/escalar-receta/');
    await page.waitForFunction(()=>window.HerramientasExactasMonetization?.offers?.length===1,{timeout:7000});
    const box=page.locator('.he-affiliate');
    await expect(box).toBeVisible();
    await expect(box).toContainText('podemos recibir una comisión sin coste extra para ti');
    const link=box.locator('a[data-affiliate-link]').first();
    await expect(link).toHaveAttribute('href','https://example.com/affiliate-test');
    await expect(link).toHaveAttribute('rel',/sponsored/);
    await expect(link).toHaveAttribute('rel',/noopener/);
  });
});
