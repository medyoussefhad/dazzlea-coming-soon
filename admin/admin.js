/* Dazzlea admin — edits content/*.json through /api, which commits to GitHub → Vercel rebuilds the site. */
(() => {
  'use strict';

  // ------------------------------------------------------------------ tiny DOM helper (never uses innerHTML for data)
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const $ = (s) => document.querySelector(s);
  const icon = (n) => h('i', { class: n });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach((k) => { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
  const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const i18nEmpty = () => ({ fr: '', en: '' });

  function toast(msg, err) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = 'toast'), err ? 6000 : 3200);
  }

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-DZ-Admin': '1', ...(opts.headers || {}) } });
    let d = {}; try { d = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(d.error || `Error ${r.status}`); e.status = r.status; throw e; }
    return d;
  }

  // ------------------------------------------------------------------ schemas
  const CATS = [['events', 'Events & Galas'], ['activation', 'Activation'], ['scenographie', 'Scenography & Booths'], ['institutionnel', 'Institutional']];
  const ICATS = [['strategy', 'Strategy'], ['events', 'Events'], ['africa', 'Africa'], ['trends', 'Trends']];
  const HTML_HELP = 'You can use <strong>bold</strong>, <em>italic</em> and <br> for a line break.';

  const WORK = [
    { group: 'Basics', fields: [
      { key: 'name', type: 'text', label: 'Project name', required: true },
      { key: 'slug', type: 'slug', label: 'Page address', from: 'name', prefix: '/case-' },
      { key: 'client', type: 'text', label: 'Client' },
      { key: 'featured', type: 'bool', label: 'Show on the homepage (Selected Work)' },
      { key: 'categories', type: 'multi', label: 'Portfolio filters', options: CATS },
      { key: 'tag', type: 'i18n', label: 'Label on the portfolio card', help: 'e.g. Activation, Institutional' },
      { key: 'cardTitle', type: 'i18n', label: 'Homepage card title', help: HTML_HELP },
      { key: 'badge', type: 'text', label: 'Badge on the homepage card', help: 'Short client name in capitals, e.g. DACIA' },
    ] },
    { group: 'Card photo / video', fields: [
      { key: 'media.image', type: 'image', label: 'Card photo' },
      { key: 'media.video', type: 'text', label: 'Card video link (optional, .mp4)', help: 'If filled in, the video plays on the card instead of the photo.' },
      { key: 'media.poster', type: 'image', label: 'Video cover image (shown while the video loads)' },
    ] },
    { group: 'Case page — header', fields: [
      { key: 'hero.image', type: 'image', label: 'Header photo' },
      { key: 'hero.subtitle', type: 'i18n', multiline: true, label: 'Subtitle' },
      { key: 'hero.tags', type: 'list', label: 'Tags', itemLabel: 'Tag', of: { type: 'i18n' } },
    ] },
    { group: 'Context & objectives', fields: [
      { key: 'intro.label', type: 'i18n', label: 'Small label' },
      { key: 'intro.heading', type: 'i18n', label: 'Heading' },
      { key: 'intro.paragraphs', type: 'list', label: 'Paragraphs', itemLabel: 'Paragraph', of: { type: 'i18n', multiline: true } },
    ] },
    { group: 'Project sheet', fields: [
      { key: 'facts', type: 'list', label: 'Facts', itemLabel: 'Fact', of: { type: 'object', fields: [
        { key: 'label', type: 'i18n', label: 'Label (e.g. Client, City, Duration)' },
        { key: 'value', type: 'i18n', label: 'Value' },
      ] } },
    ] },
    { group: 'Story sections', fields: [
      { key: 'sections', type: 'list', label: 'Sections (photo/video + text, alternating sides)', itemLabel: 'Section', of: { type: 'object', fields: [
        { key: 'media.image', type: 'image', label: 'Photo' },
        { key: 'media.video', type: 'text', label: 'Video link (optional, .mp4)' },
        { key: 'label', type: 'i18n', label: 'Small label' },
        { key: 'heading', type: 'i18n', label: 'Heading' },
        { key: 'text', type: 'i18n', multiline: true, label: 'Text', help: HTML_HELP },
      ] } },
    ] },
    { group: 'Results (key figures)', fields: [
      { key: 'kpis', type: 'list', label: 'Figures', itemLabel: 'Figure', of: { type: 'object', fields: [
        { key: 'number', type: 'text', label: 'Number (e.g. 25K+, 2.4M, 48)' },
        { key: 'text', type: 'i18n', multiline: true, label: 'Description' },
      ] } },
    ] },
    { group: 'Google (SEO)', fields: [
      { key: 'seo.description', type: 'i18n', multiline: true, label: 'Google description', help: 'About 150 characters. Leave empty to use the subtitle.', counter: 160 },
    ] },
  ];

  const BLOCK_TYPES = [['paragraph', 'Paragraph'], ['heading', 'Heading'], ['quote', 'Highlighted quote'], ['cards', 'Cards (2×2 grid)'], ['image', 'Image'], ['html', 'Custom HTML']];
  const INSIGHTS = [
    { group: 'Basics', fields: [
      { key: 'title', type: 'i18n', label: 'Title', required: true },
      { key: 'slug', type: 'slug', label: 'Page address', from: 'title.en', prefix: '/blog-' },
      { key: 'date', type: 'date', label: 'Publication date' },
      { key: 'readMinutes', type: 'number', label: 'Reading time (minutes)' },
      { key: 'category', type: 'select', label: 'Filter category', options: ICATS },
      { key: 'tag', type: 'i18n', label: 'Label shown on the card' },
      { key: 'featured', type: 'bool', label: 'Featured (large card at the top of Insights)' },
      { key: 'excerpt', type: 'i18n', multiline: true, label: 'Short summary (card)' },
    ] },
    { group: 'Images', fields: [
      { key: 'image', type: 'image', label: 'Card image' },
      { key: 'heroImage', type: 'image', label: 'Article header image', help: 'Leave empty to reuse the card image.' },
      { key: 'imageAlt', type: 'text', label: 'Image description (for Google & accessibility)' },
    ] },
    { group: 'Article', fields: [
      { key: 'blocks', type: 'blocks', label: 'Content', help: 'An article without content shows as a card only, without its own page.' },
    ] },
    { group: 'Call to action (end of article)', fields: [
      { key: 'cta.title', type: 'i18n', label: 'Title' },
      { key: 'cta.text', type: 'i18n', multiline: true, label: 'Text' },
      { key: 'cta.button', type: 'i18n', label: 'Button text' },
    ] },
    { group: 'Google (SEO)', fields: [
      { key: 'seo.description', type: 'i18n', multiline: true, label: 'Google description', help: 'About 150 characters. Leave empty to use the summary.', counter: 160 },
    ] },
  ];

  const SITE = [
    { group: 'Contact details', fields: [
      { key: 'contact.phoneDisplay', type: 'text', label: 'Phone (as displayed)', help: 'e.g. +212 6 61 51 22 83' },
      { key: 'contact.phone', type: 'text', label: 'Phone (for the call link, no spaces)', help: 'e.g. +212661512283' },
      { key: 'contact.whatsapp', type: 'text', label: 'WhatsApp number (digits only, with country code)', help: 'e.g. 212661512283' },
      { key: 'contact.email', type: 'text', label: 'Main email' },
      { key: 'contact.email2', type: 'text', label: 'Second email (optional)' },
      { key: 'contact.address', type: 'i18n', multiline: true, label: 'Address', help: 'Use <br> for a line break.' },
      { key: 'contact.hours', type: 'i18n', multiline: true, label: 'Opening hours', help: 'Use <br> for a line break.' },
      { key: 'contact.instagram', type: 'text', label: 'Instagram link' },
      { key: 'contact.linkedin', type: 'text', label: 'LinkedIn link' },
    ] },
    { group: 'Homepage figures', fields: [
      { key: 'stats', type: 'list', label: 'Figures (4 recommended)', itemLabel: 'Figure', of: { type: 'object', fields: [
        { key: 'value', type: 'number', label: 'Number' },
        { key: 'suffix', type: 'text', label: 'After the number (e.g. + or %)' },
        { key: 'label', type: 'i18n', label: 'Label' },
      ] } },
    ] },
  ];

  const NEW = {
    work: () => ({ slug: '', name: 'New project', client: '', badge: '', featured: false, cardTitle: i18nEmpty(), tag: i18nEmpty(), categories: [],
      media: { video: '', poster: '', image: '' }, hero: { image: '', tags: [], subtitle: i18nEmpty() },
      intro: { label: { fr: 'Contexte & Objectifs', en: 'Context & Objectives' }, heading: i18nEmpty(), paragraphs: [i18nEmpty()] },
      facts: [{ label: { fr: 'Client', en: 'Client' }, value: i18nEmpty() }], sections: [], kpis: [], seo: { description: i18nEmpty() } }),
    insights: () => ({ slug: '', featured: false, category: 'strategy', tag: i18nEmpty(), title: { fr: 'Nouvel article', en: 'New article' }, excerpt: i18nEmpty(),
      date: new Date().toISOString().slice(0, 10), readMinutes: 5, image: '', imageAlt: '', heroImage: '', blocks: [{ type: 'paragraph', text: i18nEmpty() }],
      cta: { title: i18nEmpty(), text: i18nEmpty(), button: { fr: 'Parler à un expert', en: 'Talk to an expert' } }, seo: { description: i18nEmpty() } }),
  };

  const VIEWS = {
    work: { title: 'Work', hint: 'Case studies — homepage cards, portfolio and case pages.', list: true, schema: WORK },
    insights: { title: 'Insights', hint: 'Articles — Insights page and article pages.', list: true, schema: INSIGHTS },
    site: { title: 'Site info', hint: 'Contact details (footer, contact page, menu) and homepage figures.', list: false, schema: SITE },
  };

  // ------------------------------------------------------------------ state
  const state = { view: 'work', store: {}, sel: { work: 0, insights: 0 }, previews: {} };
  const cur = () => state.store[state.view];
  function markDirty() { cur().dirty = true; $('#dirty').hidden = false; $('#publish').disabled = false; }
  function setClean() { cur().dirty = false; $('#dirty').hidden = true; $('#publish').disabled = true; }
  window.addEventListener('beforeunload', (e) => { if (Object.values(state.store).some((s) => s.dirty)) { e.preventDefault(); e.returnValue = ''; } });

  // ------------------------------------------------------------------ field renderers
  function textInput(value, onChange, opts = {}) {
    const el = h(opts.multiline ? 'textarea' : 'input', { type: opts.multiline ? null : (opts.inputType || 'text'), value: value ?? '', placeholder: opts.placeholder || '' });
    el.addEventListener('input', () => { onChange(opts.inputType === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value); markDirty(); });
    return el;
  }
  function counter(el, max) {
    const c = h('div', { class: 'help' });
    const upd = () => (c.textContent = `${el.value.length} / ~${max} characters`);
    el.addEventListener('input', upd); upd();
    return c;
  }

  function renderField(f, obj, rerender) {
    const val = getPath(obj, f.key);
    const set = (v) => setPath(obj, f.key, v);
    const wrap = h('div', { class: 'field' });
    const label = f.label ? h('label', { class: 'field-label', text: f.label + (f.required ? ' *' : '') }) : null;

    if (f.type === 'bool') {
      const cb = h('input', { type: 'checkbox', checked: !!val, onchange: (e) => { set(e.target.checked); markDirty(); rerender && rerender('list'); } });
      wrap.append(h('label', { class: 'check' }, cb, f.label));
    } else if (f.type === 'text' || f.type === 'number' || f.type === 'date') {
      const inp = textInput(val, (v) => { set(v); if (f.key === 'name') rerender && rerender('list'); }, { inputType: f.type });
      wrap.append(label, inp);
    } else if (f.type === 'slug') {
      const inp = textInput(val, (v) => set(v));
      inp.addEventListener('blur', () => { inp.value = slugify(inp.value); set(inp.value); });
      const gen = h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { inp.value = slugify(plain(getPath(obj, f.from))); set(inp.value); markDirty(); } }, icon('fa-solid fa-wand-magic-sparkles'), 'From title');
      wrap.append(label, h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('span', { class: 'muted', text: 'dazzlea.agency' + f.prefix }), inp, gen));
      f.help = f.help || 'Lowercase letters, numbers and dashes. Changing it changes the page link.';
    } else if (f.type === 'i18n') {
      const v = val && typeof val === 'object' ? val : i18nEmpty();
      if (!val || typeof val !== 'object') set(v);
      const mk = (lang) => {
        const inp = textInput(v[lang], (x) => { v[lang] = x; if (f.key === 'title') rerender && rerender('list'); }, { multiline: f.multiline });
        const box = h('div', {}, inp, h('span', { class: 'lang', text: lang.toUpperCase() }));
        if (f.counter) box.append(counter(inp, f.counter));
        return box;
      };
      wrap.append(label, h('div', { class: 'i18n' }, mk('en'), mk('fr')));
    } else if (f.type === 'select') {
      const s = h('select', { onchange: (e) => { set(e.target.value); markDirty(); } }, f.options.map(([v, t]) => h('option', { value: v, text: t })));
      s.value = val || f.options[0][0];
      wrap.append(label, s);
    } else if (f.type === 'multi') {
      const arr = Array.isArray(val) ? val : []; if (!Array.isArray(val)) set(arr);
      wrap.append(label, h('div', { class: 'chips' }, f.options.map(([v, t]) => h('label', {},
        h('input', { type: 'checkbox', checked: arr.includes(v), onchange: (e) => { const i = arr.indexOf(v); if (e.target.checked && i < 0) arr.push(v); if (!e.target.checked && i >= 0) arr.splice(i, 1); markDirty(); } }), t))));
    } else if (f.type === 'image') {
      wrap.append(label, imageField(val, set));
    } else if (f.type === 'list') {
      wrap.append(listField(f, obj, rerender));
    } else if (f.type === 'blocks') {
      wrap.append(label, blocksField(obj, f.key));
    }
    if (f.help && f.type !== 'list') wrap.append(h('div', { class: 'help', text: f.help }));
    return wrap;
  }

  function renderFields(fields, obj, rerender) { return fields.map((f) => renderField(f, obj, rerender)); }

  // ---- image field: preview + link + upload
  const isVideo = (u) => /\.(mp4|webm)(\?|$)/i.test(u || '');
  function setPreview(box, url) {
    box.replaceChildren(); box.style.backgroundImage = '';
    const src = state.previews[url] || url;
    if (!url) { box.append(icon('fa-regular fa-image')); return; }
    if (isVideo(url)) box.append(h('video', { src, muted: true, autoplay: true, loop: true, playsinline: true }));
    else box.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
  }
  function imageField(val, set) {
    const prev = h('div', { class: 'img-prev' });
    const url = h('input', { type: 'text', value: val || '', placeholder: 'Paste an image link, or upload →' });
    url.addEventListener('input', () => { set(url.value.trim()); setPreview(prev, url.value.trim()); markDirty(); });
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', hidden: true });
    const up = h('button', { type: 'button', class: 'btn btn-sm', onclick: () => file.click() }, icon('fa-solid fa-upload'), 'Upload photo');
    const clear = h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { url.value = ''; set(''); setPreview(prev, ''); markDirty(); } }, 'Remove');
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      up.disabled = true; up.lastChild.textContent = 'Uploading…';
      try {
        const { data, type, dataUrl } = await prepareImage(f);
        const r = await api('/api/upload', { method: 'POST', body: JSON.stringify({ name: f.name, type, data }) });
        state.previews[r.path] = dataUrl;
        url.value = r.path; set(r.path); setPreview(prev, r.path); markDirty();
        toast('Photo uploaded. Click “Save & publish” to put it on the site.');
      } catch (e) { toast(e.message, true); }
      up.disabled = false; up.lastChild.textContent = 'Upload photo'; file.value = '';
    });
    setPreview(prev, val);
    return h('div', { class: 'img-field' }, prev, h('div', { class: 'img-tools' }, url, h('div', { class: 'row' }, up, clear), file,
      h('div', { class: 'help', text: 'Large photos are automatically resized (max 2000 px) before upload.' })));
  }
  async function prepareImage(file) {
    const readURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
    if (file.type === 'image/gif') { const u = await readURL(file); return { data: u.split(',')[1], type: file.type, dataUrl: u }; }
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('This file could not be read as an image')); i.src = URL.createObjectURL(file); });
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const keepPng = file.type === 'image/png' && file.size < 600 * 1024; // logos / transparency
    const type = keepPng ? 'image/png' : 'image/jpeg';
    let q = 0.85, u = c.toDataURL(type, q);
    while (!keepPng && u.length > 3.8e6 && q > 0.5) { q -= 0.1; u = c.toDataURL(type, q); }
    return { data: u.split(',')[1], type, dataUrl: u };
  }

  // ---- generic list of items
  function itemControls(arr, i, redraw) {
    const mv = (d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; markDirty(); redraw(); };
    return [
      h('button', { type: 'button', class: 'icon-btn', title: 'Move up', onclick: () => mv(-1), disabled: i === 0 }, icon('fa-solid fa-arrow-up')),
      h('button', { type: 'button', class: 'icon-btn', title: 'Move down', onclick: () => mv(1), disabled: i === arr.length - 1 }, icon('fa-solid fa-arrow-down')),
      h('button', { type: 'button', class: 'icon-btn btn-danger', title: 'Delete', onclick: () => { if (confirm('Delete this item?')) { arr.splice(i, 1); markDirty(); redraw(); } } }, icon('fa-solid fa-trash')),
    ];
  }
  function listField(f, obj, rerender) {
    let arr = getPath(obj, f.key); if (!Array.isArray(arr)) { arr = []; setPath(obj, f.key, arr); }
    const box = h('div', { class: 'list-field' });
    const redraw = () => {
      const items = arr.map((it, i) => {
        const summary = f.of.type === 'i18n' ? plain(it && (it.en || it.fr)) : plain((it.label && (it.label.en || it.label.fr)) || (it.heading && (it.heading.en || it.heading.fr)) || it.number || '');
        let body;
        if (f.of.type === 'i18n') {
          const holder = { v: it && typeof it === 'object' ? it : i18nEmpty() }; arr[i] = holder.v;
          body = renderField({ key: 'v', type: 'i18n', multiline: f.of.multiline }, holder);
        } else body = renderFields(f.of.fields, it, rerender);
        return h('div', { class: 'item-card' }, h('header', {}, h('b', { text: `${f.itemLabel} ${i + 1}${summary ? ' — ' + summary.slice(0, 60) : ''}` }), itemControls(arr, i, redraw)), h('div', { class: 'body' }, body));
      });
      box.replaceChildren(h('span', { class: 'field-label', text: f.label }), h('div', { class: 'items' }, items),
        h('button', { type: 'button', class: 'btn btn-sm', onclick: () => {
          arr.push(f.of.type === 'i18n' ? i18nEmpty() : blankFrom(f.of.fields)); markDirty(); redraw();
        } }, icon('fa-solid fa-plus'), `Add ${f.itemLabel.toLowerCase()}`));
    };
    redraw();
    return box;
  }
  function blankFrom(fields) {
    const o = {};
    fields.forEach((f) => setPath(o, f.key, f.type === 'i18n' ? i18nEmpty() : f.type === 'number' ? 0 : f.type === 'list' ? [] : ''));
    return o;
  }

  // ---- article blocks
  function blocksField(obj, key) {
    let arr = getPath(obj, key); if (!Array.isArray(arr)) { arr = []; setPath(obj, key, arr); }
    const box = h('div', { class: 'list-field' });
    const fieldsFor = (b) => {
      if (b.type === 'cards') return [{ key: 'items', type: 'list', label: 'Cards', itemLabel: 'Card', of: { type: 'object', fields: [{ key: 'title', type: 'i18n', label: 'Title' }, { key: 'text', type: 'i18n', multiline: true, label: 'Text' }] } }];
      if (b.type === 'image') return [{ key: 'image', type: 'image', label: 'Image' }, { key: 'caption', type: 'i18n', label: 'Caption (optional)' }];
      if (b.type === 'html') return [{ key: 'html', type: 'i18n', multiline: true, label: 'HTML', help: 'For advanced layouts only.' }];
      return [{ key: 'text', type: 'i18n', multiline: b.type !== 'heading', label: b.type === 'heading' ? 'Heading' : 'Text', help: b.type === 'heading' ? null : HTML_HELP }];
    };
    const redraw = () => {
      const items = arr.map((b, i) => {
        const sel = h('select', { class: 'btn-sm', style: 'width:auto', onchange: (e) => { b.type = e.target.value; if (b.type === 'cards' && !b.items) b.items = []; markDirty(); redraw(); } },
          BLOCK_TYPES.map(([v, t]) => h('option', { value: v, text: t })));
        sel.value = b.type || 'paragraph';
        const preview = plain((b.text && (b.text.en || b.text.fr)) || '');
        return h('div', { class: 'item-card' },
          h('header', {}, sel, h('b', { text: preview.slice(0, 70) }), itemControls(arr, i, redraw)),
          h('div', { class: 'body' }, renderFields(fieldsFor(b), b)));
      });
      const add = (type) => h('button', { type: 'button', class: 'btn btn-sm', onclick: () => {
        arr.push(type === 'cards' ? { type, items: [] } : type === 'image' ? { type, image: '', caption: i18nEmpty() } : { type, text: i18nEmpty() }); markDirty(); redraw();
      } }, icon('fa-solid fa-plus'), BLOCK_TYPES.find((x) => x[0] === type)[1]);
      box.replaceChildren(h('div', { class: 'items' }, items), h('div', { class: 'chips', style: 'margin-top:10px' }, add('paragraph'), add('heading'), add('quote'), add('image'), add('cards')));
    };
    redraw();
    return box;
  }

  // ------------------------------------------------------------------ views
  function renderGroups(schema, obj, rerender) {
    return schema.map((g) => h('fieldset', { class: 'group' }, h('legend', { text: g.group }), renderFields(g.fields, obj, rerender)));
  }

  function thumb(item) {
    const u = state.view === 'work' ? (item.media?.image || item.media?.poster || item.hero?.image) : (item.image || item.heroImage);
    return u && !isVideo(u) ? h('img', { src: state.previews[u] || u, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' });
  }

  function renderView() {
    const v = VIEWS[state.view];
    $('#viewTitle').textContent = v.title; $('#viewHint').textContent = v.hint;
    document.querySelectorAll('.side-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
    const s = cur();
    $('#dirty').hidden = !s.dirty; $('#publish').disabled = !s.dirty;
    const view = $('#view');

    if (!v.list) { view.replaceChildren(h('div', { class: 'editor' }, renderGroups(v.schema, s.data))); return; }

    const items = s.data;
    let sel = Math.min(state.sel[state.view], items.length - 1);
    const listBox = h('div', { class: 'list' });
    const editor = h('div', { class: 'editor' });

    const drawList = () => {
      listBox.replaceChildren(
        h('div', { class: 'list-head' }, h('b', { text: `${items.length} ${state.view === 'work' ? 'projects' : 'articles'}` }),
          h('button', { class: 'btn btn-sm btn-red', onclick: () => { items.unshift(NEW[state.view]()); state.sel[state.view] = 0; markDirty(); renderView(); } }, icon('fa-solid fa-plus'), 'New')),
        ...items.map((it, i) => {
          const title = state.view === 'work' ? it.name : plain(it.title?.en || it.title?.fr);
          const sub = state.view === 'work' ? (it.client || '') : (it.date || '');
          const badges = [];
          if (it.featured) badges.push(h('span', { class: 'badge', text: state.view === 'work' ? 'Home' : 'Featured' }));
          if (state.view === 'insights' && !(it.blocks || []).length) badges.push(h('span', { class: 'badge grey', text: 'Card only' }));
          return h('div', { class: 'list-item' + (i === sel ? ' active' : ''), onclick: () => { state.sel[state.view] = i; renderView(); } },
            thumb(it), h('div', { class: 't' }, h('b', { text: title || '(untitled)' }), h('small', { text: sub })), ...badges);
        }));
    };
    const drawEditor = () => {
      const it = items[sel];
      if (!it) { editor.replaceChildren(h('div', { class: 'empty', text: 'Nothing here yet. Click “New” to add one.' })); return; }
      const link = state.view === 'work' ? `/case-${it.slug}` : `/blog-${it.slug}`;
      editor.replaceChildren(
        h('div', { class: 'editor-head' },
          h('h3', { text: (state.view === 'work' ? it.name : plain(it.title?.en || it.title?.fr)) || '(untitled)' }),
          h('div', { class: 'editor-actions' },
            it.slug ? h('a', { class: 'btn btn-sm', href: link, target: '_blank', rel: 'noopener' }, icon('fa-solid fa-eye'), 'View page') : null,
            h('button', { class: 'btn btn-sm', onclick: () => { const c = clone(it); c.slug = c.slug ? c.slug + '-copy' : ''; if (state.view === 'work') c.name += ' (copy)'; items.splice(sel + 1, 0, c); state.sel[state.view] = sel + 1; markDirty(); renderView(); } }, icon('fa-regular fa-copy'), 'Duplicate'),
            h('button', { class: 'btn btn-sm', disabled: sel === 0, onclick: () => { [items[sel - 1], items[sel]] = [items[sel], items[sel - 1]]; state.sel[state.view] = sel - 1; markDirty(); renderView(); } }, icon('fa-solid fa-arrow-up'), 'Move up'),
            h('button', { class: 'btn btn-sm btn-danger', onclick: () => { if (confirm('Delete this item from the website?')) { items.splice(sel, 1); state.sel[state.view] = Math.max(0, sel - 1); markDirty(); renderView(); } } }, icon('fa-solid fa-trash'), 'Delete'))),
        ...renderGroups(VIEWS[state.view].schema, it, (what) => { if (what === 'list') drawList(); }));
    };
    drawList(); drawEditor();
    view.replaceChildren(h('div', { class: 'split' }, listBox, editor));
  }

  async function load(name) {
    if (state.store[name]) return;
    $('#view').replaceChildren(h('div', { class: 'empty', text: 'Loading…' }));
    const d = await api(`/api/content?name=${name}`);
    state.store[name] = { data: d.data, sha: d.sha, dirty: false };
  }

  async function switchView(name) {
    state.view = name;
    try { await load(name); renderView(); } catch (e) { handleErr(e); }
  }

  function handleErr(e) {
    if (e.status === 401) return showLogin();
    toast(e.message, true);
    $('#view').replaceChildren(h('div', { class: 'empty', text: e.message }));
  }

  // ------------------------------------------------------------------ publish + deploy tracking
  async function publish() {
    const name = state.view, s = cur(), btn = $('#publish');
    btn.disabled = true;
    try {
      const r = await api('/api/content', { method: 'PUT', body: JSON.stringify({ name, data: s.data, sha: s.sha }) });
      s.sha = r.sha; setClean();
      trackDeploy(r.commit);
    } catch (e) {
      btn.disabled = false;
      if (e.status === 401) { toast('Your session expired — sign in again (your edits are kept in this tab).', true); return showLogin(true); }
      toast(e.message, true);
    }
  }
  function trackDeploy(commit) {
    const box = $('#deploy'); box.hidden = false; box.className = 'deploy';
    box.replaceChildren(h('span', { class: 'spin' }), 'Saved. Publishing to the website… (usually under a minute)');
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const st = await api(`/api/content?status=${encodeURIComponent(commit)}`);
        if (st.state === 'success') {
          box.className = 'deploy ok';
          box.replaceChildren(icon('fa-solid fa-circle-check'), ' Live on the website. ', h('a', { href: '/', target: '_blank', rel: 'noopener', text: 'Open the site' }), ' (refresh if you still see the old version)');
          return;
        }
        if (st.state === 'failure' || st.state === 'error') {
          box.className = 'deploy err';
          box.replaceChildren(icon('fa-solid fa-triangle-exclamation'), ` Publishing failed: ${st.description || 'build error'}. Your content is saved; check the last edit and save again.`);
          return;
        }
      } catch {}
      if (tries < 60) setTimeout(poll, 5000);
      else box.replaceChildren(icon('fa-regular fa-clock'), ' Still publishing… check the website in a few minutes.');
    };
    setTimeout(poll, 4000);
  }

  // ------------------------------------------------------------------ auth
  let resumeAfterLogin = false;
  function showLogin(resume) {
    resumeAfterLogin = !!resume;
    $('#login').hidden = false;
    if (!resume) $('#app').hidden = true;
    $('#pw').focus();
  }
  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    if (!resumeAfterLogin) await switchView(state.view);
    resumeAfterLogin = false;
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try { await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#pw').value }) }); $('#pw').value = ''; start(); }
    catch (err) { $('#loginError').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => {
    if (Object.values(state.store).some((s) => s.dirty) && !confirm('You have unsaved changes. Sign out anyway?')) return;
    await api('/api/login', { method: 'DELETE' }).catch(() => {});
    state.store = {}; Object.values(state.store).forEach((s) => (s.dirty = false));
    showLogin();
  });
  document.querySelectorAll('.side-nav button').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
  $('#publish').addEventListener('click', publish);

  (async () => {
    try {
      const s = await api('/api/login');
      if (s.configError) { showLogin(); $('#loginError').textContent = 'Setup needed: ' + s.configError; return; }
      s.signedIn ? start() : showLogin();
    } catch { showLogin(); $('#loginError').textContent = 'The admin service is not reachable.'; }
  })();
})();
