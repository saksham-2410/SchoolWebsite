// Shared behavior across all pages: mobile nav, scroll reveal, scroll-top, active nav link.
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const hbg = document.getElementById('hbg');
  const mobNav = document.getElementById('mob-nav');
  if (hbg && mobNav) {
    hbg.addEventListener('click', () => {
      hbg.classList.toggle('open');
      mobNav.classList.toggle('open');
      document.body.style.overflow = mobNav.classList.contains('open') ? 'hidden' : '';
    });
    mobNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hbg.classList.remove('open');
        mobNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Scroll-to-top button
  const stBtn = document.getElementById('scroll-top');
  if (stBtn) {
    window.addEventListener('scroll', () => {
      stBtn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });
    stBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Reveal on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => observer.observe(el));

  // Active nav link based on current page filename
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links > li > a, .mob-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href.split('#')[0] === path) a.classList.add('active');
  });

  // Generic tab switching (used on disclosure.html, students.html, etc.)
  function activateTab(btn) {
    const scope = btn.closest('.tabs').parentElement;
    const tabKey = btn.dataset.tab;
    scope.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    scope.querySelectorAll('.tab-pnl').forEach(p => {
      p.classList.toggle('active', p.id === 'tab-' + tabKey);
    });
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn));
  });

  // Open the matching tab when arriving via a hash link (e.g. students.html#clubs)
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
    if (targetBtn) activateTab(targetBtn);
  }
});
