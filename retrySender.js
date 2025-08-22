import path from 'path';
import { query } from './db.js';
import { log } from './logger.js';
import emailQueue from './queue.js';
import { convertTextToHtml } from './textUtils.js';

const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 5;
const EMAILS_PER_HOUR = Number(process.env.EMAILS_PER_HOUR) || 30;

// Подсчёт количества писем, отправленных за последний час
async function countSentEmailsLastHour() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sentCount = await query(
    `SELECT COUNT(*) as count FROM emails WHERE status = 'sent' AND sent_at >= ?`,
    [oneHourAgo]
  );
  return sentCount[0]?.count || 0;
}

function printSummary(title, results) {
  if (!results.length) {
    console.log(`${title}: Нет писем.`);
    return;
  }
  console.log(`\n=== ${title} ===`);
  console.table(results);
}

async function enqueueEmail(email) {
  const html = convertTextToHtml(email.text);
  const attachments = [];

  if (email.file && email.file.trim() !== '') {
    const absoluteFilePath = path.resolve(process.cwd(), email.file);
    const filename = path.basename(absoluteFilePath);
    log(`Прикрепляем файл: ${absoluteFilePath} с именем ${filename}`);
    attachments.push({
      filename,
      path: absoluteFilePath,
      contentType: 'application/pdf'
    });
  }

  await emailQueue.add('sendEmail', {
    id: email.id,
    to: email.email,
    subject: email.title,
    html,
    attachments,
  }, {
    attempts: MAX_RETRIES,
    backoff: 60000,
  });
}

export async function sendPendingEmails() {
  const results = [];
  try {
    const sentCount = await countSentEmailsLastHour();
    const availableSlots = EMAILS_PER_HOUR - sentCount;
    if (availableSlots <= 0) {
      log(`Достигнут лимит отправки ${EMAILS_PER_HOUR} писем в час. Отправка отложена.`, 'WARN');
      printSummary('Итог постановки pending писем в очередь', results);
      return;
    }

    const emails = await query(`SELECT * FROM emails WHERE status = 'pending' LIMIT ${availableSlots}`);

    for (const email of emails) {
      log(`Добавление pending письма в очередь id=${email.id} (${email.email})`);
      try {
        await enqueueEmail(email);
        results.push({ id: email.id, email: email.email, status: 'queued' });
      } catch (err) {
        log(`Ошибка добавления письма id=${email.id} в очередь: ${err.message}`, 'ERROR');
        results.push({ id: email.id, email: email.email, status: 'error', error: err.message });
      }
    }
  } catch (err) {
    log(`Ошибка при получении pending писем: ${err.message}`, 'ERROR');
  }
  printSummary('Итог постановки pending писем в очередь', results);
}

export async function retryFailedEmails() {
  const results = [];
  try {
    const sentCount = await countSentEmailsLastHour();
    const availableSlots = EMAILS_PER_HOUR - sentCount;
    if (availableSlots <= 0) {
      log(`Достигнут лимит отправки ${EMAILS_PER_HOUR} писем в час. Повторная отправка отложена.`, 'WARN');
      printSummary('Итог постановки failed писем в очередь', results);
      return;
    }

    const emails = await query(
      `SELECT * FROM emails WHERE status = 'failed' AND retry_count < ? LIMIT ${availableSlots}`,
      [MAX_RETRIES]
    );

    for (const email of emails) {
      log(`Добавление failed письма в очередь id=${email.id} (${email.email}), попытка ${email.retry_count + 1}`);
      try {
        await enqueueEmail(email);
        results.push({ id: email.id, email: email.email, status: 'queued' });
      } catch (err) {
        log(`Ошибка добавления письма id=${email.id} в очередь: ${err.message}`, 'ERROR');
        results.push({ id: email.id, email: email.email, status: 'error', error: err.message });
      }
    }
  } catch (err) {
    log(`Ошибка при получении failed писем: ${err.message}`, 'ERROR');
  }
  printSummary('Итог постановки failed писем в очередь', results);
}