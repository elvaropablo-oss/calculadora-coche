const sites = [
  ['CosteCoche', 'https://elvaropablo-oss.github.io/calculadora-coche/'],
  ['CuántoMaterial', 'https://elvaropablo-oss.github.io/cuanto-material/'],
  ['HornoExacto', 'https://elvaropablo-oss.github.io/horno-exacto/'],
  ['TejeConMedida', 'https://elvaropablo-oss.github.io/teje-con-medida/'],
  ['ImprimeMedido', 'https://elvaropablo-oss.github.io/imprime-medido/'],
  ['EscalaClara', 'https://elvaropablo-oss.github.io/escala-clara/'],
  ['CuelgaMedido', 'https://elvaropablo-oss.github.io/cuelga-medido/'],
  ['EstanteMedido', 'https://elvaropablo-oss.github.io/estante-medido/'],
  ['EmbalaExacto', 'https://elvaropablo-oss.github.io/embala-exacto/'],
  ['TierraExacta', 'https://elvaropablo-oss.github.io/tierra-exacta/']
];

const failures = [];
const warnings = [];
const summary = [];

const decodeXml = value => value
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'");

const normalizeUrl = raw => {
  const url = new URL(raw);
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/index\.html$/, '');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
};

const attr = (html, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i');
  const match = html.match(re);
  return (match?.[1] || match?.[2] || '').trim();
};

const linkHref = (html, rel) => {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i');
  const match = html.match(re);
  return (match?.[1] || match?.[2] || '').trim();
};

const textOf = (html, tag) => {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
  return (match?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

async function fetchText(url, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'PortfolioSeoAudit/1.0' },
        signal: AbortSignal.timeout(20_000)
      });
      const text = await response.text();
      if (response.status >= 500 && attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }
      return { response, text };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  throw lastError || new Error(`No se pudo descargar ${url}`);
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

for (const [siteName, baseUrl] of sites) {
  console.log(`\nSEO audit: ${siteName}`);
  let sitemapText = '';
  try {
    const { response, text } = await fetchText(`${baseUrl}sitemap.xml`);
    sitemapText = text;
    if (!response.ok) failures.push(`${siteName}: sitemap.xml devuelve ${response.status}`);
  } catch (error) {
    failures.push(`${siteName}: no se pudo descargar sitemap.xml (${error.message})`);
    continue;
  }

  const urls = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => decodeXml(match[1].trim()));
  if (!urls.length) {
    failures.push(`${siteName}: sitemap sin URLs`);
    continue;
  }
  if (new Set(urls).size !== urls.length) failures.push(`${siteName}: sitemap contiene URLs duplicadas`);

  try {
    const { response, text } = await fetchText(`${baseUrl}robots.txt`);
    if (!response.ok) warnings.push(`${siteName}: robots.txt devuelve ${response.status}`);
    else if (!/sitemap\s*:/i.test(text)) warnings.push(`${siteName}: robots.txt no declara Sitemap`);
  } catch (error) {
    warnings.push(`${siteName}: no se pudo comprobar robots.txt (${error.message})`);
  }

  const titleOwners = new Map();
  const descriptionOwners = new Map();
  let checked = 0;

  await mapLimit(urls, 6, async url => {
    let response;
    let html;
    try {
      ({ response, text: html } = await fetchText(url));
    } catch (error) {
      failures.push(`${siteName}: ${url} no responde (${error.message})`);
      return;
    }
    if (!response.ok) {
      failures.push(`${siteName}: ${url} devuelve ${response.status}`);
      return;
    }
    checked += 1;

    const title = textOf(html, 'title');
    const description = attr(html, 'description');
    const canonicalRaw = linkHref(html, 'canonical');
    const robots = attr(html, 'robots');
    const ogTitle = attr(html, 'og:title');
    const ogDescription = attr(html, 'og:description');
    const ogUrl = attr(html, 'og:url');
    const twitterCard = attr(html, 'twitter:card');
    const h1Count = (html.match(/<h1\b/gi) || []).length;

    if (!title) failures.push(`${siteName}: ${url} no tiene <title>`);
    if (!description) failures.push(`${siteName}: ${url} no tiene meta description`);
    if (!canonicalRaw) failures.push(`${siteName}: ${url} no tiene canonical`);
    if (/noindex/i.test(robots)) failures.push(`${siteName}: ${url} está en sitemap pero declara noindex`);
    if (h1Count !== 1) failures.push(`${siteName}: ${url} tiene ${h1Count} H1`);

    if (canonicalRaw) {
      try {
        if (normalizeUrl(new URL(canonicalRaw, url).href) !== normalizeUrl(url)) {
          failures.push(`${siteName}: canonical no coincide en ${url} -> ${canonicalRaw}`);
        }
      } catch {
        failures.push(`${siteName}: canonical inválido en ${url}`);
      }
    }

    if (title) {
      if (titleOwners.has(title)) failures.push(`${siteName}: title duplicado en ${titleOwners.get(title)} y ${url}`);
      else titleOwners.set(title, url);
      if (title.length < 20 || title.length > 70) warnings.push(`${siteName}: title de ${title.length} caracteres en ${url}`);
    }
    if (description) {
      if (descriptionOwners.has(description)) warnings.push(`${siteName}: description duplicada en ${descriptionOwners.get(description)} y ${url}`);
      else descriptionOwners.set(description, url);
      if (description.length < 50 || description.length > 180) warnings.push(`${siteName}: description de ${description.length} caracteres en ${url}`);
    }

    if (!ogTitle || !ogDescription || !ogUrl) warnings.push(`${siteName}: Open Graph incompleto en ${url}`);
    if (!twitterCard) warnings.push(`${siteName}: Twitter Card ausente en ${url}`);

    for (const script of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { JSON.parse(script[1]); }
      catch { failures.push(`${siteName}: JSON-LD inválido en ${url}`); }
    }
  });

  summary.push({ site: siteName, sitemapUrls: urls.length, checked });
}

console.table(summary);
if (warnings.length) {
  console.warn(`\nAdvertencias SEO (${warnings.length}):`);
  warnings.forEach(item => console.warn(`- ${item}`));
}
if (failures.length) {
  console.error(`\nFallos SEO (${failures.length}):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log(`\nSEO live audit correcto en ${summary.reduce((sum, row) => sum + row.checked, 0)} URLs de ${summary.length} sitios.`);
}
