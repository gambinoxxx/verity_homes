/* Verity Homes — shared behaviour for the static design references.
   In the Next.js build each block becomes a small client component. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('loaded');

  /* Header, scroll progress, back-to-top */
  const header = document.getElementById('header');
  const prog = document.getElementById('progress');
  const toTop = document.getElementById('toTop');
  const onScroll = () => {
    const y = scrollY;
    header && header.classList.toggle('scrolled', y > 40);
    toTop && toTop.classList.toggle('show', y > 700);
    const h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop && toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* Active nav link (set by <body data-page="...">) */
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav a, .drawer nav a').forEach(a => {
    if (a.dataset.page === page) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
  });

  /* Mobile drawer */
  const drawer = document.getElementById('drawer');
  const openBtn = document.getElementById('menuOpen');
  const setDrawer = open => {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    openBtn && openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  openBtn && openBtn.addEventListener('click', () => setDrawer(true));
  const closeBtn = document.getElementById('menuClose');
  closeBtn && closeBtn.addEventListener('click', () => setDrawer(false));
  drawer && drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));

  /* Toggle groups: [data-toggle-group] buttons behave like radio pills */
  document.querySelectorAll('[data-toggle-group]').forEach(g => {
    const btns = [...g.querySelectorAll('button')];
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const f = b.dataset.f, target = g.dataset.toggleGroup && document.querySelector(g.dataset.toggleGroup);
      if (target && f) target.querySelectorAll('[data-t]').forEach(c => c.classList.toggle('hide', f !== 'all' && c.dataset.t !== f));
    }));
  });

  /* Save (heart) buttons */
  document.querySelectorAll('.prop-fav').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  }));

  /* Mobile filters toggle */
  const mf = document.getElementById('mobileFilter');
  const fc = document.getElementById('filtersCard');
  if (mf && fc) mf.addEventListener('click', () => {
    const hidden = fc.hasAttribute('hidden-mobile');
    hidden ? fc.removeAttribute('hidden-mobile') : fc.setAttribute('hidden-mobile', '');
    mf.setAttribute('aria-expanded', String(hidden));
  });

  /* Gallery lightbox */
  const lb = document.getElementById('lightbox');
  if (lb) {
    const shots = [...document.querySelectorAll('[data-shot]')];
    const img = lb.querySelector('img'), count = lb.querySelector('.lb-count');
    let i = 0, last = null;
    const show = n => { i = (n + shots.length) % shots.length; const s = shots[i].querySelector('img'); img.src = s.src; img.alt = s.alt; count.textContent = (i + 1) + ' / ' + shots.length; };
    const open = n => { last = document.activeElement; show(n); lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; last && last.focus(); };
    shots.forEach((s, n) => s.addEventListener('click', () => open(n)));
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', () => show(i - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
  }

  /* Demo forms: check required fields, show success (real submit = server action) */
  document.querySelectorAll('form[data-demo]').forEach(f => { f.noValidate = true; }); document.querySelectorAll('form[data-demo]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const req = [...f.querySelectorAll('[required]')];
    let bad = null;
    req.forEach(r => { const ok = r.value.trim() !== ''; r.style.borderColor = ok ? '' : '#B42318'; r.setAttribute('aria-invalid', String(!ok)); if (!ok && !bad) bad = r; });
    if (bad) { bad.focus(); return; }
    const ok = f.querySelector('.form-ok'); ok && ok.classList.add('show');
    f.reset();
  }));

  /* Scroll reveal */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .reveal-img').forEach(el => io.observe(el));
})();
