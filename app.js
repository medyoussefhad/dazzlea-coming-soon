/* =============================================
   DAZZLEA AGENCY — app.js
   Handles: Sticky nav, Mobile menu, Mega-menu,
   Language switcher, Scroll reveal, Hero reveal,
   Smooth scroll, Active nav, Marquee pause,
   Counter animation, Portfolio filter,
   Contact form success
   ============================================= */

(function () {
  'use strict';

  /* ── Sticky Nav ────────────────────────────── */
  const header = document.getElementById('mainHeader');

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile Menu Toggle ────────────────────── */
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileNav    = document.getElementById('mobileNavPanel');

  if (mobileToggle && mobileNav) {
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.setAttribute('aria-controls', mobileNav.id);

    const setMenu = (isOpen) => {
      mobileNav.classList.toggle('open', isOpen);
      mobileToggle.classList.toggle('open', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen);
      document.documentElement.classList.toggle('menu-open', isOpen);
    };

    mobileToggle.addEventListener('click', () => setMenu(!mobileNav.classList.contains('open')));

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMenu(false));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) setMenu(false); });
  }

  /* ── Mega-menu ─────────────────────────────── */
  const megaItems = document.querySelectorAll('.nav-has-mega');
  let megaTimeout = null;

  function openMega(item) {
    clearTimeout(megaTimeout);
    megaItems.forEach(other => {
      if (other !== item) other.classList.remove('mega-open');
    });
    item.classList.add('mega-open');
  }

  function scheduleCloseMega(item) {
    megaTimeout = setTimeout(() => {
      item.classList.remove('mega-open');
    }, 180);
  }

  megaItems.forEach(item => {
    const panel = item.querySelector('.mega-menu-panel');

    item.addEventListener('mouseenter', () => openMega(item));
    item.addEventListener('mouseleave', () => scheduleCloseMega(item));

    // Keyboard support: open on focus-in anywhere inside the item,
    // close when focus moves outside both the trigger and the panel.
    item.addEventListener('focusin', () => openMega(item));
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) {
        scheduleCloseMega(item);
      }
    });

    if (panel) {
      panel.addEventListener('mouseenter', () => {
        clearTimeout(megaTimeout);
      });

      panel.addEventListener('mouseleave', () => scheduleCloseMega(item));
    }
  });

  // Close mega-menu on outside click, or Escape key
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-has-mega')) {
      megaItems.forEach(item => item.classList.remove('mega-open'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      megaItems.forEach(item => item.classList.remove('mega-open'));
    }
  });

  /* ── Language Switcher ─────────────────────── */
  const langBtns = document.querySelectorAll('.lang-btn');

  function applyLang(lang) {
    // Update button active states
    langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.documentElement.setAttribute('lang', lang);

    // Swap all translatable elements
    document.querySelectorAll('[data-fr]').forEach(el => {
      const val = lang === 'fr' ? el.dataset.fr : (el.dataset.en || '');
      if (!val) return;
      if (val.includes('<')) {
        el.innerHTML = val; // developer-authored strings only, no user input
      } else {
        el.textContent = val;
      }
    });
  }

  // Each language has its own URL (/ = English, /fr/ = French). The page is already
  // rendered in its language; the switch goes to the other version of the same page.
  const pageLang = document.documentElement.getAttribute('lang') === 'fr' ? 'fr' : 'en';
  const storeLang = (l) => { try { localStorage.setItem('dzzLang', l); } catch (e) {} };

  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      storeLang(lang);
      if (btn.dataset.href && lang !== pageLang) {
        window.location.href = btn.dataset.href + window.location.hash;
        return;
      }
      applyLang(lang);
    });
  });

  if (langBtns.length > 0) {
    langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === pageLang));
    // pages without a generated alternate (e.g. local preview of source files) fall back to in-place swap
    if (!document.querySelector('.lang-btn[data-href]')) {
      let saved = 'en';
      try { saved = localStorage.getItem('dzzLang') || 'en'; } catch (e) {}
      applyLang(saved);
    }
  }

  /* ── Scroll Reveal (IntersectionObserver) ──── */
  const revealEls = document.querySelectorAll('.reveal-fade-up, .stacked-statement');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  /* ── Hero staggered text reveal on load ─────── */
  window.addEventListener('load', () => {
    const heroEls = document.querySelectorAll('.hero-section .reveal-fade-up');
    heroEls.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('is-visible');
      }, 300 + i * 200);
    });
  });

  /* ── Smooth scroll for anchor links ─────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = header ? header.offsetHeight + 12 : 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── Active nav link on scroll ───────────────── */
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navItems = document.querySelectorAll('.nav-item');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navItems.forEach(item => {
            item.classList.toggle(
              'active-nav',
              item.getAttribute('href') === `#${id}`
            );
          });
        }
      });
    },
    { threshold: 0.35 }
  );

  sections.forEach(sec => sectionObserver.observe(sec));

  /* ── Pause marquee & autoplaying video on reduced motion ─── */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReduced.matches) {
    document.querySelectorAll('.marquee-up, .marquee-down').forEach(el => {
      el.style.animationPlayState = 'paused';
    });
    document.querySelectorAll('video[autoplay]').forEach(video => {
      video.removeAttribute('autoplay');
      video.pause();
      video.setAttribute('controls', '');
    });
  } else {
    /* ── Lazy-load & lazy-play background videos ────────────
       Autoplaying videos only fetch/play once scrolled into view,
       instead of every card on the page loading & decoding at once. */
    const bgVideos = document.querySelectorAll('video[autoplay]');

    bgVideos.forEach(video => {
      video.removeAttribute('autoplay');
      video.preload = 'none';
    });

    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    bgVideos.forEach(video => videoObserver.observe(video));
  }

  /* ── Parallax on scroll (subtle depth) ──────── */
  if (!prefersReduced.matches) {
    const parallaxEls = document.querySelectorAll('[data-parallax]');
    if (parallaxEls.length) {
      let ticking = false;
      const update = () => {
        const vh = window.innerHeight;
        parallaxEls.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > vh) return;
          const speed = parseFloat(el.dataset.parallax) || 0.12;
          const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
          el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
        });
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
      }, { passive: true });
      update();
    }
  }

  /* ── Counter Animation ───────────────────────── */
  const statsSection = document.querySelector('.stats-section');

  if (statsSection) {
    let countersTriggered = false;

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !countersTriggered) {
            countersTriggered = true;
            counterObserver.disconnect();

            document.querySelectorAll('.stat-number').forEach(el => {
              const target = parseInt(el.dataset.target, 10);
              if (isNaN(target)) return;

              const duration = 1800;
              const interval = 16;
              const steps = Math.ceil(duration / interval);
              let currentStep = 0;

              const timer = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = Math.round(eased * target);
                el.textContent = value;

                if (currentStep >= steps) {
                  clearInterval(timer);
                  el.textContent = target;
                }
              }, interval);
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    counterObserver.observe(statsSection);
  }

  /* ── Language Toggle ─────────────────────────── */
  // (handled above in Language Switcher section)

  /* ── What We Do: hover-reveal discipline images ── */
  const discItems = document.querySelectorAll('.discipline-item');
  const discVisual = document.querySelector('.discipline-visual-img');
  if (discItems.length && discVisual) {
    discItems.forEach(item => {
      const activate = () => {
        const img = item.dataset.img;
        if (img && !discVisual.src.endsWith(img)) {
          discVisual.style.opacity = '0';
          setTimeout(() => { discVisual.src = img; discVisual.style.opacity = '1'; }, 180);
        }
        discItems.forEach(i => i.classList.toggle('is-active', i === item));
      };
      item.addEventListener('mouseenter', activate);
      item.addEventListener('focusin', activate);
    });
  }

  /* ── Insights Filter ─────────────────────────── */
  const insightBtns = document.querySelectorAll('.insight-filter-btn');
  const insightCards = document.querySelectorAll('.article-card, .article-card-featured');
  if (insightBtns.length) {
    insightBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        insightBtns.forEach(b => b.classList.toggle('active', b === btn));
        insightCards.forEach(card => {
          const match = cat === 'all' || card.dataset.cat === cat;
          card.classList.toggle('hidden', !match);
        });
      });
    });
  }

  /* ── Portfolio Filter ────────────────────────── */
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  function applyFilter(filter) {
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));

    portfolioCards.forEach(card => {
      if (filter === 'all') {
        card.classList.remove('hidden');
      } else {
        const categories = (card.dataset.category || '').split(' ');
        card.classList.toggle('hidden', !categories.includes(filter));
      }
    });
  }

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
    });

    // Honor ?filter= from links elsewhere on the site (e.g. the mega-menu)
    const params = new URLSearchParams(window.location.search);
    const requestedFilter = params.get('filter');
    if (requestedFilter && document.querySelector(`.filter-btn[data-filter="${requestedFilter}"]`)) {
      applyFilter(requestedFilter);
    }
  }

  /* ── Scroll progress bar ─────────────────────── */
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ── Generic counters ([data-count]) ─────────── */
  const countEls = document.querySelectorAll('[data-count]');
  if (countEls.length) {
    const fmt = (n) => n.toLocaleString('en-US');
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        countObserver.unobserve(el);
        const target = parseInt(el.dataset.count, 10);
        if (prefersReduced.matches) { el.textContent = fmt(target); return; }
        const start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / 1600, 1);
          el.textContent = fmt(Math.round((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    countEls.forEach(el => countObserver.observe(el));
  }

  /* ── Site entry: curtain intro + spotlight hero ── */
  const hx = document.querySelector('.hx');
  if (hx) {
    const intro = document.getElementById('intro');
    const root = document.documentElement;
    const startHero = () => hx.classList.add('is-in');
    // Play the curtain every time the site is opened (new visit or refresh);
    // skip it only when coming back to the homepage from another page of the site.
    let seen = false;
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      const fromSite = document.referrer && new URL(document.referrer).host === location.host;
      seen = !!fromSite && !(nav && nav.type === 'reload');
    } catch (e) {}

    if (!intro || seen || prefersReduced.matches) {
      if (intro) intro.remove();
      root.classList.remove('intro-lock');
      requestAnimationFrame(startHero);
    } else {
      root.classList.add('intro-lock');
      const countEl = intro.querySelector('.intro-count span');
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / 1600, 1);
        countEl.textContent = String(Math.round((1 - Math.pow(1 - p, 2)) * 100)).padStart(2, '0');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const finish = () => {
        if (intro.classList.contains('is-open')) return;
        intro.classList.add('is-open');
        try { sessionStorage.setItem('dzzIntro', '1'); } catch (e) {}
        setTimeout(startHero, 380);
        setTimeout(() => { intro.remove(); root.classList.remove('intro-lock'); }, 1300);
      };
      setTimeout(finish, 2000);
      intro.addEventListener('click', finish);
    }

    // Spotlight: follows the mouse, drifts on its own otherwise
    let cx = 0, cy = 0, tx = 0, ty = 0, following = false;
    const sizeNow = () => hx.getBoundingClientRect();
    { const r = sizeNow(); cx = tx = r.width * 0.68; cy = ty = r.height * 0.42; }
    hx.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = sizeNow();
      following = true;
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      hx.style.setProperty('--tx', `${((tx / r.width) - 0.5) * -14}px`);
      hx.style.setProperty('--ty', `${((ty / r.height) - 0.5) * -10}px`);
    });
    hx.addEventListener('pointerleave', () => {
      following = false;
      hx.style.setProperty('--tx', '0px'); hx.style.setProperty('--ty', '0px');
    });
    if (!prefersReduced.matches) {
      const loop = (t) => {
        if (window.scrollY < window.innerHeight) {
          if (!following) {
            const r = sizeNow();
            tx = r.width * (0.66 + 0.2 * Math.sin(t / 2700));
            ty = r.height * (0.42 + 0.17 * Math.sin(t / 1900));
          }
          cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
          hx.style.setProperty('--sx', `${cx.toFixed(1)}px`);
          hx.style.setProperty('--sy', `${cy.toFixed(1)}px`);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // Rotating word (language-aware)
    const rot = hx.querySelector('.hx-rotator');
    const word = rot && rot.querySelector('.hx-word');
    if (rot && word && !prefersReduced.matches) {
      const en = rot.dataset.wordsEn.split('|');
      const fr = rot.dataset.wordsFr.split('|');
      let i = 0;
      setInterval(() => {
        i = (i + 1) % en.length;
        word.classList.remove('in');
        word.classList.add('out');
        setTimeout(() => {
          const isFr = root.getAttribute('lang') === 'fr';
          word.dataset.en = en[i]; word.dataset.fr = fr[i];
          word.textContent = isFr ? fr[i] : en[i];
          word.classList.remove('out');
          word.classList.add('in');
        }, 460);
      }, 2700);
    }

    // Dazzle sparkles
    const sp = hx.querySelector('.hx-sparkles');
    if (sp && !prefersReduced.matches) {
      for (let k = 0; k < 22; k++) {
        const s = document.createElement('span');
        if (k % 4 === 0) s.className = 'star';
        s.style.left = `${38 + Math.random() * 60}%`;
        s.style.top = `${8 + Math.random() * 74}%`;
        s.style.setProperty('--s', `${2 + Math.random() * 3}px`);
        s.style.setProperty('--d', `${2.4 + Math.random() * 3}s`);
        s.style.setProperty('--dl', `${Math.random() * 4}s`);
        sp.appendChild(s);
      }
    }
  }

  /* ── Mouse-follow glow on brand cards ────────── */
  document.querySelectorAll('.brand-card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ── Leads: one helper for the email gate, newsletter and contact form → /api/lead (mini CRM) ── */
  const isFrPage = () => document.documentElement.getAttribute('lang') === 'fr';
  window.dzzLead = function (payload) {
    const body = JSON.stringify({ ...payload, page: location.pathname, language: isFrPage() ? 'fr' : 'en' });
    try {
      return fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (e) { return Promise.resolve(); }
  };

  const FREE_MAIL = new Set(('gmail googlemail yahoo ymail rocketmail hotmail outlook live msn passport icloud me mac aol gmx mail email yandex ya '
    + 'protonmail proton pm tutanota tuta tutamail zoho yopmail mailinator guerrillamail sharklasers 10minutemail tempmail temp-mail '
    + 'trashmail dispostable getnada maildrop laposte orange wanadoo free sfr neuf bbox numericable caramail club-internet aliceadsl '
    + 'libero virgilio tiscali web t-online freenet menara iam inwi qq 163 126 sina naver daum hanmail rediffmail fastmail hushmail '
    + 'mail2world inbox lycos excite seznam wp o2 interia onet btinternet sky virginmedia talktalk comcast verizon att sbcglobal cox').split(' '));
  window.dzzIsWorkEmail = (email) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) && !FREE_MAIL.has(email.split('@')[1].split('.')[0].toLowerCase());

  /* ── References gate: professional email only (homepage, Work page, case studies) ── */
  const gateAreas = document.querySelectorAll('.gate-area');
  if (gateAreas.length) {
    const msg = {
      invalid: ['Entrez une adresse email valide.', 'Please enter a valid email address.'],
      free: ['Merci d’utiliser votre email professionnel (pas Gmail, Hotmail, Yahoo…).', 'Please use your work email (not Gmail, Hotmail, Yahoo…).'],
    };
    const t = (k) => msg[k][isFrPage() ? 0 : 1];
    const unlockAll = () => {
      try { localStorage.setItem('dzzWorkAccess', '1'); } catch (e) {}
      gateAreas.forEach((area) => {
        area.classList.add('is-unlocking');
        area.classList.remove('is-locked');
        setTimeout(() => area.classList.remove('is-unlocking'), 1400);
      });
    };
    document.querySelectorAll('.work-gate-form').forEach((form) => {
      const input = form.querySelector('input[type=email]');
      const err = form.parentElement.querySelector('.work-gate-error');
      const btn = form.querySelector('button');
      const fail = (k) => {
        err.textContent = t(k);
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        input.focus();
      };
      input.addEventListener('input', () => { err.textContent = ''; });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = input.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return fail('invalid');
        if (!window.dzzIsWorkEmail(email)) return fail('free');
        if (form.elements._gotcha && form.elements._gotcha.value) return; // bot
        err.textContent = '';
        btn.disabled = true;
        const domain = email.split('@')[1];
        await Promise.race([
          Promise.all([
            window.dzzLead({ source: 'gate', email, company: domain }),
            fetch('https://formspree.io/f/mgakdreb', {
              method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ email, _subject: 'Dazzlea — accès aux références (email pro)', source: 'References gate', page: location.href, domain }),
            }).catch(() => {}),
          ]),
          new Promise((r) => setTimeout(r, 4000)), // never keep the visitor waiting
        ]);
        btn.disabled = false;
        unlockAll();
      });
    });
  }

  /* ── Newsletter ── */
  document.querySelectorAll('.newsletter-form').forEach((form) => {
    const input = form.querySelector('input[type=email]');
    const note = form.parentElement.querySelector('.newsletter-msg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
        note.textContent = isFrPage() ? 'Entrez une adresse email valide.' : 'Please enter a valid email address.';
        note.className = 'newsletter-msg is-error';
        return;
      }
      if (form.elements._gotcha && form.elements._gotcha.value) return;
      form.querySelector('button').disabled = true;
      await window.dzzLead({ source: 'newsletter', email, company: window.dzzIsWorkEmail(email) ? email.split('@')[1] : '' });
      form.reset();
      form.querySelector('button').disabled = false;
      note.textContent = isFrPage() ? 'Merci ! Vous êtes inscrit(e). Rendez-vous dans votre boîte mail.' : 'Thank you! You’re subscribed — see you in your inbox.';
      note.className = 'newsletter-msg is-ok';
    });
  });

  /* ── Contact form → also copied into the CRM (Formspree still sends the email) ── */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', () => {
      const v = (n) => (contactForm.elements[n] ? String(contactForm.elements[n].value || '').trim() : '');
      if (!contactForm.checkValidity() || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v('email'))) return;
      window.dzzLead({
        source: 'contact', email: v('email').toLowerCase(), name: `${v('firstname')} ${v('lastname')}`.trim(), phone: v('phone'),
        company: v('organization'), profile: v('profile'), service: v('service'), message: v('message'),
      });
    }, true);
  }


  /* ── Client area (/espace-client/<key>): private brochures & presentations ── */
  const portal = document.getElementById('portalApp');
  if (portal) {
    const fr = isFrPage();
    const parts = location.pathname.split('/').filter(Boolean);
    const key = parts[parts.length - 1] !== 'espace-client' ? parts[parts.length - 1] : '';
    const state = document.getElementById('portalState');
    const T = (frTxt, enTxt) => (fr ? frTxt : enTxt);
    const pick = (o) => (o && (o[fr ? 'fr' : 'en'] || o[fr ? 'en' : 'fr'])) || '';
    const CAT = {
      brochure: T('Brochure', 'Brochure'), presentation: T('Présentation commerciale', 'Sales presentation'),
      'case-study': T('Étude de cas', 'Case study'), offer: T('Offre & tarifs', 'Offer & pricing'), other: T('Document', 'Document'),
    };
    const icon = (d) => {
      const t = `${d.contentType || ''} ${d.filename || ''}`.toLowerCase();
      if (/pdf/.test(t)) return 'fa-file-pdf';
      if (/powerpoint|presentation|\.pptx?\b|\.key\b/.test(t)) return 'fa-file-powerpoint';
      if (/word|\.docx?\b/.test(t)) return 'fa-file-word';
      if (/excel|sheet|\.xlsx?\b/.test(t)) return 'fa-file-excel';
      if (/image|\.(jpe?g|png|webp)\b/.test(t)) return 'fa-file-image';
      if (/video|\.mp4\b/.test(t)) return 'fa-file-video';
      if (/zip/.test(t)) return 'fa-file-zipper';
      return 'fa-file-lines';
    };
    const size = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} ${T('Mo', 'MB')}` : `${Math.max(1, Math.round(b / 1024))} ${T('Ko', 'KB')}`);
    const when = (iso) => { try { return new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

    // keep the secret key when switching language
    if (key) document.querySelectorAll('.lang-btn[data-href]').forEach((b) => { b.dataset.href = b.dataset.href.replace(/\/?$/, '/') + encodeURIComponent(key); });

    const card = (d) => {
      const a = el('a', 'portal-card');
      a.href = `/api/portal-file?k=${encodeURIComponent(key)}&id=${encodeURIComponent(d.id)}`;
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      const ic = el('span', 'portal-card-icon'); const i = el('i', `fa-solid ${icon(d)}`); i.setAttribute('aria-hidden', 'true'); ic.append(i);
      const body = el('span', 'portal-card-body');
      body.append(el('span', 'portal-card-cat', CAT[d.category] || CAT.other), el('span', 'portal-card-title', pick(d.title) || d.filename));
      if (pick(d.description)) body.append(el('span', 'portal-card-desc', pick(d.description)));
      body.append(el('span', 'portal-card-meta', [size(d.size), when(d.date)].filter(Boolean).join(' · ')));
      const go = el('span', 'portal-card-go'); go.append(el('span', '', T('Ouvrir', 'Open'))); const gi = el('i', 'fa-solid fa-arrow-up-right-from-square'); gi.setAttribute('aria-hidden', 'true'); go.append(gi);
      a.append(ic, body, go);
      return a;
    };

    const fail = (title, text) => {
      state.className = 'portal-state portal-state-error';
      state.replaceChildren();
      const i = el('i', 'fa-solid fa-lock'); i.setAttribute('aria-hidden', 'true');
      state.append(i, el('strong', '', title), el('span', '', text));
    };

    if (!key) {
      fail(T('Accès par lien privé', 'Private link required'), T('Cet espace est accessible uniquement via le lien personnel que nous vous avons envoyé. Contactez-nous pour le recevoir.', 'This area is only accessible through the personal link we sent you. Contact us to receive it.'));
    } else {
      fetch(`/api/portal?k=${encodeURIComponent(key)}`, { credentials: 'omit', referrerPolicy: 'no-referrer' })
        .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, d })))
        .then(({ ok, status, d }) => {
          if (!ok) {
            if (status === 404) return fail(T('Lien invalide ou expiré', 'Invalid or expired link'), T('Ce lien n’est plus actif. Contactez votre interlocuteur Dazzlea pour en recevoir un nouveau.', 'This link is no longer active. Contact your Dazzlea contact to receive a new one.'));
            return fail(T('Espace momentanément indisponible', 'Temporarily unavailable'), T('Merci de réessayer dans quelques minutes.', 'Please try again in a few minutes.'));
          }
          document.getElementById('portalClient').textContent = d.client.name;
          if (d.client.note) document.getElementById('portalNote').textContent = d.client.note;
          document.title = `${T('Espace client', 'Client area')} — ${d.client.name} | Dazzlea`;
          state.hidden = true;
          const personal = d.docs.filter((x) => x.personal);
          const shared = d.docs.filter((x) => !x.personal);
          if (personal.length) {
            const g = document.getElementById('portalPersonal'); g.hidden = false;
            g.querySelector('.portal-grid').append(...personal.map(card));
          }
          if (shared.length) {
            const g = document.getElementById('portalShared'); g.hidden = false;
            const grid = g.querySelector('.portal-grid');
            const cats = [...new Set(shared.map((x) => x.category || 'other'))];
            const draw = (c) => { grid.replaceChildren(...shared.filter((x) => !c || (x.category || 'other') === c).map(card)); };
            if (cats.length > 1) {
              const bar = g.querySelector('.portal-filters');
              const mk = (c, label) => { const b = el('button', 'portal-filter' + (c ? '' : ' active'), label); b.type = 'button'; b.addEventListener('click', () => { bar.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); draw(c); }); return b; };
              bar.append(mk('', T('Tout', 'All')), ...cats.map((c) => mk(c, CAT[c] || CAT.other)));
            }
            draw('');
          }
          if (!personal.length && !shared.length) {
            state.hidden = false; state.className = 'portal-state';
            state.replaceChildren(el('span', '', T('Vos documents arrivent bientôt.', 'Your documents are coming soon.')));
          }
        })
        .catch(() => fail(T('Espace momentanément indisponible', 'Temporarily unavailable'), T('Merci de réessayer dans quelques minutes.', 'Please try again in a few minutes.')));
    }
  }

})();
