import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';

const targets = [
  ['hub-home','https://elvaropablo-oss.github.io/'],
  ['hub-privacy','https://elvaropablo-oss.github.io/privacidad.html'],
  ['costecoche-home','https://elvaropablo-oss.github.io/calculadora-coche/'],
  ['costecoche-tool','https://elvaropablo-oss.github.io/calculadora-coche/cuanto-gasto-gasolina-al-mes.html'],
  ['material-home','https://elvaropablo-oss.github.io/cuanto-material/'],
  ['material-tool','https://elvaropablo-oss.github.io/cuanto-material/reforma-habitacion.html'],
  ['horno-home','https://elvaropablo-oss.github.io/horno-exacto/'],
  ['horno-tool','https://elvaropablo-oss.github.io/horno-exacto/escalar-receta/'],
  ['teje-home','https://elvaropablo-oss.github.io/teje-con-medida/'],
  ['teje-tool','https://elvaropablo-oss.github.io/teje-con-medida/calcular-muestra/'],
  ['imprime-home','https://elvaropablo-oss.github.io/imprime-medido/'],
  ['imprime-tool','https://elvaropablo-oss.github.io/imprime-medido/crear-etiquetas/'],
  ['escala-home','https://elvaropablo-oss.github.io/escala-clara/'],
  ['escala-tool','https://elvaropablo-oss.github.io/escala-clara/hallar-escala/'],
  ['cuelga-home','https://elvaropablo-oss.github.io/cuelga-medido/'],
  ['cuelga-tool','https://elvaropablo-oss.github.io/cuelga-medido/cuadricula-cuadros/'],
  ['estante-home','https://elvaropablo-oss.github.io/estante-medido/'],
  ['estante-tool','https://elvaropablo-oss.github.io/estante-medido/lista-corte-estanteria/'],
  ['embala-home','https://elvaropablo-oss.github.io/embala-exacto/'],
  ['embala-tool','https://elvaropablo-oss.github.io/embala-exacto/caja-minima/'],
  ['tierra-home','https://elvaropablo-oss.github.io/tierra-exacta/'],
  ['tierra-tool','https://elvaropablo-oss.github.io/tierra-exacta/litros-maceta/']
];

const floors={performance:.45,accessibility:.80,'best-practices':.80,seo:.80};
await mkdir('lighthouse-results',{recursive:true});
const chrome=await chromeLauncher.launch({chromeFlags:['--headless','--no-sandbox','--disable-gpu']});
const summary=[];
let failed=false;
try{
  for(const [name,url] of targets){
    console.log(`Lighthouse: ${name}`);
    const run=await lighthouse(url,{port:chrome.port,logLevel:'error',output:'json',onlyCategories:Object.keys(floors)});
    if(!run?.lhr)throw new Error(`Lighthouse no devolvió resultado para ${name}`);
    const scores=Object.fromEntries(Object.keys(floors).map(key=>[key,Number(run.lhr.categories[key]?.score??0)]));
    const row={name,url,...scores};
    summary.push(row);
    await writeFile(`lighthouse-results/${name}.json`,JSON.stringify(run.lhr,null,2));
    for(const [key,floor] of Object.entries(floors)){
      if(scores[key]<floor){failed=true;console.error(`${name}: ${key} ${Math.round(scores[key]*100)} < ${Math.round(floor*100)}`);}
    }
  }
}finally{await chrome.kill();}
await writeFile('lighthouse-results/summary.json',JSON.stringify(summary,null,2));
console.table(summary.map(row=>({name:row.name,performance:Math.round(row.performance*100),accessibility:Math.round(row.accessibility*100),bestPractices:Math.round(row['best-practices']*100),seo:Math.round(row.seo*100)})));
if(failed)process.exitCode=1;