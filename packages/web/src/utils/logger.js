/**
 * Logger Utility for Analysis Engine
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(logFilePath = '.aios/logs/analysis-engine.log', minLevel = 'INFO') {
    this.logFilePath = logFilePath;
    this.minLevel = LOG_LEVELS[minLevel] || LOG_LEVELS.INFO;
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const dataStr = Object.keys(data).length > 0 ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  writeLog(level, message, data = {}) {
    const formatted = this.formatMessage(level, message, data);

    // Console output
    if (LOG_LEVELS[level] >= this.minLevel) {
      const colorCodes = {
        DEBUG: '\x1b[36m',   // Cyan
        INFO: '\x1b[32m',    // Green
        WARN: '\x1b[33m',    // Yellow
        ERROR: '\x1b[31m',   // Red
      };
      const resetCode = '\x1b[0m';
      console.log(`${colorCodes[level] || ''}${formatted}${resetCode}`);
    }

    // File output
    try {
      fs.appendFileSync(this.logFilePath, formatted + '\n');
    } catch (err) {
      // Fail silently if file write fails
      console.error('Failed to write to log file:', err.message);
    }
  }

  debug(message, data = {}) {
    this.writeLog('DEBUG', message, data);
  }

  info(message, data = {}) {
    this.writeLog('INFO', message, data);
  }

  warn(message, data = {}) {
    this.writeLog('WARN', message, data);
  }

  error(message, data = {}) {
    this.writeLog('ERROR', message, data);
  }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;
