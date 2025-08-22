import dotenv from 'dotenv';
dotenv.config();

import { runCommand } from './commands.js';
import { setupDatabase } from './setupDatabase.js';
import { logBanner, log } from './logger.js';

async function main() {
  try {
    logBanner(); // Красочная шапка с брендом и девизом
    await setupDatabase();

    const args = process.argv.slice(2);
    if (args.length === 0) {
      log('Пожалуйста, укажите команду: import, export, send, logs', 'WARN');
      process.exit(1);
    }
    const cmd = args[0];
    const cmdArgs = args.slice(1);

    await runCommand(cmd, cmdArgs);
  } catch (err) {
    log('Fatal error: ' + err.message, 'ERROR');
    process.exit(1);
  }
}

main();
