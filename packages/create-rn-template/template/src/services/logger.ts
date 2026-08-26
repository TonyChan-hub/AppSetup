import { getRecentLogs, insertLog, type LogLevel } from '@/services/database';

export type LogOptions = {
  category: string;
  event: string;
  message?: string;
  payload?: unknown;
};

function writeLog(level: LogLevel, options: LogOptions) {
  insertLog({
    level,
    category: options.category,
    event: options.event,
    message: options.message,
    payload: options.payload,
  });

  if (__DEV__) {
    const method =
      level === 'warn' ? 'warn' : level === 'error' ? 'error' : level === 'debug' ? 'debug' : 'log';
    (console as Console)[method](
      `[Logger ${level}] [${options.category}] ${options.event}`,
      options.message ?? '',
      options.payload ?? '',
    );
  }
}

export const Logger = {
  debug(options: LogOptions) {
    if (__DEV__) {
      writeLog('debug', options);
    }
  },
  info(options: LogOptions) {
    writeLog('info', options);
  },
  warn(options: LogOptions) {
    writeLog('warn', options);
  },
  error(options: LogOptions) {
    writeLog('error', options);
  },
  appError(error: unknown, context?: string) {
    const payload = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
    writeLog('error', {
      category: 'error',
      event: 'app_error',
      message: context,
      payload,
    });
  },
  getRecentLogs,
};
