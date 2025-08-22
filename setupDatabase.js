import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import { log } from './logger.js';

export async function setupDatabase() {
  try {
    // Соединение без указания базы, чтобы создать базу, если нет
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    log(`База данных '${process.env.DB_NAME}' создана или уже существует.`);

    await connection.end();

    // Создаем пул подключений с уже созданной базой
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Создаем таблицу emails
    const createEmailsTableSQL = `
      CREATE TABLE IF NOT EXISTS emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255),
        text TEXT,
        status ENUM('pending', 'sending', 'sent', 'failed') DEFAULT 'pending',
        sent_at DATETIME DEFAULT NULL,
        file VARCHAR(255) NULL,
        retry_count INT DEFAULT 0,
        last_error TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createEmailsTableSQL);
    log('Таблица `emails` проверена и создана при необходимости.');

    // Закрываем пул после создания
    await pool.end();
  } catch (err) {
    log(`Ошибка при создании базы данных или таблицы: ${err.message}`, 'ERROR');
    throw err;
  }
}
