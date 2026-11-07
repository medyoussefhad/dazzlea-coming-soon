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

  // Apply saved or default language on load
  const savedLang = localStorage.getItem('dzzLang') || 'fr';
  if (langBtns.length > 0) {
    applyLang(savedLang);
  }

  /* ── Scroll Reveal (IntersectionObserver) ──── */
  const revealEls = document.querySelectorAll('.reveal-fade-up');

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

})();
