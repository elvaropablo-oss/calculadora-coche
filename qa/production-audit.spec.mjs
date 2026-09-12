import { test, expect } from '@playwright/test';
const base='https://elvaropablo-oss.github.io/calculadora-coche/';
async function rejectConsent(page){const button=page.getByRole('button',{name:'Rechazar no necesarias',exact:true});if(await button.isVisible())await button.click();}

test('tyre CTA requires a complete measure within declared bounds',async({page})=>{
  await page.goto(base+'calculadora-coste-neumaticos-coche.html');await rejectConsent(page);
  const box=page.locator('.cc-commerce'),link=box.locator('a');
  const width=box.getByLabel('Ancho (mm)'),profile=box.getByLabel('Perfil'),rim=box.getByLabel('Llanta (pulgadas)');
  await expect(link).toBeHidden();
  await width.fill('205');await profile.fill('55');await rim.fill('16');
  await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','https://www.neumaticos.es/');
  for(const [field,value] of [[width,'999'],[profile,'999'],[rim,'99'],[width,'205.5']]){
    await width.fill('205');await profile.fill('55');await rim.fill('16');await field.fill(value);
    await expect(link).toBeHidden();await expect(link).not.toHaveAttribute('href');
  }
  await width.fill('205');await profile.fill('55');await rim.fill('16');await profile.fill('');
  await expect(link).toBeHidden();await expect(link).not.toHaveAttribute('href');
});

test('travel bars use the current result, not the article example or input prices',async({page})=>{
  await page.goto(base+'cuanto-cuesta-un-viaje-en-coche.html');await rejectConsent(page);
  await page.locator('#cons').fill('6.5');await page.locator('#price').fill('1.60');await page.locator('#tolls').fill('15');await page.locator('#other').fill('0');await page.locator('#people').fill('3');
  for(const [km,total] of [['3000','327,00'],['10','16,04']]){
    await page.locator('#km').fill(km);await page.getByRole('button',{name:'Calcular viaje',exact:true}).click();
    const chart=page.locator('[data-cc-visual]');await expect(chart).toContainText(total);
    await expect(chart).not.toContainText('600 ×');await expect(chart).not.toContainText('Combustible (€/L):');
  }
});
