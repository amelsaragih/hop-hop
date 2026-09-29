import mysql from 'mysql2/promise';
import 'dotenv/config.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'english_chatbot',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mistakes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      kata TEXT NOT NULL,
      koreksi TEXT NOT NULL,
      kategori VARCHAR(80) NOT NULL DEFAULT 'grammar',
      penjelasan TEXT NULL,
      tanggal DATETIME NOT NULL,
      sudah_direview TINYINT(1) NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Upgrade aman untuk database lama yang sudah punya tabel mistakes.
  const [columns] = await pool.query('SHOW COLUMNS FROM mistakes');
  const names = new Set(columns.map(c => c.Field));
  if (!names.has('kategori')) {
    await pool.query("ALTER TABLE mistakes ADD COLUMN kategori VARCHAR(80) NOT NULL DEFAULT 'grammar'");
  }
  if (!names.has('penjelasan')) {
    await pool.query('ALTER TABLE mistakes ADD COLUMN penjelasan TEXT NULL');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      score INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0,
      topic VARCHAR(120) NOT NULL DEFAULT 'review',
      tanggal DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

await initTables();

export default pool;
