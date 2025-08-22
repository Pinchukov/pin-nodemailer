import dotenv from 'dotenv';
dotenv.config();

import { importEmails, exportEmails } from './importExport.js';
import { retryFailedEmails, sendPendingEmails } from './retrySender.js';
import { filterLogs } from './logger.js';
import { resetStatusByEmail, resetStatusById } from './db.js';
import { query } from './db.js';

export async function runCommand(cmd, args) {
  switch (cmd) {
    case 'import':
      await importEmails();
      break;
    case 'export':
      await exportEmails();
      break;
    case 'send':
      await sendPendingEmails();
      await retryFailedEmails();
      break;
    case 'logs':
      const options = {};
      if (args.length) {
        args.forEach(arg => {
          const [key, value] = arg.split('=');
          if (key === 'dateFrom') options.dateFrom = new Date(value);
          if (key === 'dateTo') options.dateTo = new Date(value);
          if (key === 'status') options.status = value.toUpperCase();
        });
      }
      const logs = filterLogs(options);
      logs.forEach(line => console.log(line));
      break;
    case 'reset':
      if (args.length === 0) {
        console.log('Specify email or id to reset status, например: reset email=user@mail.com или reset id=15');
        break;
      }
      for (const arg of args) {
        const [key, value] = arg.split('=');
        if (key === 'email') {
          await resetStatusByEmail(value);
          console.log(`Status reset for email: ${value}`);
        } else if (key === 'id') {
          await resetStatusById(Number(value));
          console.log(`Status reset for email id: ${value}`);
        } else {
          console.log(`Unknown reset parameter: ${key}`);
        }
      }
      break;
    case 'list':
      try {
        const users = await query(`SELECT id, email, status, retry_count, sent_at FROM emails ORDER BY id`);
        if (users.length === 0) {
          console.log('Нет писем в базе.');
        } else {
          console.table(users);
        }
      } catch (err) {
        console.error('Ошибка при получении списка писем:', err.message);
      }
      break;
    default:
      console.log('Unknown command. Use import, export, send, logs, reset, list');
  }
}
