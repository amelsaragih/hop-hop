document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const chatForm = $('chat-form');
  const userInput = $('user-input');
  const chatBox = $('chat-box');
  const logoutBtn = $('logout-btn');
  const usernameLabel = $('username-label');
  let conversationHistory = [];
  let progressLoaded = false;
  let quiz = { questions: [], index: 0, score: 0, answered: false };

  function escapeHtml(text) {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function formatModelResponse(text) {
    return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
  }
  function addMessage(sender, text, thinking = false) {
    const row = document.createElement('div'); row.className = `message-row ${sender}`;
    if (sender === 'bot') {
      const avatar = document.createElement('div'); avatar.className = 'message-avatar';
      avatar.innerHTML = '<img src="assets/hophop-avatar.png" alt="Hop Hop">'; row.appendChild(avatar);
    }
    const bubble = document.createElement('div'); bubble.className = `message ${sender}-message${thinking ? ' thinking' : ''}`;
    bubble.innerHTML = sender === 'bot' ? formatModelResponse(text) : escapeHtml(text);
    row.appendChild(bubble); chatBox.appendChild(row); chatBox.scrollTop = chatBox.scrollHeight; return bubble;
  }

  async function checkLogin() {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) { window.location.href = 'login.html'; return false; }
    const data = await res.json(); usernameLabel.textContent = `Hi, ${data.username}`; return true;
  }

  function showSection(name) {
    document.querySelectorAll('.agent-section').forEach(s => s.classList.toggle('active', s.id === `section-${name}`));
    document.querySelectorAll('.menu-tile').forEach(b => b.classList.toggle('active', b.dataset.section === name));
    if (name === 'progress' && !progressLoaded) loadProgress();
    if (name === 'practice') resetQuizView();
    history.replaceState(null, '', `#${name}`);
  }

  document.querySelectorAll('[data-section]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault(); showSection(el.dataset.section);
  }));

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' }); window.location.href = 'login.html';
  });

  async function sendChat(prefilled = null) {
    const userMessage = (prefilled ?? userInput.value).trim(); if (!userMessage) return;
    addMessage('user', userMessage); conversationHistory.push({ role: 'user', text: userMessage }); userInput.value = '';
    const thinking = addMessage('bot', '', true); thinking.innerHTML = 'Hop Hop is thinking<span class="dots">...</span>';
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ conversation: conversationHistory }) });
      if (response.status === 401) { window.location.href = 'login.html'; return; }
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Server error');
      thinking.innerHTML = formatModelResponse(data.result); thinking.classList.remove('thinking'); conversationHistory.push({ role: 'model', text: data.result });
      progressLoaded = false;
    } catch (error) {
      console.error(error); thinking.classList.remove('thinking'); thinking.classList.add('error'); thinking.textContent = 'Aduh, Hop Hop kehilangan koneksi 😭 Coba kirim lagi ya!';
    }
  }

  chatForm.addEventListener('submit', e => { e.preventDefault(); sendChat(); });
  document.querySelectorAll('.quick-prompts button').forEach(btn => btn.addEventListener('click', () => sendChat(btn.dataset.prompt)));

  addMessage('bot', 'Hi! Aku Hop Hop ✨\n\nAku bukan cuma chatbot. Aku bisa mengingat kesalahan belajar kamu, membaca progress, dan menyesuaikan latihan berdasarkan kelemahanmu.\n\nCoba kirim kalimat bahasa Inggris atau tanya: “progress aku gimana?”');

  function renderCategories(items) {
    const el = $('category-list'); if (!items?.length) { el.innerHTML = '<p class="empty">Belum cukup data untuk membaca weakness.</p>'; return; }
    const max = Math.max(...items.map(x => x.jumlah), 1);
    el.innerHTML = items.map(x => `<div class="category-row"><div><b>${escapeHtml(x.kategori)}</b><span>${x.jumlah} mistake${x.jumlah > 1 ? 's' : ''}</span></div><div class="bar"><i style="width:${Math.max(10, x.jumlah / max * 100)}%"></i></div></div>`).join('');
  }
  function renderMistakes(items) {
    const el = $('mistakes-list'); if (!items?.length) { el.innerHTML = '<p class="empty">Belum ada kesalahan yang tercatat.</p>'; return; }
    el.innerHTML = items.map(x => `<div class="mistake-item"><div><span class="mistake-tag">${escapeHtml(x.kategori || 'grammar')}</span><p class="wrong">${escapeHtml(x.kata)}</p><p class="right">→ ${escapeHtml(x.koreksi)}</p></div><small>${x.sudah_direview ? 'reviewed' : 'needs review'}</small></div>`).join('');
  }
  function renderHistory(items) {
    const el = $('quiz-history'); if (!items?.length) { el.innerHTML = '<p class="empty">Belum ada quiz.</p>'; return; }
    el.innerHTML = items.map(x => `<div class="history-item"><b>${x.score}/${x.total}</b><span>${escapeHtml(x.topic)}</span><small>${new Date(x.tanggal).toLocaleDateString('id-ID')}</small></div>`).join('');
  }

  async function loadProgress() {
    try {
      const res = await fetch('/api/progress', { credentials: 'include' }); if (res.status === 401) return (window.location.href = 'login.html');
      const data = await res.json(); if (!res.ok) throw new Error(data.message);
      $('stat-total').textContent = data.stats.totalKesalahan; $('stat-review').textContent = data.stats.jumlahKataPerluDireview; $('stat-reviewed').textContent = data.stats.sudahDireview; $('stat-focus').textContent = data.profile.fokusUtama;
      renderCategories(data.stats.kategori); renderMistakes(data.stats.detailKesalahanTerakhir); renderHistory(data.quizHistory); progressLoaded = true;
    } catch (e) { console.error(e); }
  }
  $('refresh-progress').addEventListener('click', () => { progressLoaded = false; loadProgress(); });

  function resetQuizView() {
    $('quiz-start-card').classList.remove('hidden'); $('quiz-card').classList.add('hidden'); $('quiz-result').classList.add('hidden'); quiz = { questions: [], index: 0, score: 0, answered: false };
  }
  function renderQuestion() {
    const q = quiz.questions[quiz.index]; quiz.answered = false; $('quiz-card').classList.remove('hidden'); $('quiz-start-card').classList.add('hidden'); $('quiz-result').classList.add('hidden');
    $('quiz-count').textContent = `Question ${quiz.index + 1} / ${quiz.questions.length}`; $('quiz-score').textContent = `Score: ${quiz.score}`; $('quiz-question').textContent = q.question; $('quiz-explanation').classList.add('hidden'); $('next-question').classList.add('hidden');
    $('quiz-options').innerHTML = q.options.map((option, i) => `<button class="quiz-option" data-index="${i}">${String.fromCharCode(65 + i)}. ${escapeHtml(option)}</button>`).join('');
    $('quiz-options').querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => answerQuestion(Number(btn.dataset.index))));
  }
  function answerQuestion(selected) {
    if (quiz.answered) return; quiz.answered = true; const q = quiz.questions[quiz.index]; const correct = selected === Number(q.answer); if (correct) quiz.score++;
    document.querySelectorAll('.quiz-option').forEach((btn, i) => { btn.disabled = true; if (i === Number(q.answer)) btn.classList.add('correct'); if (i === selected && !correct) btn.classList.add('wrong-answer'); });
    $('quiz-score').textContent = `Score: ${quiz.score}`; $('quiz-explanation').textContent = q.explanation || (correct ? 'Nice! ✨' : 'Coba ingat lagi pola kalimatnya.'); $('quiz-explanation').classList.remove('hidden');
    if (quiz.index < quiz.questions.length - 1) $('next-question').classList.remove('hidden'); else finishQuiz();
  }
  async function finishQuiz() {
    const total = quiz.questions.length; await fetch('/api/quiz/finish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ score: quiz.score, total, topic: 'adaptive review' }) });
    const percent = Math.round(quiz.score / total * 100); $('quiz-result').innerHTML = `<div class="result-emoji">${percent >= 80 ? '🎉' : percent >= 60 ? '✨' : '🌱'}</div><h3>Quiz selesai!</h3><p>Kamu dapat <b>${quiz.score}/${total}</b> (${percent}%). ${percent >= 80 ? 'Mantap, lanjut challenge!' : 'Bagus, review lagi bagian yang masih goyah.'}</p><button class="primary-mini" id="retry-quiz">Try another review</button>`; $('quiz-result').classList.remove('hidden'); $('quiz-card').classList.add('hidden'); progressLoaded = false; $('retry-quiz').addEventListener('click', startQuiz);
  }
  $('next-question').addEventListener('click', () => { quiz.index++; renderQuestion(); });
  async function startQuiz() {
    $('start-quiz').disabled = true; $('start-quiz').textContent = 'Hop Hop is preparing…';
    try {
      const res = await fetch('/api/quiz/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ count: 5 }) }); const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Quiz belum bisa dibuat'); quiz.questions = data.questions || []; quiz.index = 0; quiz.score = 0; renderQuestion();
    } catch (e) { alert(e.message); resetQuizView(); } finally { $('start-quiz').disabled = false; $('start-quiz').textContent = 'Start adaptive quiz ✦'; }
  }
  $('start-quiz').addEventListener('click', startQuiz);

  checkLogin().then(ok => {
    if (!ok) return;
    const hash = location.hash.replace('#', ''); if (['chat', 'progress', 'practice', 'pals'].includes(hash)) showSection(hash);
  });
});
