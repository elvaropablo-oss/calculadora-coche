import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base='https://elvaropablo-oss.github.io/';
const toolUrls=[
  'https://elvaropablo-oss.github.io/calculadora-coche/',
  'https://elvaropablo-oss.github.io/cuanto-material/',
  'https://elvaropablo-oss.github.io/horno-exacto/',
  'https://elvaropablo-oss.github.io/teje-con-medida/',
  'https://elvaropablo-oss.github.io/imprime-medido/',
  'https://elvaropablo-oss.github.io/escala-clara/',
  'https://elvaropablo-oss.github.io/cuelga-medido/',
  'https://elvaropablo-oss.github.io/estante-medido/',
  'https://elvaropablo-oss.github.io/embala-exacto/',
  'https://elvaropablo-oss.github.io/tierra-exacta/'
];

function monitor(page){
  const pageErrors=[];const consoleErrors=[];const badLocalResponses=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  page.on('response',response=>{if(response.status()<400)return;try{const url=new URL(response.url());if(url.hostname==='elvaropablo-oss.github.io')badLocalResponses.push(`${response.status()} ${url.pathname}`)}catch{}});
  return{pageErrors,consoleErrors,badLocalResponses};
}

async function openSettled(page,url){const response=await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForLoadState('networkidle',{timeout:7000}).catch(()=>{});await page.waitForTimeout(200);return response}
async function noOverflow(page,label){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(size.scroll,`${label}: overflow horizontal`).toBeLessThanOrEqual(size.client+3)}
async function noSeriousAxe(page,label){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const serious=axe.violations.filter(v=>['critical','serious'].includes(v.impact));expect(serious,`${label}: ${serious.map(v=>v.id).join(', ')}`).toEqual([])}

test.describe('Herramientas Exactas hub',()=>{
  test('portada carga, es responsive y accesible',async({page},testInfo)=>{
    const errors=monitor(page);const response=await openSettled(page,base);
    expect(response?.status()||0).toBeLessThan(400);
    await expect(page.getByRole('heading',{level:1})).toContainText('Calculadoras claras');
    await noOverflow(page,'Hub');await noSeriousAxe(page,'Hub');
    expect(errors.pageErrors).toEqual([]);expect(errors.consoleErrors).toEqual([]);expect(errors.badLocalResponses).toEqual([]);
    const shot=await page.screenshot({fullPage:true});await testInfo.attach(`hub-${testInfo.project.name}`,{body:shot,contentType:'image/png'});
  });

  test('privacidad carga y no introduce analítica',async({page})=>{
    const errors=monitor(page);const response=await openSettled(page,base+'privacidad.html');
    expect(response?.status()||0).toBeLessThan(400);await expect(page.getByRole('heading',{level:1,name:'Privacidad'})).toBeVisible();
    const ga=await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('googletagmanager.com')||r.name.includes('google-analytics.com')));
    expect(ga).toBeFalsy();expect(errors.pageErrors).toEqual([]);expect(errors.badLocalResponses).toEqual([]);
  });

  test('enlaza las diez webs y publica sitemap/robots raíz',async({page,request},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');await openSettled(page,base);
    for(const url of toolUrls)await expect(page.locator(`a[href="${url}"]`).first(),url).toBeVisible();
    const robots=await request.get(base+'robots.txt');expect(robots.ok()).toBeTruthy();const robotsText=await robots.text();
    expect(robotsText).toContain('User-agent: *');expect(robotsText).toContain('Sitemap: https://elvaropablo-oss.github.io/sitemap.xml');
    for(const url of toolUrls)expect(robotsText).toContain(`Sitemap: ${url}sitemap.xml`);
    const sitemap=await request.get(base+'sitemap.xml');expect(sitemap.ok()).toBeTruthy();const xml=await sitemap.text();expect(xml).toContain('<loc>https://elvaropablo-oss.github.io/</loc>');expect(xml).toContain('<loc>https://elvaropablo-oss.github.io/privacidad.html</loc>');
  });

  test('las diez webs enlazan de vuelta a la colección',async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='desktop');
    for(const url of toolUrls){
      const response=await openSettled(page,url);expect(response?.status()||0,url).toBeLessThan(400);
      const backlink=page.locator('a[data-portfolio-hub][href="https://elvaropablo-oss.github.io/"]').first();
      await expect(backlink,`${url}: enlace de vuelta al hub`).toBeVisible();
      await expect(backlink).toHaveText('Todas las herramientas');
    }
  });
});
