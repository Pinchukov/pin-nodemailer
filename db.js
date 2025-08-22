import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error('DB query error:', err);
    throw err;
  }
}

// Новые функции сброса статусов
export async function resetStatusByEmail(email) {
  try {
    const result = await query(
      `UPDATE emails SET status='pending', retry_count=0, last_error=NULL, sent_at=NULL WHERE email = ?`,
      [email]
    );
    console.log(`Статус для электронной почты сброшен на «ожидание»: ${email}`);
    return result;
  } catch (err) {
    console.error(`Ошибка сброса статуса электронной почты ${email}:`, err);
    throw err;
  }
}

export async function resetStatusById(id) {
  try {
    const result = await query(
      `UPDATE emails SET status='pending', retry_count=0, last_error=NULL, sent_at=NULL WHERE id = ?`,
      [id]
    );
    console.log(`Статус идентификатора электронной почты сброшен на «ожидание»: ${id}`);
    return result;
  } catch (err) {
    console.error(`Ошибка сброса статуса идентификатора электронной почты ${id}:`, err);
    throw err;
  }
}
