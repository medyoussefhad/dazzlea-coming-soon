// Dazzlea static build
// - renders CMS content (content/*.json) into the HTML pages
// - outputs an English site at /  and a French site at /fr/  (real, indexable pages + hreflang)
// - writes SEO head (title, description, canonical, hreflang, Open Graph, JSON-LD), sitemap.xml, robots.txt
// Usage: node cms/build.mjs   →  dist/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.dazzlea.agency';
const OG_DEFAULT = `${SITE}/assets/og/dazzlea-og.jpg`;
const LANGS = ['en', 'fr'];

const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const work = readJSON('content/work.json');
const insights = readJSON('content/insights.json');
const site = readJSON('content/site.json');
const seo = readJSON('cms/seo.json');
const C = site.contact;

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const pick = (o, lang) => (o && (o[lang] || o[lang === 'fr' ? 'en' : 'fr'])) || '';
/** element with both translations; build pass later fills the content for the page language */
const T = (o, tag = 'span', attrs = '') => `<${tag}${attrs ? ' ' + attrs : ''} data-fr="${esc(pick(o, 'fr'))}" data-en="${esc(pick(o, 'en'))}">${pick(o, 'en')}</${tag}>`;
const L = (fr, en) => ({ fr, en });
const fmtDate = (iso, lang) => new Date(iso + 'T12:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const hasPage = (a) => Array.isArray(a.blocks) && a.blocks.length > 0;
const slugOk = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s || '');

function media(m = {}, cls = '', alt = '', style = '') {
  const st = style ? ` style="${style}"` : '';
  if (m.video) {
    return `<video class="${cls}" autoplay muted loop playsinline preload="metadata"${m.poster ? ` poster="${esc(m.poster)}"` : ''}${st}><source src="${esc(m.video)}" type="video/mp4"></video>`;
  }
  const src = m.image || m.poster;
  if (!src) return '';
  return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" width="1200" height="800"${st}>`;
}

// ---------------------------------------------------------------- content renderers
const cases = work.filter((w) => slugOk(w.slug) && w.name);
const featured = cases.filter((w) => w.featured);

function homeCards() {
  const cards = featured.map((w) => `
        <div class="grid-card reveal-fade-up">
          <a class="card-link accent-overlay" href="case-${w.slug}">
            <div class="card-image-wrap">${media(w.media, 'card-img', w.name)}</div>
            <div class="card-caption">
              <div class="card-text-container">${T(w.cardTitle?.en || w.cardTitle?.fr ? w.cardTitle : L(w.name, w.name), 'h3', 'class="card-title"')}</div>
              <div class="client-logo-badge"><span class="logo-badge-text">${esc(w.badge || w.name)}</span></div>
            </div>
          </a>
        </div>`).join('');
  return cards + `
        <div class="grid-card explore-card reveal-fade-up">
          <div class="explore-content-wrap">
            ${T(L('Nos<br><strong>Réalisations</strong>', 'Our<br><strong>Work</strong>'), 'h2', 'class="experience-title"')}
            ${T(L('Voir le portfolio', 'View all work'), 'a', 'href="portfolio" class="btn btn-outline-white"')}
          </div>
        </div>
      `;
}

function portfolioCards(keepHTML) {
  return cases.map((w) => `
        <div class="portfolio-card" data-category="${esc((w.categories || []).join(' '))}">
          <a href="case-${w.slug}">
            <div class="portfolio-card-img-wrap">
              ${media(w.media, 'portfolio-card-img', w.name)}
              <div class="portfolio-card-overlay">
                ${T(w.tag, 'span', 'class="portfolio-card-tag"')}
                <p class="portfolio-card-title">${esc(w.name)}</p>
              </div>
            </div>
          </a>
        </div>`).join('') + '\n' + keepHTML;
}

function statsHTML() {
  return site.stats.map((s) => `
        <div class="stat-item">
          <div class="stat-value-wrap">
            <span class="stat-number" data-target="${Number(s.value) || 0}">0</span>
            <span class="stat-suffix">${esc(s.suffix)}</span>
          </div>
          ${T(s.label, 'span', 'class="stat-label"')}
        </div>`).join('') + '\n      ';
}

function articleMeta(a, long) {
  const fr = `${long ? "Par l'équipe Dazzlea · " : ''}${fmtDate(a.date, 'fr')} · ${a.readMinutes} min${long ? ' de lecture' : ''}`;
  const en = `${long ? 'By the Dazzlea team · ' : ''}${fmtDate(a.date, 'en')} · ${a.readMinutes} min${long ? ' read' : ''}`;
  return T(L(fr, en), 'p', 'class="article-meta"');
}

function insightsGrid() {
  const list = insights.filter((a) => slugOk(a.slug));
  const feat = list.find((a) => a.featured) || list[0];
  const card = (a, isFeat) => {
    const tag = hasPage(a) ? 'a' : 'div';
    const href = hasPage(a) ? ` href="blog-${a.slug}"` : '';
    const w = isFeat ? 800 : 600, h = isFeat ? 533 : 400;
    return `
        <${tag}${href} class="${isFeat ? 'article-card-featured' : 'article-card'}" data-cat="${esc(a.category)}">
          <div class="article-img-wrap">
            <img src="${esc(a.image)}" width="${w}" height="${h}" loading="lazy" alt="${esc(a.imageAlt || strip(pick(a.title, 'en')))}">
          </div>
          <div class="article-content">
            ${T(a.tag, 'span', 'class="article-tag"')}
            ${T(a.title, 'p', 'class="article-title"')}
            ${T(a.excerpt, 'p', 'class="article-excerpt"')}
            ${articleMeta(a, isFeat)}
          </div>
        </${tag}>`;
  };
  const rest = list.filter((a) => a !== feat);
  return `${feat ? card(feat, true) : ''}
        <div class="insights-list">${rest.map((a) => card(a, false)).join('')}
        </div>
      `;
}

function megaRecent() {
  return cases.slice(0, 5).map((w) => `\n                  <a href="case-${w.slug}" class="mega-link">${esc(w.name)}</a>`).join('') + '\n                ';
}

const waURL = `https://wa.me/${C.whatsapp}`;
const waIcon = `<a href="${waURL}" class="wa-link" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`;

function footerContact() {
  return `
            ${T(C.address, 'li', 'class="footer-address"')}
            <li><a href="tel:${esc(C.phone)}">${esc(C.phoneDisplay)}</a>${waIcon}</li>
            <li><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></li>
            ${C.email2 ? `<li><a href="mailto:${esc(C.email2)}">${esc(C.email2)}</a></li>` : ''}
            <li>${T(L('Soumettre un Brief', 'Submit a Brief'), 'a', 'href="contact"')}</li>
          `;
}
const socialIcons = () => `
            ${C.instagram ? `<a href="${esc(C.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>` : ''}
            ${C.linkedin ? `<a href="${esc(C.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>` : ''}
            <a href="${waURL}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
          `;
const mobileContact = () => `
          <a href="tel:${esc(C.phone)}"><i class="fa-solid fa-phone"></i> ${esc(C.phoneDisplay)}</a>
          <a href="${waURL}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
          <a href="mailto:${esc(C.email)}"><i class="fa-solid fa-envelope"></i> ${esc(C.email)}</a>
        `;

function contactDetails() {
  const d = (icon, label, value) => `
            <div class="contact-detail">
              <div class="contact-detail-icon"><i class="fa-solid ${icon}"></i></div>
              <div class="contact-detail-text">
                ${T(label, 'p', 'class="detail-label"')}
                ${value}
              </div>
            </div>`;
  const email2 = C.email2 || C.email;
  return `
            ${T(L('Informations de Contact', 'Contact Information'), 'h3')}
            ${d('fa-location-dot', L('Adresse', 'Address'), T(C.address, 'p', 'class="detail-value"'))}
            ${d('fa-phone', L('Téléphone', 'Phone'), `<p class="detail-value"><a href="tel:${esc(C.phone)}">${esc(C.phoneDisplay)}</a>${waIcon}</p>`)}
            ${d('fa-envelope', L('Email', 'Email'), `<p class="detail-value"><a href="mailto:${esc(C.email)}">${esc(C.email)}</a>${C.email2 ? `<br><a href="mailto:${esc(C.email2)}">${esc(C.email2)}</a>` : ''}</p>`)}
            ${d('fa-clock', L('Horaires', 'Hours'), T(C.hours, 'p', 'class="detail-value"'))}
            ${d('fa-handshake', L('Partenariats', 'Partnership Opportunities'), `<p class="detail-value"><a href="mailto:${esc(email2)}?subject=Partnership">${esc(email2)}</a></p>`)}
            ${d('fa-user-plus', L("Rejoindre l'équipe", 'Join Our Team'), `<p class="detail-value"><a href="mailto:${esc(C.email)}?subject=Careers">${esc(C.email)}</a></p>`)}
            `;
}

function caseMain(w, i) {
  const next = cases[(i + 1) % cases.length];
  const tags = (w.hero?.tags || []).map((t) => T(t, 'span', 'class="page-tag"')).join('\n          ');
  const facts = (w.facts || []).map((f) => `
          <div class="quick-fact-item">
            ${T(f.label, 'div', 'class="quick-fact-label"')}
            ${T(f.value, 'div', 'class="quick-fact-value"')}
          </div>`).join('');
  const rows = (w.sections || []).map((s, k) => `
      <div class="case-row${k % 2 ? ' case-row-reverse' : ''}">
        <div class="case-row-media">${media(s.media, '', strip(pick(s.heading, 'en')) || w.name, 'width:100%;height:100%;object-fit:cover;')}</div>
        <div class="case-row-text">
          ${T(s.label, 'span', 'class="section-label"')}
          ${T(s.heading, 'h3')}
          ${T(s.text, 'p')}
        </div>
      </div>`).join('');
  const kpis = (w.kpis || []).length ? `
    <div class="kpi-section">
      <div class="kpi-section-inner">
        <div class="kpi-section-header">
          ${T(L('Résultats &amp; Impact', 'Results &amp; Impact'), 'span', 'class="section-label"')}
          ${T(L("Des chiffres qui parlent d'eux-mêmes", 'Numbers that speak for themselves'), 'h2')}
        </div>
        <div class="kpi-grid">${w.kpis.map((k) => `
          <div class="kpi-card">
            <div class="kpi-number">${esc(k.number)}</div>
            ${T(k.text, 'div', 'class="kpi-description"')}
          </div>`).join('')}
        </div>
      </div>
    </div>` : '';
  const nextTitle = next.cardTitle && (next.cardTitle.en || next.cardTitle.fr)
    ? L(strip(next.cardTitle.fr || next.cardTitle.en), strip(next.cardTitle.en || next.cardTitle.fr)) : L(next.name, next.name);
  return `<main>

    <section class="page-hero">
      <div class="page-hero-img-wrap">
        <img src="${esc(w.hero?.image || w.media?.image || w.media?.poster || '')}" width="2070" height="1380" alt="${esc(w.name)}" class="page-hero-img" fetchpriority="high">
        <div class="page-hero-overlay"></div>
      </div>
      <div class="page-hero-content">
        <div class="page-tags">
          ${tags}
        </div>
        <h1 class="page-hero-title">${esc(w.name)}</h1>
        ${T(w.hero?.subtitle, 'p', 'class="page-hero-subtitle"')}
      </div>
    </section>

    <div class="breadcrumb-bar">
      <div class="breadcrumb-inner">
        ${T(L('Accueil', 'Home'), 'a', 'href="index"')}
        <span class="breadcrumb-sep"><i class="fa-solid fa-chevron-right"></i></span>
        ${T(L('Réalisations', 'Work'), 'a', 'href="portfolio"')}
        <span class="breadcrumb-sep"><i class="fa-solid fa-chevron-right"></i></span>
        <span>${esc(w.name)}</span>
      </div>
    </div>

    <div class="case-intro">
      <div class="case-intro-grid">
        <div class="case-intro-text">
          ${T(w.intro?.label, 'span', 'class="section-label"')}
          ${T(w.intro?.heading, 'h2')}
          ${(w.intro?.paragraphs || []).map((p) => T(p, 'p')).join('\n          ')}
        </div>
        <aside class="case-quick-facts">
          ${T(L('Fiche Projet', 'Project Sheet'), 'h4')}${facts}
        </aside>
      </div>
    </div>

    <div class="case-sections">${rows}
    </div>
${kpis}
    <div class="next-project">
      <div class="next-project-inner">
        <div>
          ${T(L('Projet Suivant', 'Next Project'), 'p', 'class="next-project-label"')}
          ${T(nextTitle, 'p', 'class="next-project-title"')}
        </div>
        <a href="case-${next.slug}" style="display:flex;align-items:center;gap:16px;text-decoration:none;" aria-label="${esc(next.name)}">
          <div class="next-project-arrow"><i class="fa-solid fa-arrow-right"></i></div>
        </a>
      </div>
    </div>

  </main>`;
}

function articleMain(a) {
  const blocks = (a.blocks || []).map((b) => {
    if (b.type === 'heading') return T(b.text, 'h2');
    if (b.type === 'quote') return T(b.text, 'div', 'class="article-highlight"');
    if (b.type === 'cards') return `<div class="kpi-grid">${(b.items || []).map((it) => `
        <div class="kpi-card">
          ${T(it.title, 'div', 'class="kpi-label"')}
          ${T(it.text, 'p')}
        </div>`).join('')}
      </div>`;
    if (b.type === 'image') return `<figure class="article-figure">${media({ image: b.image }, '', strip(pick(b.caption, 'en')))}${pick(b.caption, 'en') ? T(b.caption, 'figcaption') : ''}</figure>`;
    if (b.type === 'html') return T(b.html, 'div', 'class="article-html"');
    return T(b.text, 'p');
  }).join('\n\n      ');
  const cta = a.cta && (pick(a.cta.title, 'en')) ? `
      <div class="article-cta">
        ${T(a.cta.title, 'h3')}
        ${pick(a.cta.text, 'en') ? T(a.cta.text, 'p') : ''}
        ${T(pick(a.cta.button, 'en') ? a.cta.button : L('Parler à un expert', 'Talk to an expert'), 'a', 'href="contact" class="btn btn-hero"')}
      </div>` : '';
  return `<main class="article-page">

    <div class="article-hero">
      ${T(a.tag, 'span', 'class="article-tag"')}
      ${T(a.title, 'h1', 'class="article-hero-title"')}
      <div class="article-meta">
        <span><i class="fa-regular fa-calendar"></i> ${T(L(fmtDate(a.date, 'fr'), fmtDate(a.date, 'en')))}</span>
        <span><i class="fa-regular fa-clock"></i> ${T(L(`${a.readMinutes} min de lecture`, `${a.readMinutes} min read`))}</span>
      </div>
      <img src="${esc(a.heroImage || a.image)}" width="1200" height="800" alt="${esc(a.imageAlt || strip(pick(a.title, 'en')))}" class="article-hero-img" fetchpriority="high">
    </div>

    <div class="article-body">
      <a href="insights" class="back-link">
        <i class="fa-solid fa-arrow-left"></i> ${T(L('Retour aux Insights', 'Back to Insights'))}
      </a>

      ${blocks}
${cta}
    </div>

  </main>`;
}

// ---------------------------------------------------------------- page list
const templates = {
  case: fs.readFileSync(path.join(ROOT, 'cms/templates/case.html'), 'utf8'),
  article: fs.readFileSync(path.join(ROOT, 'cms/templates/article.html'), 'utf8'),
};
const pages = [];
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  if (/^(case|blog)-/.test(f)) continue; // generated from content/
  pages.push({ name: f.replace(/\.html$/, ''), html: fs.readFileSync(path.join(ROOT, f), 'utf8'), kind: 'page' });
}
cases.forEach((w, i) => pages.push({ name: `case-${w.slug}`, html: templates.case.replace('{{MAIN}}', caseMain(w, i)), kind: 'case', item: w }));
insights.filter((a) => slugOk(a.slug) && hasPage(a)).forEach((a) => pages.push({ name: `blog-${a.slug}`, html: templates.article.replace('{{MAIN}}', articleMain(a)), kind: 'article', item: a }));
const pageNames = new Set(pages.map((p) => p.name));

// ---------------------------------------------------------------- SEO head
const urlFor = (name, lang) => {
  const p = name === 'index' ? '' : name;
  return lang === 'fr' ? `${SITE}/fr${p ? '/' + p : ''}` : `${SITE}/${p}`;
};

function seoFor(page, lang) {
  const base = seo.pages[page.name];
  if (page.kind === 'case') {
    const w = page.item;
    const d = pick(w.seo?.description, lang) || strip(pick(w.hero?.subtitle, lang));
    return {
      title: lang === 'fr' ? `${w.name} — Étude de cas | Dazzlea` : `${w.name} — Case Study | Dazzlea`,
      description: d, image: (w.hero?.image || '').replace(/w=\d+/, 'w=1200') || OG_DEFAULT, type: 'article',
      crumbs: [[lang === 'fr' ? 'Accueil' : 'Home', 'index'], [lang === 'fr' ? 'Réalisations' : 'Work', 'portfolio'], [w.name, page.name]],
    };
  }
  if (page.kind === 'article') {
    const a = page.item;
    return {
      title: `${strip(pick(a.title, lang))} | Dazzlea`,
      description: pick(a.seo?.description, lang) || strip(pick(a.excerpt, lang)),
      image: (a.heroImage || a.image || '').replace(/w=\d+/, 'w=1200') || OG_DEFAULT, type: 'article',
      crumbs: [[lang === 'fr' ? 'Accueil' : 'Home', 'index'], ['Insights', 'insights'], [strip(pick(a.title, lang)), page.name]],
    };
  }
  if (!base) throw new Error(`cms/seo.json has no entry for page "${page.name}"`);
  return { title: base.title[lang], description: base.description[lang], image: base.image || OG_DEFAULT, type: 'website', noindex: !!base.noindex, crumbs: base.crumb ? [[lang === 'fr' ? 'Accueil' : 'Home', 'index'], [base.crumb[lang], page.name]] : null };
}

function jsonLd(page, lang, s) {
  const blocks = [];
  const org = {
    '@type': 'ProfessionalService', '@id': `${SITE}/#organization`, name: 'Dazzlea', alternateName: 'Dazzlea Agency',
    url: `${SITE}/`, logo: `${SITE}/android-chrome-512x512.png`, image: OG_DEFAULT,
    description: seo.pages.index.description[lang], telephone: C.phone, email: C.email, priceRange: '$$',
    address: { '@type': 'PostalAddress', streetAddress: strip(C.address.fr).replace(/,?\s*Casablanca.*$/i, ''), addressLocality: 'Casablanca', addressRegion: 'Casablanca-Settat', addressCountry: 'MA' },
    areaServed: [{ '@type': 'Country', name: 'Morocco' }, { '@type': 'Place', name: 'Middle East and North Africa (MENA)' }, { '@type': 'Place', name: 'Africa' }],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' }],
    knowsAbout: ['Event management', 'Experiential marketing', 'Brand activation', 'Scenography', 'Communication', 'Digital marketing', 'Public relations'],
    sameAs: [C.instagram, C.linkedin].filter(Boolean),
    contactPoint: [{ '@type': 'ContactPoint', telephone: C.phone, email: C.email, contactType: 'sales', availableLanguage: ['French', 'English', 'Arabic'] }],
  };
  if (page.name === 'index') {
    blocks.push(org);
    blocks.push({ '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Dazzlea', inLanguage: lang === 'fr' ? 'fr-MA' : 'en', publisher: { '@id': `${SITE}/#organization` } });
  }
  if (page.name === 'contact') blocks.push({ ...org, '@type': 'ProfessionalService' });
  if (page.kind === 'article') {
    const a = page.item;
    blocks.push({
      '@type': 'BlogPosting', headline: strip(pick(a.title, lang)).slice(0, 110), description: s.description, image: [s.image],
      datePublished: a.date, dateModified: a.updated || a.date, inLanguage: lang === 'fr' ? 'fr' : 'en',
      mainEntityOfPage: urlFor(page.name, lang),
      author: { '@type': 'Organization', name: 'Dazzlea', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'Dazzlea', logo: { '@type': 'ImageObject', url: `${SITE}/android-chrome-512x512.png` } },
    });
  }
  if (s.crumbs) {
    blocks.push({ '@type': 'BreadcrumbList', itemListElement: s.crumbs.map(([n, p], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: urlFor(p, lang) })) });
  }
  if (!blocks.length) return '';
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': blocks }).replace(/</g, '\\u003c')}</script>`;
}

function headBlock(page, lang) {
  const s = seoFor(page, lang);
  const url = urlFor(page.name, lang);
  const is404 = page.name === '404';
  const alt = is404 ? '' : `
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="en" href="${urlFor(page.name, 'en')}">
  <link rel="alternate" hreflang="fr" href="${urlFor(page.name, 'fr')}">
  <link rel="alternate" hreflang="x-default" href="${urlFor(page.name, 'en')}">`;
  return `
  <title>${esc(s.title)}</title>
  <meta name="description" content="${esc(s.description)}">
  <meta name="robots" content="${s.noindex || is404 ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">${alt}
  <meta property="og:site_name" content="Dazzlea">
  <meta property="og:type" content="${s.type}">
  <meta property="og:title" content="${esc(s.title)}">
  <meta property="og:description" content="${esc(s.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(s.image)}">
  <meta property="og:image:alt" content="Dazzlea — ${lang === 'fr' ? 'Agence événementielle & marketing expérientiel, Casablanca' : 'Event & experience marketing agency, Casablanca'}">
  <meta property="og:locale" content="${lang === 'fr' ? 'fr_FR' : 'en_US'}">
  <meta property="og:locale:alternate" content="${lang === 'fr' ? 'en_US' : 'fr_FR'}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(s.title)}">
  <meta name="twitter:description" content="${esc(s.description)}">
  <meta name="twitter:image" content="${esc(s.image)}">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#111111">
  ${seo.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(seo.googleSiteVerification)}">` : ''}
  ${jsonLd(page, lang, s)}
`;
}

// ---------------------------------------------------------------- page transform
const ASSET_ATTRS = ['src', 'href', 'poster'];
const isRelAsset = (v) => v && !/^(https?:|\/\/|\/|#|mailto:|tel:|data:|javascript:)/i.test(v);

function render(page, lang) {
  const root = parse(page.html, { comment: true });
  const head = root.querySelector('head');

  // 1. CMS regions
  const q = (s) => root.querySelector(s);
  if (page.name === 'index') {
    q('#work .grid-container')?.set_content(homeCards());
    q('.stats-container')?.set_content(statsHTML());
  }
  if (page.name === 'portfolio') {
    const grid = q('.portfolio-grid-page');
    if (grid) {
      const keep = grid.querySelectorAll('.portfolio-card').filter((c) => !(c.querySelector('a')?.getAttribute('href') || '').startsWith('case-')).map((c) => c.toString()).join('\n');
      grid.set_content(portfolioCards(keep));
    }
  }
  if (page.name === 'insights') q('.insights-grid-inner')?.set_content(insightsGrid());
  if (page.name === 'contact') q('.contact-info-card')?.querySelectorAll('h3, .contact-detail').forEach((n, i) => (i === 0 ? n.replaceWith(contactDetails()) : n.remove()));
  root.querySelectorAll('.mega-col').forEach((col) => {
    if (!col.querySelector('a.mega-link[href^="case-"]')) return;
    const title = col.querySelector('.mega-col-title');
    col.set_content((title ? title.toString() : '') + megaRecent());
  });
  root.querySelectorAll('ul.footer-contact-list').forEach((u) => u.set_content(footerContact()));
  root.querySelectorAll('.footer-about-col .social-icons, .mobile-nav-social').forEach((u) => u.set_content(socialIcons()));
  root.querySelectorAll('.mobile-nav-contact').forEach((u) => u.set_content(mobileContact()));

  // 2. Language: write the right language into the HTML (what Google indexes)
  root.querySelectorAll('[data-fr]').forEach((el) => {
    const v = el.getAttribute(`data-${lang}`);
    if (v) el.set_content(v);
  });
  root.querySelector('html')?.setAttribute('lang', lang === 'fr' ? 'fr' : 'en');

  // 3. Links & assets: absolute paths so /fr/ pages work; page links stay inside the language
  const prefix = lang === 'fr' ? '/fr' : '';
  root.querySelectorAll('[src], [href], [poster]').forEach((el) => {
    for (const a of ASSET_ATTRS) {
      const v = el.getAttribute(a);
      if (!isRelAsset(v)) continue;
      const m = v.match(/^([a-z0-9-]+)(\?[^#]*)?(#.*)?$/i);
      if (el.tagName === 'A' && m && pageNames.has(m[1])) {
        const p = m[1] === 'index' ? (prefix || '/') : `${prefix}/${m[1]}`;
        el.setAttribute(a, p + (m[2] || '') + (m[3] || ''));
      } else if (el.tagName === 'A' && m) {
        el.setAttribute(a, `${prefix}/${v}`);
      } else {
        el.setAttribute(a, '/' + v.replace(/^\.\//, ''));
      }
    }
  });
  // language switch → the real alternate URL
  root.querySelectorAll('.lang-btn').forEach((b) => {
    const l = b.getAttribute('data-lang');
    b.setAttribute('data-href', urlFor(page.name, l).replace(SITE, '') || '/');
    if (l === lang) b.classList.add('active'); else b.classList.remove('active');
  });

  // 4. SEO head: drop old SEO/icon tags, inject the generated block after the viewport meta
  head.querySelectorAll('title, meta[name="description"], meta[name="robots"], meta[name="theme-color"], meta[name^="twitter:"], meta[property^="og:"], link[rel="canonical"], link[rel="alternate"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], script[type="application/ld+json"], meta[name="google-site-verification"]').forEach((n) => n.remove());
  const vp = head.querySelector('meta[name="viewport"]');
  if (vp) vp.insertAdjacentHTML('afterend', headBlock(page, lang)); else head.insertAdjacentHTML('afterbegin', headBlock(page, lang));

  return '<!DOCTYPE html>\n' + root.toString().replace(/^\s*<!DOCTYPE html>\s*/i, '').replace(/\n\s*\n\s*\n/g, '\n\n');
}

// ---------------------------------------------------------------- write
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'fr'), { recursive: true });

const SKIP = new Set(['dist', 'node_modules', 'cms', 'api', 'content', '.git', '.vercel', '.claude', 'package.json', 'package-lock.json', 'vercel.json', 'Wodz', 'dazzle & connect', 'README.md', '.gitignore', '.env', '.env.local', 'robots.txt', 'sitemap.xml']);
for (const f of fs.readdirSync(ROOT)) {
  if (SKIP.has(f) || f.endsWith('.html') || f.startsWith('.')) continue;
  fs.cpSync(path.join(ROOT, f), path.join(DIST, f), { recursive: true });
}

for (const page of pages) {
  for (const lang of LANGS) {
    const out = lang === 'fr' ? path.join(DIST, 'fr', page.name + '.html') : path.join(DIST, page.name + '.html');
    fs.writeFileSync(out, render(page, lang));
  }
}

// sitemap with hreflang alternates
const today = new Date().toISOString().slice(0, 10);
const prio = { index: '1.0', services: '0.9', portfolio: '0.9', contact: '0.8', about: '0.8', insights: '0.7' };
const indexable = pages.filter((p) => p.name !== '404' && !(seo.pages[p.name] && seo.pages[p.name].noindex));
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for (const p of indexable) {
  const lastmod = p.kind === 'article' ? (p.item.updated || p.item.date) : today;
  for (const lang of LANGS) {
    sm.push(`  <url><loc>${urlFor(p.name, lang)}</loc><lastmod>${lastmod}</lastmod><priority>${prio[p.name] || (p.kind === 'page' ? '0.5' : '0.6')}</priority>` +
      LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(p.name, l)}"/>`).join('') +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(p.name, 'en')}"/></url>`);
  }
}
sm.push('</urlset>');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sm.join('\n') + '\n');
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built ${pages.length} pages × ${LANGS.length} languages → dist/  (${cases.length} case studies, ${pages.filter((p) => p.kind === 'article').length} articles)`);
