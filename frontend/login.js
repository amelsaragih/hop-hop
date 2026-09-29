document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('password-toggle');
  const submitBtn = document.getElementById('submit-btn');
  const messageEl = document.getElementById('auth-message');
  const toggleText = document.getElementById('toggle-text');
  const toggleMode = document.getElementById('toggle-mode');
  const title = document.getElementById('auth-title-text');
  const titlePal = document.getElementById('title-pal');
  const subtitle = document.getElementById('auth-subtitle');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const modeSlider = document.querySelector('.mode-slider');
  const frogWrap = document.getElementById('frog-wrap');

  let mode = 'login';

  fetch('/api/me', { credentials: 'include' }).then(res => {
    if (res.ok) window.location.href = 'index.html';
  }).catch(() => {});

  function setMode(nextMode) {
    mode = nextMode;
    const register = mode === 'register';

    title.textContent = register ? "Let's meet!" : 'Welcome back!';
    titlePal.src = register ? 'assets/pals/lion.png' : 'assets/pals/shiba.png';
    titlePal.classList.remove('swap');
    void titlePal.offsetWidth;
    titlePal.classList.add('swap');
    subtitle.textContent = register
      ? 'Bikin akun dan mulai belajar bareng Hop Hop.'
      : 'Masuk lagi dan lanjut ngobrol sama Hop Hop.';
    submitBtn.querySelector('span').textContent = register ? 'Create my account!' : "Let's Hop!";
    toggleText.textContent = register ? 'Sudah punya akun?' : 'Belum punya akun?';
    toggleMode.textContent = register ? 'Login di sini' : 'Daftar di sini';

    loginTab.classList.toggle('active', !register);
    registerTab.classList.toggle('active', register);
    modeSlider.classList.toggle('register', register);
    messageEl.textContent = '';

    frogWrap.classList.remove('mode-bounce');
    void frogWrap.offsetWidth;
    frogWrap.classList.add('mode-bounce');
  }

  toggleMode.addEventListener('click', e => {
    e.preventDefault();
    setMode(mode === 'login' ? 'register' : 'login');
  });

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));

  passwordToggle.addEventListener('click', () => {
    const hidden = passwordInput.type === 'password';
    passwordInput.type = hidden ? 'text' : 'password';
    passwordToggle.textContent = hidden ? 'Hide' : 'Show';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) return;

    messageEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent =
      mode === 'login' ? 'Opening Hop Hop…' : 'Creating account…';

    try {
      const endpoint = mode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan.');

      frogWrap.classList.add('success-hop');
      setTimeout(() => { window.location.href = 'index.html'; }, 350);
    } catch (err) {
      messageEl.textContent = err.message || 'Tidak bisa terhubung ke server.';
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent =
        mode === 'login' ? "Let's Hop!" : 'Create my account!';
      frogWrap.classList.add('sad-bounce');
      setTimeout(() => frogWrap.classList.remove('sad-bounce'), 500);
    }
  });

  // Mata mengikuti cursor.
  const eyes = [...document.querySelectorAll('.frog-eye')];
  window.addEventListener('pointermove', e => {
    eyes.forEach(eye => {
      const rect = eye.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const distance = Math.min(7, Math.hypot(e.clientX - cx, e.clientY - cy) / 35);
      eye.style.setProperty('--look-x', `${Math.cos(angle) * distance}px`);
      eye.style.setProperty('--look-y', `${Math.sin(angle) * distance}px`);
    });
  });

  // Kedip random.
  setInterval(() => {
    document.body.classList.add('frog-blink');
    setTimeout(() => document.body.classList.remove('frog-blink'), 170);
  }, 3200);

  // Kepiting miring ke arah kursor (pelan, max 6 derajat).
  const crabCard = document.querySelector('.frog-card');
  window.addEventListener('pointermove', e => {
    if (!crabCard) return;
    const rect = crabCard.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
    crabCard.style.setProperty('--base', `rotate(${(-2 + dx * 12).toFixed(2)}deg)`);
  });

  // Sesekali hop kecil, sesekali jalan nyamping kayak kepiting.
  let tick = 0;
  setInterval(() => {
    if (document.hidden) return;
    const cls = (tick++ % 3 === 2) ? 'scuttle' : 'idle-hop';
    frogWrap.classList.add(cls);
    setTimeout(() => frogWrap.classList.remove(cls), 1050);
  }, 5200);
});
