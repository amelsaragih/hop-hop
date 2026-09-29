import bcrypt from 'bcryptjs';
import pool from './db.js';

export async function createUser(username, password) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
        [username, passwordHash, new Date()]
    );
    return { id: result.insertId, username };
}

export async function findUserByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
}

export function verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
}