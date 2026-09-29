// Interaksi karakter: klik = lompat + hati muncul, dan sesekali ada yang iseng lompat sendiri.
(function () {
  const HEARTS = ['💖', '✨', '💗', '🌸', '⭐'];

  function burst(x, y) {
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('span');
      el.className = 'pal-burst';
      el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
      el.style.left = x - 10 + 'px';
      el.style.top = y - 10 + 'px';
      el.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
      el.style.setProperty('--rot', (Math.random() * 60 - 30) + 'deg');
      el.style.animationDelay = (i * 45) + 'ms';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }

  function popPal(el) {
    if (el.classList.contains('pop')) return;
    el.classList.add('pop');
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.25);
    el.addEventListener('animationend', () => el.classList.remove('pop'), { once: true });
  }

  function init() {
    const pals = Array.from(document.querySelectorAll('.pal'));
    pals.forEach(el => el.addEventListener('click', () => popPal(el)));

    // Kepiting maskot di login: klik = lompat + hati.
    const crab = document.querySelector('.frog-card');
    const wrap = document.getElementById('frog-wrap');
    if (crab && wrap) {
      crab.addEventListener('click', () => {
        const r = crab.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height * 0.2);
        wrap.classList.remove('success-hop');
        void wrap.offsetWidth;
        wrap.classList.add('success-hop');
        setTimeout(() => wrap.classList.remove('success-hop'), 550);
      });
    }

    // Iseng: tiap beberapa detik salah satu karakter lompat sendiri.
    if (!pals.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(() => {
      if (document.hidden) return;
      const visible = pals.filter(p => p.offsetParent !== null);
      if (!visible.length) return;
      const el = visible[Math.floor(Math.random() * visible.length)];
      if (!el.classList.contains('pop')) {
        el.classList.add('pop');
        el.addEventListener('animationend', () => el.classList.remove('pop'), { once: true });
      }
    }, 4500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
