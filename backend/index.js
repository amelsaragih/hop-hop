import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createUser, findUserByUsername, verifyPassword } from './auth.js';
import {
  addMistake,
  getStats,
  getQuizWords,
  getUnreviewedMistakes,
  markMistakesReviewed,
  getLearningProfile,
  getRecentMistakes,
  saveQuizAttempt,
  getQuizHistory,
} from './progress-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ganti-secret-ini-di-env',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
}));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ message: 'Belum login' });
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'hop-hop-agent' }));

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username & password wajib diisi' });
    if (username.length < 3 || username.length > 30) return res.status(400).json({ message: 'Username harus 3–30 karakter' });
    if (password.length < 6) return res.status(400).json({ message: 'Password minimal 6 karakter' });
    if (await findUserByUsername(username)) return res.status(409).json({ message: 'Username sudah dipakai' });
    const user = await createUser(username, password);
    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json({ username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal registrasi' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);
    if (!user || !verifyPassword(user, password)) return res.status(401).json({ message: 'Username atau password salah' });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal login' });
  }
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ message: 'Logout berhasil' })));

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Belum login' });
  res.json({ username: req.session.username });
});

const SYSTEM_INSTRUCTION = `
Kamu adalah Hop Hop, kepiting merah kecil yang lucu, hangat, suportif, dan menjadi AI English Learning Agent milik user.
Tujuanmu bukan sekadar menjawab chat, tetapi membantu user belajar secara PERSONAL berdasarkan riwayat belajar mereka.

CARA BERTINDAK:
1. Pahami dulu maksud pesan user. Bedakan chat biasa, pertanyaan belajar, kalimat latihan, permintaan progress, dan permintaan quiz.
2. Jika user mengirim kalimat/frasa bahasa Inggris sebagai latihan dan ada kesalahan grammar/kosakata, koreksi secara natural. Untuk kesalahan baru, WAJIB panggil simpanKataSalah.
3. Saat menyimpan kesalahan, isi kategori yang spesifik seperti grammar, vocabulary, tense, preposition, article, sentence-structure, atau lainnya. Isi penjelasan singkat.
4. Jika user bertanya tentang progress, kelemahan, atau kesalahan sebelumnya, WAJIB panggil ambilProfilBelajar atau ambilStatistik sebelum menjawab.
5. Jika user meminta latihan/quiz dari kesalahan sebelumnya, panggil buatQuizDariKesalahan lalu buat soal yang benar-benar menggunakan data hasil tool. Jangan mengarang seolah data itu berasal dari database.
6. Jika user meminta saran belajar, ambil profil belajar terlebih dahulu supaya saran personal.
7. Jangan menyebut istilah function calling, tool, database, API, atau proses internal kepada user.
8. Jangan menganggap setiap kalimat bahasa Inggris sebagai pertanyaan. Jika jelas pertanyaan, jawab pertanyaannya.
9. Gunakan bahasa Indonesia yang santai dan mudah dipahami, tetapi contoh bahasa Inggris tetap benar.
10. Jangan terlalu panjang. Untuk koreksi, format sederhana: Corrected sentence, alasan, lalu contoh singkat.
11. Kalau user hanya ngobrol biasa, tetap boleh ngobrol sebagai Hop Hop tanpa memaksa koreksi.
12. Kamu boleh menyarankan next step seperti review 3 menit, quiz, atau latihan sesuai kelemahan user.
`;

const tools = [{ functionDeclarations: [
  {
    name: 'simpanKataSalah',
    description: 'Simpan kesalahan bahasa Inggris baru milik user agar bisa dipelajari lagi.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        kata: { type: Type.STRING, description: 'Kalimat/kata asli user yang salah' },
        koreksi: { type: Type.STRING, description: 'Versi yang benar' },
        kategori: { type: Type.STRING, description: 'Kategori kesalahan, misalnya grammar, tense, vocabulary, preposition, article' },
        penjelasan: { type: Type.STRING, description: 'Penjelasan singkat kenapa salah' },
      },
      required: ['kata', 'koreksi', 'kategori', 'penjelasan'],
    },
  },
  {
    name: 'ambilStatistik',
    description: 'Ambil statistik progress dan daftar kesalahan terbaru user.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'ambilProfilBelajar',
    description: 'Ambil profil kelemahan belajar user untuk memberi rekomendasi personal.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'buatQuizDariKesalahan',
    description: 'Ambil beberapa kesalahan yang belum direview untuk dijadikan latihan adaptif.',
    parameters: {
      type: Type.OBJECT,
      properties: { jumlahSoal: { type: Type.NUMBER, description: 'Jumlah soal, 3 sampai 10' } },
    },
  },
]}];

function buildAvailableFunctions(userId) {
  return {
    simpanKataSalah: async ({ kata, koreksi, kategori, penjelasan }) => {
      const saved = await addMistake(userId, kata, koreksi, kategori, penjelasan);
      return { status: 'tersimpan', id: saved.id };
    },
    ambilStatistik: async () => getStats(userId),
    ambilProfilBelajar: async () => getLearningProfile(userId),
    buatQuizDariKesalahan: async ({ jumlahSoal = 5 }) => {
      const kataUntukQuiz = await getQuizWords(userId, jumlahSoal);
      return kataUntukQuiz.length
        ? { kataUntukQuiz }
        : { pesan: 'Belum ada kesalahan yang belum direview.' };
    },
  };
}

function normalizeConversation(conversation) {
  return conversation
    .filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
    .slice(-24)
    .map(({ role, text }) => ({ role, parts: [{ text: text.slice(0, 4000) }] }));
}

async function handleChat(userId, conversation) {
  const contents = normalizeConversation(conversation);
  if (!contents.length) throw new Error('Conversation kosong');
  const availableFunctions = buildAvailableFunctions(userId);
  let response;

  for (let step = 0; step < 6; step++) {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: { temperature: 0.75, systemInstruction: SYSTEM_INSTRUCTION, tools },
    });

    const calls = response.functionCalls;
    if (!calls?.length) break;

    for (const call of calls) {
      const fn = availableFunctions[call.name];
      const result = fn ? await fn(call.args || {}) : { error: 'Fungsi tidak ditemukan' };
      contents.push({ role: 'model', parts: [{ functionCall: call }] });
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] });
    }
  }

  return response?.text || 'Hop Hop belum punya jawaban. Coba ulangi ya!';
}

app.post('/api/chat', requireLogin, async (req, res) => {
  try {
    const { conversation } = req.body;
    if (!Array.isArray(conversation)) return res.status(400).json({ message: 'Conversation harus berupa array' });
    const result = await handleChat(req.session.userId, conversation);
    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Hop Hop gagal memproses pesan' });
  }
});

app.get('/api/progress', requireLogin, async (req, res) => {
  try {
    const [stats, profile, quizHistory] = await Promise.all([
      getStats(req.session.userId),
      getLearningProfile(req.session.userId),
      getQuizHistory(req.session.userId),
    ]);
    res.json({ stats, profile, quizHistory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil progress' });
  }
});

app.get('/api/mistakes', requireLogin, async (req, res) => {
  try {
    res.json({ mistakes: await getRecentMistakes(req.session.userId, req.query.limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil riwayat kesalahan' });
  }
});

app.post('/api/quiz/start', requireLogin, async (req, res) => {
  try {
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 3), 10);
    const source = await getUnreviewedMistakes(req.session.userId, count);
    if (!source.length) return res.status(404).json({ message: 'Belum ada kesalahan yang bisa direview. Chat dulu dengan Hop Hop!' });

    const prompt = `Buat ${source.length} soal latihan bahasa Inggris berdasarkan data kesalahan berikut.\n${JSON.stringify(source)}\n\nKembalikan JSON array saja dengan format [{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"...","source":"..."}]. answer adalah index jawaban benar. Jangan membuat soal di luar data kelemahan tersebut.`;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        systemInstruction: 'Kamu membuat quiz English yang aman untuk pemula/intermediate. JSON valid saja.',
      },
    });

    let questions;
    try { questions = JSON.parse(response.text); } catch { questions = []; }
    if (!Array.isArray(questions) || !questions.length) return res.status(500).json({ message: 'Gagal membuat quiz' });
    await markMistakesReviewed(source.map(x => x.id));
    res.json({ questions: questions.map((q, i) => ({ ...q, id: i + 1 })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Gagal membuat quiz' });
  }
});

app.post('/api/quiz/finish', requireLogin, async (req, res) => {
  try {
    const { score, total, topic = 'adaptive review' } = req.body;
    await saveQuizAttempt(req.session.userId, score, total, topic);
    res.json({ saved: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menyimpan hasil quiz' });
  }
});

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Hop Hop Agent ready on http://localhost:${PORT}`));
