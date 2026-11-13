(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

  $('#ano').textContent = new Date().getFullYear();

  /* ---------- hero: sunburst rays (decorative) ---------- */
  const rays = $('#rays');
  const NS = 'http://www.w3.org/2000/svg';
  const pt = (r, a) => [(r * Math.cos(a)).toFixed(2), (r * Math.sin(a)).toFixed(2)];
  for (let i = 0; i < 9; i++) {
    const a0 = (-200 + i * 22) * Math.PI / 180;
    const a1 = a0 + 16 * Math.PI / 180;
    const [x1, y1] = pt(48, a0), [x2, y2] = pt(98, a0 - .02), [x3, y3] = pt(98, a1 + .02), [x4, y4] = pt(48, a1);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}L${x4} ${y4}Z`);
    rays.appendChild(p);
  }

  /* ---------- hero: torn paper ---------- */
  const hero = $('.hero');
  const paper = $('#paper');
  const sheet = $('.hero__sheet');
  const EXTRA = .3; // paper extends above the hero so it can lift away
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const jitter = Array.from({ length: 90 }, () => rnd());
  const drawPaper = () => {
    const W = hero.offsetWidth, H = hero.offsetHeight, E = H * EXTRA;
    const mobile = W < 721;
    const yL = (mobile ? .36 : .56) * H + E; // tear height at left edge
    const yR = (mobile ? .24 : .26) * H + E; // tear height at right edge
    const n = jitter.length, pts = ['0px 0px', `${W}px 0px`];
    for (let i = 0; i <= n - 1; i++) {
      const t = 1 - i / (n - 1), x = t * W;
      const y = yL + (yR - yL) * t + (jitter[i] - .5) * H * .022;
      pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
    }
    sheet.style.clipPath = `polygon(${pts.join(',')})`;
  };
  paper.style.top = `-${EXTRA * 100}%`;
  paper.style.height = `${(1 + EXTRA) * 100}%`;
  drawPaper();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawPaper, 120); });

  /* ---------- word split ---------- */
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = tok;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  };
  $$('.split').forEach(splitWords);

  /* ---------- nav / menu ---------- */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  let lenis = null;
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- smooth scroll + GSAP ---------- */
  gsap.registerPlugin(ScrollTrigger);
  if (!reduced) {
    lenis = new Lenis({ lerp: .1, wheelMultiplier: .95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    lenis ? lenis.scrollTo(target, { offset: 0, duration: 1.4 }) : target.scrollIntoView();
  }));

  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 60);
      nav.classList.toggle('is-hidden', y > innerHeight && y > lastY + 4 && !menu.classList.contains('is-open'));
      if (y < lastY - 4) nav.classList.remove('is-hidden');
      lastY = y;
      gsap.set('.progress span', { scaleX: self.progress });
    }
  });

  /* intro */
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  if (!reduced) {
    intro
      .from('.hero__logo', { opacity: 0, y: 30, duration: 1.3 })
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.2, stagger: .12 }, '-=.9')
      .from('.hero__copy .eyebrow, .hero__lead, .hero__actions', { opacity: 0, y: 24, duration: 1, stagger: .1 }, '-=.8')
      .from('.hero__tag, .nav > *', { opacity: 0, duration: 1, stagger: .05 }, '-=.9');
  }

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* hero scroll: paper lifts away, sun turns, copy drifts */
    const h = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .6 } });
    h.to(paper, { y: () => -hero.offsetHeight * EXTRA, ease: 'none' }, 0)
     .to('.hero__logo', { y: -60, opacity: 0, ease: 'none' }, 0)
     .to('.hero__sun', { rotation: 50, y: 70, ease: 'none' }, 0)
     .to('.hero__copy', { y: -50, ease: 'none' }, 0);

    /* text + blocks reveal */
    $$('.split').forEach((el) => {
      gsap.from($$('.w > span', el), {
        yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: .04,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
    ScrollTrigger.batch('.reveal', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .12 })
    });

    /* insta + map subtle depth */
    gsap.fromTo('.insta__frame', { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.insta', scrub: true } });
  });

  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 721px)', () => {
    /* gallery: pinned horizontal scroll with image parallax */
    const track = $('#track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
    const slide = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.gallery__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    $$('[data-par]', track).forEach((img) => {
      gsap.fromTo(img, { xPercent: -5, scale: 1.14 }, {
        xPercent: 5, scale: 1.14, ease: 'none',
        scrollTrigger: { trigger: img.closest('.shot'), containerAnimation: slide, start: 'left right', end: 'right left', scrub: true }
      });
    });
    gsap.set('[data-par]', { height: '100%' });
  });

  mm.add('(prefers-reduced-motion: no-preference) and (max-width: 720px)', () => {
    $$('[data-par]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: img.closest('.shot'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  });

  /* ---------- custom cursor (mouse only) ---------- */
  if (finePointer) {
    doc.classList.add('has-cursor');
    const cur = $('.cursor'), label = $('.cursor__label');
    const dotX = gsap.quickTo('.cursor__dot', 'x', { duration: .08, ease: 'power3' });
    const dotY = gsap.quickTo('.cursor__dot', 'y', { duration: .08, ease: 'power3' });
    const ringX = gsap.quickTo('.cursor__ring', 'x', { duration: reduced ? .1 : .45, ease: 'power3' });
    const ringY = gsap.quickTo('.cursor__ring', 'y', { duration: reduced ? .1 : .45, ease: 'power3' });
    let seen = false;
    addEventListener('mousemove', (e) => {
      if (!seen) { seen = true; gsap.set(['.cursor__dot', '.cursor__ring'], { x: e.clientX, y: e.clientY }); }
      dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY);
    }, { passive: true });
    const setState = (t) => {
      const c = t.closest ? t.closest('[data-cursor]') : null;
      const mode = c ? c.dataset.cursor : '';
      cur.classList.toggle('is-hidden', mode === 'none');
      cur.classList.toggle('is-view', !!mode && mode !== 'none');
      if (mode && mode !== 'none') label.textContent = mode;
      cur.classList.toggle('is-link', !mode && !!t.closest('a,button,.magnetic'));
    };
    addEventListener('mouseover', (e) => setState(e.target), { passive: true });
    doc.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    doc.addEventListener('mouseenter', () => cur.classList.remove('is-hidden'));

    /* magnetic buttons */
    if (!reduced) {
      $$('.magnetic').forEach((el) => {
        const qx = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3' });
        const qy = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' });
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          qx((e.clientX - r.left - r.width / 2) * .3);
          qy((e.clientY - r.top - r.height / 2) * .4);
        });
        el.addEventListener('mouseleave', () => { qx(0); qy(0); });
      });
    }
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
