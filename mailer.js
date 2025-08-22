import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { log } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail({ to, subject, html, attachments }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    log(`Письмо отправлено на ${to}: ID сообщения ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    log(`Ошибка при отправке письма на ${to}: ${error.message}`, 'ERROR');
    return { success: false, error };
  }
}

export async function notifyAdmin(subject, html) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminImagePath = path.resolve(__dirname, process.env.ADMIN_IMAGE);
  const attachments = [];

  if (adminImagePath && fs.existsSync(adminImagePath)) {
    log(`Файл изображения найден: ${adminImagePath}`, 'INFO');
    attachments.push({
      filename: path.basename(adminImagePath),
      path: adminImagePath,
      cid: 'adminimg',
    });
  } else {
    log(`Файл изображения НЕ найден по пути: ${adminImagePath}`, 'WARN');
  }

  if (attachments.length > 0) {
    html = `<img src="cid:adminimg" alt="Изображение отправителя" /><br />${html}`;
  }

  await sendMail({ to: adminEmail, subject, html, attachments });
}
