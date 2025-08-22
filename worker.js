import emailQueue from './queue.js';
import { sendMail } from './mailer.js';
import { query } from './db.js';
import { log, logBanner } from './logger.js';

// Показываем фирменную шапку при запуске воркера
logBanner();

emailQueue.process('sendEmail', async (job) => {
  const { id, to, subject, html, attachments } = job.data;
  log(`Начинаю обработку письма id=${id} для ${to}`, 'QUEUE');
  try {
    await query(`UPDATE emails SET status='sending' WHERE id=?`, [id]);
    const result = await sendMail({ to, subject, html, attachments });
    if (!result.success) throw new Error(result.error.message);
    await query(`UPDATE emails SET status='sent', sent_at=NOW() WHERE id=?`, [id]);
    log(`Письмо id=${id} успешно отправлено`, 'SUCCESS');
  } catch (error) {
    await query(
      `UPDATE emails SET status='failed', retry_count=retry_count+1, last_error=? WHERE id=?`,
      [error.message, id]
    );
    log(`Ошибка отправки письма id=${id}: ${error.message}`, 'ERROR');
    throw error;
  }
});

emailQueue.on('completed', (job) => {
  log(`Задача jobId=${job.id} успешно выполнена`, 'SUCCESS');
});
emailQueue.on('failed', (job, err) => {
  log(`Задача jobId=${job.id} завершилась с ошибкой: ${err.message}`, 'ERROR');
});
emailQueue.on('error', (error) => {
  log(`Ошибка очереди: ${error.message}`, 'ERROR');
});

log('Worker для очереди emailQueue запущен и ждет задач...', 'QUEUE');
