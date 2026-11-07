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

    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      mobileToggle.classList.toggle('open', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen);
    });

    document.querySelectorAll('.mobile-nav-item').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        mobileToggle.classList.remove('open');
      });
    });
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

  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      localStorage.setItem('dzzLang', lang);
      applyLang(lang);
    });
  });

  // Apply saved or default language on load (English-first)
  const savedLang = localStorage.getItem('dzzLang') || 'en';
  if (langBtns.length > 0) {
    applyLang(savedLang);
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
    let seen = false;
    try { seen = sessionStorage.getItem('dzzIntro') === '1'; } catch (e) {}

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

})();
