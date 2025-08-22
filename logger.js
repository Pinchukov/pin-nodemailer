import fs from 'fs/promises';
import path from 'path';
import { formatISO } from 'date-fns';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import figures from 'figures';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация логгера
const CONFIG = {
  logDir: path.join(__dirname, 'logs'),
  logFile: 'actions.log',
  maxLogSize: 10 * 1024 * 1024, // 10МБ
  maxLogFiles: 5,
  dateFormat: 'yyyy-MM-dd HH:mm:ss',
};

// Уровни логирования с приоритетами
const LOG_LEVELS = {
  ERROR: { priority: 0, icon: figures.cross, color: chalk.bold.red, prefix: chalk.bgRed.black(' ОШИБКА ') },
  WARN: { priority: 1, icon: figures.warning, color: chalk.hex('#FFA500'), prefix: chalk.bgYellow.black('ВНИМАНИЕ') },
  INFO: { priority: 2, icon: figures.info, color: chalk.blue, prefix: chalk.bgBlue.white(' ИНФО  ') },
  SUCCESS: { priority: 3, icon: figures.tick, color: chalk.bold.green, prefix: chalk.bgGreen.black(' УСПЕХ ') },
  QUEUE: { priority: 4, icon: figures.pointer, color: chalk.cyanBright, prefix: chalk.bgCyan.black('ОЧЕРЕДЬ') },
};

/**
 * Класс логгера для Pin Nodemailer
 */
class PinLogger {
  constructor(options = {}) {
    this.config = { ...CONFIG, ...options };
    this.logFilePath = path.join(this.config.logDir, this.config.logFile);
    this.minLevel = options.minLevel || 'INFO';
    this.initialized = false;
  }

  /**
   * Инициализация логгера (создание директорий и т.д.)
   */
  async init() {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('Ошибка инициализации логгера:', error.message);
      throw error;
    }
  }

  /**
   * Получить ASCII-арт баннер
   */
  static getBanner() {
    const art = `
${chalk.magentaBright(`
 █████╗  ██╗███╗   ██╗    ███╗   ██╗ ██████╗ ██████╗ ███████╗███╗   ███╗ █████╗ ██╗██╗     ███████╗██████╗ 
██╔══██╗██║████╗  ██║    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝████╗ ████║██╔══██╗██║██║     ██╔════╝██╔══██╗
██████╔╝██║██╔██╗ ██║    ██╔██╗ ██║██║   ██║██║  ██║█████╗  ██╔████╔██║███████║██║██║     █████╗  ██████╔╝
██╔═══╝ ██║██║╚██╗██║    ██║╚██╗██║██║   ██║██║  ██║██╔══╝  ██║╚██╔╝██║██╔══██║██║██║     ██╔══╝  ██╔══██╗
██║     ██║██║ ╚████║    ██║ ╚████║╚██████╔╝██████╔╝███████╗██║ ╚═╝ ██║██║  ██║██║███████╗███████╗██║  ██║
╚═╝     ╚═╝╚═╝  ╚═══╝    ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
`)}
${chalk.cyanBright(figures.star.repeat(15))}  ${chalk.cyan.bold('Почта с душой!')}  ${chalk.cyanBright(figures.star.repeat(15))}
`;
    return art;
  }

  /**
   * Показать баннер
   */
  static logBanner() {
    console.log(chalk.bgMagenta.white.bold('■'.repeat(80)));
    console.log(PinLogger.getBanner());
    console.log(chalk.bgMagenta.white.bold('■'.repeat(80)));
  }

  /**
   * Проверить, должно ли сообщение быть залогировано
   */
  shouldLog(level) {
    const levelPriority = LOG_LEVELS[level]?.priority ?? LOG_LEVELS.INFO.priority;
    const minPriority = LOG_LEVELS[this.minLevel]?.priority ?? LOG_LEVELS.INFO.priority;
    return levelPriority <= minPriority;
  }

  /**
   * Валидация параметров логирования
   */
  validateLogParams(message, level) {
    if (typeof message !== 'string') {
      throw new TypeError('Сообщение должно быть строкой');
    }
    if (level && !LOG_LEVELS[level]) {
      throw new Error(`Неверный уровень логирования: ${level}. Доступные уровни: ${Object.keys(LOG_LEVELS).join(', ')}`);
    }
  }

  /**
   * Форматировать сообщение для консоли
   */
  formatConsoleMessage(message, level, timestamp) {
    const style = LOG_LEVELS[level];
    const time = chalk.gray(`[${timestamp}]`);
    return `${time} ${style.prefix} ${style.icon} ${style.color(message)}`;
  }

  /**
   * Форматировать сообщение для файла
   */
  formatFileMessage(message, level, timestamp) {
    return `[${timestamp}] [${level}] ${message}`;
  }

  /**
   * Ротация лог-файла при необходимости
   */
  async rotateLogIfNeeded() {
    try {
      const stats = await fs.stat(this.logFilePath);
      if (stats.size > this.config.maxLogSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // Файл еще не существует, ротация не нужна
      if (error.code !== 'ENOENT') {
        console.warn('Предупреждение: Не удалось проверить размер лог-файла:', error.message);
      }
    }
  }

  /**
   * Выполнить ротацию лог-файлов
   */
  async rotateLogs() {
    try {
      const baseName = path.parse(this.config.logFile).name;
      const extension = path.parse(this.config.logFile).ext;

      // Удалить самый старый лог-файл, если их слишком много
      const oldestLog = path.join(this.config.logDir, `${baseName}.${this.config.maxLogFiles - 1}${extension}`);
      try {
        await fs.unlink(oldestLog);
      } catch (error) {
        // Файл может не существовать, это нормально
      }

      // Сдвинуть существующие лог-файлы
      for (let i = this.config.maxLogFiles - 2; i >= 1; i--) {
        const currentFile = path.join(this.config.logDir, `${baseName}.${i}${extension}`);
        const nextFile = path.join(this.config.logDir, `${baseName}.${i + 1}${extension}`);
        
        try {
          await fs.rename(currentFile, nextFile);
        } catch (error) {
          // Файл может не существовать, продолжаем
        }
      }

      // Переместить текущий лог в .1
      const firstRotated = path.join(this.config.logDir, `${baseName}.1${extension}`);
      try {
        await fs.rename(this.logFilePath, firstRotated);
      } catch (error) {
        console.warn('Предупреждение: Не удалось ротировать текущий лог-файл:', error.message);
      }
    } catch (error) {
      console.error('Ошибка при ротации логов:', error.message);
    }
  }

  /**
   * Записать запись в файл
   */
  async writeToFile(message, level, timestamp) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await this.rotateLogIfNeeded();
      const logLine = this.formatFileMessage(message, level, timestamp) + '\n';
      await fs.appendFile(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error('Ошибка записи в лог-файл:', error.message);
    }
  }

  /**
   * Основной метод логирования
   */
  async log(message, level = 'INFO', options = {}) {
    this.validateLogParams(message, level);

    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = formatISO(new Date());
    
    // Вывод в консоль (всегда синхронный для немедленной обратной связи)
    if (!options.fileOnly) {
      console.log(this.formatConsoleMessage(message, level, timestamp));
    }

    // Запись в файл (асинхронная)
    if (!options.consoleOnly) {
      await this.writeToFile(message, level, timestamp);
    }
  }

  /**
   * Удобные методы для разных уровней логирования
   */
  async error(message, options = {}) {
    return this.log(message, 'ERROR', options);
  }

  async warn(message, options = {}) {
    return this.log(message, 'WARN', options);
  }

  async info(message, options = {}) {
    return this.log(message, 'INFO', options);
  }

  async success(message, options = {}) {
    return this.log(message, 'SUCCESS', options);
  }

  async queue(message, options = {}) {
    return this.log(message, 'QUEUE', options);
  }

  /**
   * Фильтровать логи по критериям
   */
  async filterLogs({ dateFrom, dateTo, level, limit = 1000 } = {}) {
    try {
      const content = await fs.readFile(this.logFilePath, 'utf8');
      const lines = content.split('\n').filter(Boolean);

      let filtered = lines.filter(line => {
        // Парсинг времени
        const timestampMatch = line.match(/^\[(.*?)\]/);
        if (!timestampMatch) return false;

        const timestamp = new Date(timestampMatch[1]);
        
        // Фильтрация по дате
        if (dateFrom && timestamp < dateFrom) return false;
        if (dateTo && timestamp > dateTo) return false;
        
        // Фильтрация по уровню
        if (level) {
          const levelMatch = line.match(/\[(\w+)\]/g);
          if (!levelMatch || !levelMatch[1] || !levelMatch[1].includes(level)) {
            return false;
          }
        }

        return true;
      });

      // Применить лимит
      if (limit > 0) {
        filtered = filtered.slice(-limit);
      }

      return filtered;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error('Ошибка чтения лог-файла:', error.message);
      throw error;
    }
  }

  /**
   * Получить статистику логов
   */
  async getStats() {
    try {
      const logs = await this.filterLogs();
      const stats = {
        total: logs.length,
        byLevel: {}
      };

      Object.keys(LOG_LEVELS).forEach(level => {
        stats.byLevel[level] = logs.filter(log => log.includes(`[${level}]`)).length;
      });

      return stats;
    } catch (error) {
      console.error('Ошибка получения статистики логов:', error.message);
      return null;
    }
  }

  /**
   * Очистить все логи
   */
  async clearLogs() {
    try {
      await fs.unlink(this.logFilePath);
      console.log('Логи успешно очищены');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Ошибка очистки логов:', error.message);
        throw error;
      }
    }
  }
}

// Создать экземпляр логгера по умолчанию
const logger = new PinLogger();

// Экспорт класса и экземпляра по умолчанию
export { PinLogger };
export default logger;

// Экспорт для обратной совместимости
export const logBanner = PinLogger.logBanner;
export const log = (message, level) => logger.log(message, level);
export const filterLogs = (options) => logger.filterLogs(options);