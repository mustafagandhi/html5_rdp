export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isProduction = process.env.NODE_ENV === 'production';

  constructor(private category: string) {
    this.setupGlobalErrorHandling();
  }

  static getInstance(category: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(category);
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  fatal(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: this.category,
      message,
      data,
      error
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.outputLog(entry);
  }

  private outputLog(entry: LogEntry): void {
    const levelStr = LogLevel[entry.level];
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${levelStr}] [${entry.category}]`;

    if (this.isProduction && entry.level === LogLevel.DEBUG) {
      return;
    }

    const logData = {
      ...entry,
      timestamp: entry.timestamp,
      level: levelStr
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.error || entry.data || '');
        break;
      case LogLevel.FATAL:
        console.error(prefix, 'FATAL:', entry.message, entry.error || entry.data || '');
        break;
    }

    // Send to remote logging service in production
    if (this.isProduction && entry.level >= LogLevel.ERROR) {
      this.sendToRemoteLogging(logData);
    }
  }

  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.error('Unhandled error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', event.reason);
    });
  }

  private async sendToRemoteLogging(logData: any): Promise<void> {
    try {
      // In a real implementation, this would send to a logging service
      // For now, we'll just store it locally
      const remoteLogs = JSON.parse(localStorage.getItem('remoteLogs') || '[]');
      remoteLogs.push(logData);
      localStorage.setItem('remoteLogs', JSON.stringify(remoteLogs.slice(-100)));
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Performance logging
  time(label: string): void {
    console.time(`[${this.category}] ${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(`[${this.category}] ${label}`);
  }

  // Group logging
  group(label: string): void {
    console.group(`[${this.category}] ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
  }
} 