import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query, pool } from './db.js';
import { log } from './logger.js';

const importFilePath = process.env.EMAILS_IMPORT_FILE || './data/dataImport.js';
const exportFilePath = process.env.EMAILS_EXPORT_FILE || './data/export.json';

// Функция для динамического импорта JS-модулей, если файл заканчивается на .js
async function loadDataImport(filePath) {
  if (filePath.endsWith('.js')) {
    const absolutePath = path.resolve(filePath);
    const module = await import(absolutePath);
    if (typeof module.dataImport === 'function') {
      return await module.dataImport();
    } else {
      throw new Error('В модуле импорта нет экспортированной функции dataImport');
    }
  } else if (filePath.endsWith('.json')) {
    // Читаем JSON как обычно
    const dataRaw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(dataRaw);
  } else {
    throw new Error('Неподдерживаемый формат файла импорта');
  }
}

export async function importEmails() {
  try {
    const data = await loadDataImport(importFilePath);

    if (!Array.isArray(data) || data.length === 0) {
      log('Нет подходящих email для импорта.', 'WARN');
      return;
    }

    const BATCH_SIZE = 1000;
    let importedCount = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const valuesArray = batch.map(entry => [
        entry.email,
        entry.title,
        entry.text,
        'pending',
        0,
        entry.file || null,
      ]);
      const placeholders = valuesArray.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = valuesArray.flat();

      const insertSql = `
        INSERT INTO emails (email, title, text, status, retry_count, file)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE title=VALUES(title), text=VALUES(text), file=VALUES(file)
      `;
      await query(insertSql, values);

      importedCount += batch.length;
      log(`Импортирован батч из ${batch.length} email, всего импортировано: ${importedCount}`);
    }

    log(`Успешно импортировано всего ${importedCount} email из файла ${importFilePath}`);
  } catch (err) {
    log(`Ошибка импорта: ${err.message}`, 'ERROR');
  } finally {
    await pool.end();
    log('Пул подключений к базе данных закрыт.');
  }
}

export async function exportEmails() {
  try {
    const rows = await query('SELECT email, title, text, file FROM emails');

    const data = {
      emails: rows
    };

    await fs.promises.writeFile(exportFilePath, JSON.stringify(data, null, 2), 'utf-8');
    log(`Экспортировано ${rows.length} email в файл ${exportFilePath}`);
  } catch (err) {
    log(`Ошибка экспорта: ${err.message}`, 'ERROR');
  }
}
