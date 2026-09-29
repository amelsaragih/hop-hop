// Menu tersembunyi: klik tombol Menu untuk buka/tutup.
(function () {
  const btn = document.getElementById('menu-btn');
  const panel = document.getElementById('menu-panel');
  if (!btn || !panel) return;

  function setOpen(open) {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.menu-label').textContent = open ? 'Tutup' : 'Menu';
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!panel.classList.contains('open'));
  });
  document.addEventListener('click', e => { if (!panel.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  panel.querySelectorAll('[data-section]').forEach(el => el.addEventListener('click', () => setOpen(false)));
})();
