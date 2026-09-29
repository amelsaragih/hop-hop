import pool from './db.js';

export async function addMistake(userId, kata, koreksi, kategori = 'grammar', penjelasan = '') {
  const [result] = await pool.query(
    `INSERT INTO mistakes (user_id, kata, koreksi, kategori, penjelasan, tanggal, sudah_direview)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [userId, kata, koreksi, kategori, penjelasan, new Date()]
  );
  return { id: result.insertId };
}

export async function getStats(userId) {
  const [[totalRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM mistakes WHERE user_id = ?', [userId]
  );
  const [[unreviewedRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM mistakes WHERE user_id = ? AND sudah_direview = 0', [userId]
  );
  const [[reviewedRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM mistakes WHERE user_id = ? AND sudah_direview = 1', [userId]
  );
  const [rows] = await pool.query(
    `SELECT id, kata, koreksi, kategori, penjelasan, tanggal, sudah_direview
     FROM mistakes WHERE user_id = ? ORDER BY id DESC LIMIT 8`, [userId]
  );
  const [categoryRows] = await pool.query(
    `SELECT kategori, COUNT(*) AS jumlah FROM mistakes
     WHERE user_id = ? GROUP BY kategori ORDER BY jumlah DESC`, [userId]
  );

  return {
    totalKesalahan: Number(totalRow.total),
    jumlahKataPerluDireview: Number(unreviewedRow.total),
    sudahDireview: Number(reviewedRow.total),
    detailKesalahanTerakhir: rows,
    kategori: categoryRows.map(r => ({ kategori: r.kategori, jumlah: Number(r.jumlah) })),
  };
}

export async function getRecentMistakes(userId, limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);
  const [rows] = await pool.query(
    `SELECT id, kata, koreksi, kategori, penjelasan, tanggal, sudah_direview
     FROM mistakes WHERE user_id = ? ORDER BY id DESC LIMIT ${safeLimit}`,
    [userId]
  );
  return rows;
}

export async function getUnreviewedMistakes(userId, jumlah = 5) {
  const safeJumlah = Math.min(Math.max(Number(jumlah) || 5, 1), 10);
  const [rows] = await pool.query(
    `SELECT id, kata, koreksi, kategori, penjelasan FROM mistakes
     WHERE user_id = ? AND sudah_direview = 0 ORDER BY id DESC LIMIT ${safeJumlah}`,
    [userId]
  );
  return rows;
}

export async function markMistakesReviewed(ids = []) {
  const cleanIds = ids.map(Number).filter(Number.isInteger);
  if (!cleanIds.length) return;
  const placeholders = cleanIds.map(() => '?').join(',');
  await pool.query(`UPDATE mistakes SET sudah_direview = 1 WHERE id IN (${placeholders})`, cleanIds);
}

export async function getQuizWords(userId, jumlah = 5) {
  const safeJumlah = Math.min(Math.max(Number(jumlah) || 5, 1), 10);
  const [rows] = await pool.query(
    `SELECT id, kata, koreksi, kategori, penjelasan FROM mistakes
     WHERE user_id = ? AND sudah_direview = 0 ORDER BY id DESC LIMIT ${safeJumlah}`,
    [userId]
  );

  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`UPDATE mistakes SET sudah_direview = 1 WHERE id IN (${placeholders})`, ids);
  }

  return rows;
}

export async function getLearningProfile(userId) {
  const stats = await getStats(userId);
  const [categoryRows] = await pool.query(
    `SELECT kategori, COUNT(*) AS jumlah FROM mistakes
     WHERE user_id = ? GROUP BY kategori ORDER BY jumlah DESC`, [userId]
  );
  const focus = categoryRows[0]?.kategori || 'grammar dasar';
  return {
    totalKesalahan: stats.totalKesalahan,
    belumDireview: stats.jumlahKataPerluDireview,
    fokusUtama: focus,
    kategori: categoryRows.map(r => ({ kategori: r.kategori, jumlah: Number(r.jumlah) })),
    kesalahanTerbaru: stats.detailKesalahanTerakhir.slice(0, 5),
  };
}

export async function saveQuizAttempt(userId, score, total, topic = 'review') {
  await pool.query(
    `INSERT INTO quiz_attempts (user_id, score, total, topic, tanggal)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, Number(score) || 0, Number(total) || 0, topic, new Date()]
  );
}

export async function getQuizHistory(userId, limit = 6) {
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 20);
  const [rows] = await pool.query(
    `SELECT score, total, topic, tanggal FROM quiz_attempts
     WHERE user_id = ? ORDER BY id DESC LIMIT ${safeLimit}`,
    [userId]
  );
  return rows;
}
